import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Types, type Model } from 'mongoose';

import { MovieUploadStatus } from '@/movies/movie.schema';
import { MovieRepository } from '@/movies/movie.repository';
import {
  HLS_SEGMENT_SECONDS,
  probeVideo,
  selectVariants,
  transcodeToHls
} from '@/movies/hls/ffmpeg-hls';
import { HlsSegmentPublisher } from '@/movies/hls/hls-segment-publisher';
import {
  REALTIME_BROADCAST_PORT,
  type RealtimeBroadcastPort
} from '@/realtime/realtime.broadcast-port';
import { RoomStateService } from '@/realtime/services/room-state.service';
import { RoomRecord, type RoomDocument } from '@/rooms/room.schema';
import { STORAGE_SERVICE, type StorageService } from '@/storage/storage.interface';
import type { Env } from '@/utils/env.validation';

export interface VideoProcessingJob {
  movieId: string;
  ownerId: string;
  roomId: string;
}

/**
 * Minimal in-process job runner for HLS transcoding. Jobs run one at a time so
 * a single box is never overwhelmed by parallel ffmpeg processes.
 *
 * TODO(production): replace this with BullMQ + Redis and a separate worker
 * process. The in-memory queue is lost on restart and does not retry.
 */
@Injectable()
export class VideoProcessingService {
  private readonly logger = new Logger(VideoProcessingService.name);
  private readonly queue: VideoProcessingJob[] = [];
  private draining = false;

  constructor(
    private readonly movies: MovieRepository,
    private readonly config: ConfigService<Env, true>,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @Inject(REALTIME_BROADCAST_PORT) private readonly broadcast: RealtimeBroadcastPort,
    private readonly roomState: RoomStateService,
    @InjectModel(RoomRecord.name) private readonly roomModel: Model<RoomDocument>
  ) {}

