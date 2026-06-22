import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createReadStream, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Types, type Model } from 'mongoose';

import { MovieUploadStatus } from '@/movies/movie.schema';
import { MovieRepository } from '@/movies/movie.repository';
import {
  hlsContentType,
  listFilesRecursive,
  probeVideo,
  selectVariants,
  transcodeToHls
} from '@/movies/hls/ffmpeg-hls';
import {
  REALTIME_BROADCAST_PORT,
  type RealtimeBroadcastPort
} from '@/realtime/realtime.broadcast-port';
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
    try {
      this.logger.log(`Processing movie ${movieId}: downloading original…`);
      const inputPath = path.join(workDir, `original${path.extname(originalKey) || '.mp4'}`);
      await this.downloadOriginal(originalKey, inputPath);

      const probe = await probeVideo(inputPath);
      const variants = selectVariants(probe.height);
      const hlsDir = path.join(workDir, 'hls');
      await fs.mkdir(hlsDir, { recursive: true });
      this.logger.log(
        `Movie ${movieId}: source ${String(probe.width)}x${String(probe.height)}, ` +
          `transcoding ${variants.map((v) => `${String(v.height)}p`).join('/')}…`
      );
      await transcodeToHls(inputPath, hlsDir, variants, probe.hasAudio);

      const hlsPrefix = `videos/${movieId}/hls`;
      this.logger.log(`Movie ${movieId}: transcode done, uploading HLS to R2…`);
      await this.uploadHlsDir(hlsDir, hlsPrefix);

      const playbackUrl = this.buildPlaybackUrl(movieId);
      const qualities = variants.map((variant) => variant.height).sort((a, b) => b - a);

      await this.movies.update(movieId, ownerId, {
        upload_status: MovieUploadStatus.READY,
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
      this.broadcast.emitVideoReady(roomId, movieId, playbackUrl, qualities);
      this.broadcast.emitRoomMovieUpdated(roomId, movieId, doc.name);
      const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
      this.logger.log(`Movie ${movieId} ready (${qualities.join('/')}p) in ${String(elapsedSec)}s`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video processing failed';
      this.logger.error(`Processing failed for movie ${movieId}: ${message}`);
      await this.markFailed(movieId, ownerId, roomId, message);
    } finally {
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

  private async uploadHlsDir(hlsDir: string, prefix: string): Promise<void> {
    const files = await listFilesRecursive(hlsDir);
    for (const file of files) {
      const relative = path.relative(hlsDir, file).split(path.sep).join('/');
      const stats = await fs.stat(file);
      await this.storage.putObject({
        key: `${prefix}/${relative}`,
        body: createReadStream(file),
        contentType: hlsContentType(file),
        contentLength: stats.size
      });
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
      error_message: message.slice(0, 500)
    });
    await this.roomModel
      .findByIdAndUpdate(roomId, { $set: { pending_movie: null } })
      .catch(() => undefined);
    this.broadcast.emitVideoFailed(roomId, movieId, message.slice(0, 500));
  }
}