  /** Queue a job and return immediately; processing happens in the background. */
  enqueue(job: VideoProcessingJob): void {
    this.queue.push(job);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      let job = this.queue.shift();
      while (job !== undefined) {
        await this.runJob(job);
        job = this.queue.shift();
      }
    } finally {
      this.draining = false;
    }
  }

  private async runJob(job: VideoProcessingJob): Promise<void> {
    const { movieId, ownerId, roomId } = job;
    const doc = await this.movies.findById(movieId);
    if (!doc || doc.deleted_at != null) {
      this.logger.warn(`Skipping processing for missing movie ${movieId}`);
      return;
    }
    const originalKey = doc.storage_key;
    if (originalKey == null) {
      await this.markFailed(movieId, ownerId, roomId, 'Original upload is missing');
      return;
    }

    const startedAt = Date.now();
    const workDir = await fs.mkdtemp(path.join(tmpdir(), 'uniwatch-hls-'));
    let publisher: HlsSegmentPublisher | null = null;
    let partialCheckTimer: ReturnType<typeof setInterval> | undefined;
    try {
      this.logger.log(`Processing movie ${movieId}: downloading original…`);
      const inputPath = path.join(workDir, `original${path.extname(originalKey) || '.mp4'}`);
      await this.downloadOriginal(originalKey, inputPath);

      const probe = await probeVideo(inputPath);
      const variants = selectVariants(probe.height);
      const hlsDir = path.join(workDir, 'hls');
      await fs.mkdir(hlsDir, { recursive: true });
      await Promise.all(
        variants.map((variant) => fs.mkdir(path.join(hlsDir, `${String(variant.height)}p`), { recursive: true }))
      );
      const lowestVariant = variants[variants.length - 1] ?? variants[0];
      const hlsPrefix = `videos/${movieId}/hls`;
      const playbackUrl = this.buildPlaybackUrl(movieId);
      const qualities = variants.map((variant) => variant.height).sort((a, b) => b - a);
      const segmentPublisher = new HlsSegmentPublisher({
        storage: this.storage,
        prefix: hlsPrefix,
        debounceMs: this.config.get('HLS_PUBLISH_DEBOUNCE_MS', { infer: true })
      });
      publisher = segmentPublisher;
      const minSegmentsBeforePlayable = this.config.get('HLS_MIN_SEGMENTS_BEFORE_PLAYABLE', {
        infer: true
      });
      let partialPublished = false;
      let partialCheckRunning = false;
      let partialCheckQueued = false;

      const publishPartialMilestone = async (publishedSegments: number): Promise<void> => {
        if (partialPublished) {
          return;
        }
        partialPublished = true;
        const publishedDurationSec = Math.max(0, publishedSegments * HLS_SEGMENT_SECONDS);
        await this.movies.update(movieId, ownerId, {
          upload_status: MovieUploadStatus.PROCESSING,
          hls_prefix: hlsPrefix,
          playback_url: playbackUrl,
          playback_partial: true,
          available_qualities: qualities,
          duration_seconds: probe.durationSec,
          error_message: null,
          file_uploaded_at: new Date(),
          file_deleted_at: null,
          file_purge_at: null
        });
        await this.promoteRoomMovie(roomId, movieId, doc.name);
        this.broadcast.emitRoomMovieUpdated(roomId, movieId, doc.name);
        this.broadcast.emitVideoPlayable(roomId, movieId, playbackUrl, qualities, publishedDurationSec);
      };

      const maybePublishPartial = async (): Promise<void> => {
        if (lowestVariant === undefined) {
          return;
        }
        if (partialCheckRunning) {
          partialCheckQueued = true;
          return;
        }
        partialCheckRunning = true;
        try {
          const segmentCount = await this.countSegments(path.join(hlsDir, `${String(lowestVariant.height)}p`));
          if (segmentCount >= minSegmentsBeforePlayable) {
            this.roomState.setPublishedDuration(roomId, segmentCount * HLS_SEGMENT_SECONDS);
            if (!partialPublished) {
              await segmentPublisher.flush();
              await publishPartialMilestone(segmentCount);
            }
          }
        } finally {
          partialCheckRunning = false;
          if (partialCheckQueued) {
            partialCheckQueued = false;
            await maybePublishPartial();
          }
        }
      };

      segmentPublisher.start(hlsDir, variants.map((variant) => variant.height));
      partialCheckTimer = setInterval(() => {
        void maybePublishPartial();
      }, 1000);

      this.logger.log(
        `Movie ${movieId}: source ${String(probe.width)}x${String(probe.height)}, ` +
          `transcoding ${variants.map((v) => `${String(v.height)}p`).join('/')}…`
      );

      let lastProgressAt = 0;
      let lastProgressPercent = -1;
      const emitTranscodeProgress = (seconds: number): void => {
        if (probe.durationSec === null || probe.durationSec <= 0) return;
        const rawPercent = (seconds / probe.durationSec) * 100;
        const percent = Math.min(99, Math.max(0, Math.round(rawPercent)));
        const now = Date.now();
        if (percent <= lastProgressPercent && now - lastProgressAt < 1000) return;
        if (percent - lastProgressPercent < 2 && now - lastProgressAt < 1000) return;
        lastProgressPercent = percent;
        lastProgressAt = now;
        this.broadcast.emitVideoProgress(roomId, movieId, percent);
      };

      this.broadcast.emitVideoProgress(roomId, movieId, 0);
      await transcodeToHls(inputPath, hlsDir, variants, probe.hasAudio, {
        onProgress: emitTranscodeProgress
      });

      await maybePublishPartial();
      await segmentPublisher.flush();
      clearInterval(partialCheckTimer);

      this.logger.log(`Movie ${movieId}: transcode done, finalizing HLS publish…`);

      await this.movies.update(movieId, ownerId, {
        upload_status: MovieUploadStatus.READY,
        playback_partial: false,
        hls_prefix: hlsPrefix,
        playback_url: playbackUrl,
        available_qualities: qualities,
        duration_seconds: probe.durationSec,
        error_message: null,
        file_uploaded_at: new Date(),
        file_deleted_at: null,
        file_purge_at: null
      });

      await this.promoteRoomMovie(roomId, movieId, doc.name);
      this.broadcast.emitRoomMovieUpdated(roomId, movieId, doc.name);
      this.broadcast.emitVideoProgress(roomId, movieId, 100);
      this.broadcast.emitVideoReady(roomId, movieId, playbackUrl, qualities);
      const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
      this.logger.log(`Movie ${movieId} ready (${qualities.join('/')}p) in ${String(elapsedSec)}s`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video processing failed';
      this.logger.error(`Processing failed for movie ${movieId}: ${message}`);
      await this.markFailed(movieId, ownerId, roomId, message);
    } finally {
      clearInterval(partialCheckTimer);
      if (publisher !== null) {
        await publisher.stop().catch(() => undefined);
      }
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async downloadOriginal(key: string, destPath: string): Promise<void> {
    const stored = await this.storage.getObject(key);
    if (stored === null) {
      throw new Error('Original upload could not be read from storage');
    }
    if (Buffer.isBuffer(stored.body)) {
      await fs.writeFile(destPath, stored.body);
      return;
    }
    const { createWriteStream } = await import('node:fs');
    await new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(destPath);
      const readable = stored.body as NodeJS.ReadableStream;
      readable.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
      readable.pipe(writeStream);
    });
  }

  private async countSegments(dir: string): Promise<number> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.ts')).length;
    } catch {
      return 0;
    }
  }

  private buildPlaybackUrl(movieId: string): string {
    const base = this.config.get('R2_PUBLIC_BASE_URL', { infer: true }).trim();
    if (base.length === 0) {
      throw new Error('R2_PUBLIC_BASE_URL is not configured; cannot build playback URL');
    }
    return `${base.replace(/\/+$/u, '')}/videos/${movieId}/hls/master.m3u8`;
  }

  private async promoteRoomMovie(
    roomId: string,
    movieId: string,
    movieName: string
  ): Promise<void> {
    await this.roomModel.findByIdAndUpdate(roomId, {
      $set: { movie: new Types.ObjectId(movieId), movie_name: movieName, pending_movie: null }
    });
  }

  private async markFailed(
    movieId: string,
    ownerId: string,
    roomId: string,
    message: string
  ): Promise<void> {
    await this.movies.update(movieId, ownerId, {
      upload_status: MovieUploadStatus.FAILED,
      playback_partial: false,
      error_message: message.slice(0, 500)
    });
    await this.roomModel
      .findByIdAndUpdate(roomId, { $set: { pending_movie: null } })
      .catch(() => undefined);
    this.broadcast.emitVideoFailed(roomId, movieId, message.slice(0, 500));
  }
}
