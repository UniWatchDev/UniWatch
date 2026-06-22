import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { promises as fs } from 'node:fs';
import { PassThrough } from 'node:stream';
import type { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { extensionForMovieMime, resolveMovieMime } from '@repo/consts/movies';
import type { MovieResponse } from '@repo/schemas/movies';

import {
  HLS_SEGMENT_SECONDS,
  STANDARD_HLS_VARIANTS,
  transcodeToHlsFromStream
} from '@/movies/hls/ffmpeg-hls';
import { HlsSegmentPublisher } from '@/movies/hls/hls-segment-publisher';
import { MovieRepository } from '@/movies/movie.repository';
import { MovieUploadStatus, type MovieDocument } from '@/movies/movie.schema';
import {
  REALTIME_BROADCAST_PORT,
  type RealtimeBroadcastPort
} from '@/realtime/realtime.broadcast-port';
import { RoomStateService } from '@/realtime/services/room-state.service';
import { RoomRecord, type RoomDocument } from '@/rooms/room.schema';
import { STORAGE_SERVICE, type StorageService } from '@/storage/storage.interface';
import type { Env } from '@/utils/env.validation';

type LiveUploadInput = {
  movieId: string;
  ownerId: string;
  roomId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  body: Readable;
};

function toResponse(doc: MovieDocument): MovieResponse {
  const id = doc._id.toString();
  const hasFile =
    doc.storage_key != null &&
    doc.storage_key.length > 0 &&
    doc.file_deleted_at == null &&
    doc.upload_status === MovieUploadStatus.READY;

  return {
    id,
    name: doc.name,
    movie_actors: doc.movie_actors,
    director: doc.director,
    rating: doc.rating,
    length: doc.length,
    genre: doc.genre,
    language: doc.language,
    description: doc.description ?? null,
    upload_status: doc.upload_status,
    size_bytes: doc.size_bytes ?? null,
    mime_type: doc.mime_type ?? null,
    duration_seconds: doc.duration_seconds ?? null,
    file_uploaded_at: doc.file_uploaded_at?.toISOString() ?? null,
    thumbnail_url:
      doc.thumbnail_key != null && doc.file_deleted_at == null
        ? `/api/movies/${id}/thumbnail`
        : null,
    has_file: hasFile,
    hls_prefix: doc.hls_prefix ?? null,
    playback_url: doc.file_deleted_at == null ? (doc.playback_url ?? null) : null,
    playback_partial: doc.playback_partial,
    available_qualities: doc.available_qualities,
    error_message: doc.error_message ?? null,
    file_deleted_at: doc.file_deleted_at?.toISOString() ?? null,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString()
  };
}

@Injectable()
export class MovieIngestService {
  private readonly logger = new Logger(MovieIngestService.name);

  constructor(
    private readonly movies: MovieRepository,
    private readonly config: ConfigService<Env, true>,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @Inject(REALTIME_BROADCAST_PORT) private readonly broadcast: RealtimeBroadcastPort,
    private readonly roomState: RoomStateService,
    @InjectModel(RoomRecord.name) private readonly roomModel: Model<RoomDocument>
  ) {}

  async ingestUpload(input: LiveUploadInput): Promise<MovieResponse> {
    const doc = await this.movies.findOwnedById(input.movieId, input.ownerId);
    if (!doc) {
      return await this.assertExistsAndOwnedOrThrow(input.movieId);
    }

    await this.assertRoomHost(input.roomId, input.ownerId);

    const resolvedMime = resolveMovieMime(input.fileType, input.fileName);
    if (resolvedMime === null) {
      throw new BadRequestException('Only MP4, MOV, or WebM video files are supported.');
    }
    if (input.fileSize <= 0) {
      throw new BadRequestException('File size must be positive');
    }

    const storageKey = `uploads/${input.movieId}/original${extensionForMovieMime(resolvedMime)}`;
    const workDir = await fs.mkdtemp(path.join(tmpdir(), 'uniwatch-live-ingest-'));
    const hlsDir = path.join(workDir, 'hls');
    await fs.mkdir(hlsDir, { recursive: true });

    const storageBody = new PassThrough();
    const ffmpegBody = new PassThrough();
    const uploadTee = new PassThrough();
    const minSegmentsBeforePlayable = this.config.get('HLS_MIN_SEGMENTS_BEFORE_PLAYABLE', { infer: true });
    const requestBody = input.body;
    const uploadPromise = this.storage.putObject({
      key: storageKey,
      body: storageBody,
      contentType: resolvedMime,
      contentLength: input.fileSize
    }).catch((error: unknown) => {
      uploadTee.destroy();
      storageBody.destroy();
      ffmpegBody.destroy(error instanceof Error ? error : new Error('Upload to R2 failed'));
      requestBody.destroy(error instanceof Error ? error : new Error('Upload to R2 failed'));
      throw error;
    });

    await this.movies.update(input.movieId, input.ownerId, {
      upload_status: MovieUploadStatus.UPLOADING,
      storage_key: storageKey,
      mime_type: resolvedMime,
      size_bytes: input.fileSize,
      playback_partial: false,
      error_message: null
    });
    await this.roomModel.findByIdAndUpdate(input.roomId, {
      $set: { pending_movie: new Types.ObjectId(input.movieId) }
    });
    this.broadcast.emitVideoProcessing(input.roomId, input.movieId);

    const uploadProgress = { bytes: 0, lastPercent: -1, lastEmittedAt: 0 };
    const publishState = { partialPublished: false };
    let partialCheckRunning = false;
    let partialCheckQueued = false;
    let partialDurationSec = 0;

    const emitUploadProgress = (): void => {
      const rawPercent = Math.round((uploadProgress.bytes / input.fileSize) * 100);
      const percent = Math.min(99, Math.max(0, rawPercent));
      const now = Date.now();
      if (percent <= uploadProgress.lastPercent && now - uploadProgress.lastEmittedAt < 1000) {
        return;
      }
      uploadProgress.lastPercent = percent;
      uploadProgress.lastEmittedAt = now;
      this.broadcast.emitVideoProgress(input.roomId, input.movieId, percent);
    };

    requestBody.on('data', (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      uploadProgress.bytes += buffer.length;
      emitUploadProgress();
    });
    requestBody.pipe(uploadTee);
    uploadTee.pipe(storageBody);
    uploadTee.pipe(ffmpegBody);
    requestBody.once('error', (error: unknown) => {
      uploadTee.destroy(error instanceof Error ? error : new Error('Upload stream failed'));
      storageBody.destroy(error instanceof Error ? error : new Error('Upload stream failed'));
      ffmpegBody.destroy(error instanceof Error ? error : new Error('Upload stream failed'));
    });
    requestBody.once('end', () => {
      emitUploadProgress();
    });

    const variants = [...STANDARD_HLS_VARIANTS];
    const qualities = variants.map((variant) => variant.height).sort((a, b) => b - a);
    const playbackUrl = this.buildPlaybackUrl(input.movieId);
    const hlsPrefix = `videos/${input.movieId}/hls`;
    const segmentPublisher = new HlsSegmentPublisher({
      storage: this.storage,
      prefix: hlsPrefix,
      debounceMs: this.config.get('HLS_PUBLISH_DEBOUNCE_MS', { infer: true })
    });

    const maybePublishPartial = async (): Promise<void> => {
      if (partialCheckRunning) {
        partialCheckQueued = true;
        return;
      }

      partialCheckRunning = true;
      try {
        const lowestVariant = variants[variants.length - 1] ?? variants[0];
        if (lowestVariant === undefined) {
          return;
        }

        const segmentCount = await this.countSegments(path.join(hlsDir, `${String(lowestVariant.height)}p`));
        if (segmentCount >= minSegmentsBeforePlayable) {
          partialDurationSec = segmentCount * HLS_SEGMENT_SECONDS;
          this.roomState.setPublishedDuration(input.roomId, partialDurationSec);

          if (!publishState.partialPublished) {
            await this.movies.update(input.movieId, input.ownerId, {
              upload_status: MovieUploadStatus.PROCESSING,
              hls_prefix: hlsPrefix,
              playback_url: playbackUrl,
              playback_partial: true,
              available_qualities: qualities,
              duration_seconds: null,
              error_message: null,
              file_uploaded_at: new Date(),
              file_deleted_at: null,
              file_purge_at: null
            });
            await this.promoteRoomMovie(input.roomId, input.movieId, doc.name);
            this.broadcast.emitRoomMovieUpdated(input.roomId, input.movieId, doc.name);
            this.broadcast.emitVideoPlayable(
              input.roomId,
              input.movieId,
              playbackUrl,
              qualities,
              partialDurationSec
            );
            publishState.partialPublished = true;
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
    const partialTimer = setInterval(() => {
      void maybePublishPartial().catch((error: unknown) => {
        this.logger.warn(
          `Partial publish scan failed for movie ${input.movieId}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`
        );
      });
    }, Math.max(200, this.config.get('HLS_PUBLISH_DEBOUNCE_MS', { infer: true })));

    const transcodePromise = transcodeToHlsFromStream(ffmpegBody, hlsDir, variants, false).catch(
      (error: unknown) => {
        uploadTee.destroy();
        storageBody.destroy();
        ffmpegBody.destroy();
        requestBody.destroy(error instanceof Error ? error : new Error('Transcode failed'));
        throw error;
      }
    );

    this.logger.log(`Live ingest for movie ${input.movieId}: streaming directly to R2 and HLS ladders`);

    try {
      await Promise.all([uploadPromise, transcodePromise]);
      clearInterval(partialTimer);
      await segmentPublisher.stop();

      await this.movies.update(input.movieId, input.ownerId, {
        upload_status: MovieUploadStatus.READY,
        playback_partial: false,
        hls_prefix: hlsPrefix,
        playback_url: playbackUrl,
        available_qualities: qualities,
        duration_seconds: null,
        error_message: null,
        file_uploaded_at: new Date(),
        file_deleted_at: null,
        file_purge_at: null
      });

      if (!publishState.partialPublished) {
        await this.promoteRoomMovie(input.roomId, input.movieId, doc.name);
        this.broadcast.emitRoomMovieUpdated(input.roomId, input.movieId, doc.name);
      }

      this.roomState.setPublishedDuration(input.roomId, null);
      this.broadcast.emitVideoProgress(input.roomId, input.movieId, 100);
      this.broadcast.emitVideoReady(input.roomId, input.movieId, playbackUrl, qualities);
      return toResponse((await this.movies.findById(input.movieId)) ?? doc);
    } catch (error) {
      clearInterval(partialTimer);
      uploadTee.destroy();
      storageBody.destroy();
      ffmpegBody.destroy();
      requestBody.destroy(error instanceof Error ? error : new Error('Live upload failed'));
      const message = error instanceof Error ? error.message : 'Live upload failed';
      await this.markFailed(input.movieId, input.ownerId, input.roomId, message);
      throw error;
    } finally {
      clearInterval(partialTimer);
      uploadTee.destroy();
      await segmentPublisher.stop().catch(() => undefined);
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
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
    this.roomState.setPublishedDuration(roomId, null);
    this.broadcast.emitVideoFailed(roomId, movieId, message.slice(0, 500));
  }

  private async assertRoomHost(roomId: string, userId: string): Promise<void> {
    const room = await this.roomModel.findById(roomId);
    if (!room || room.deleted_at != null) {
      throw new NotFoundException(`Room "${roomId}" not found`);
    }
    if (room.creator.toString() !== userId) {
      throw new ForbiddenException('Only the room host can change the video');
    }
  }

  private async assertExistsAndOwnedOrThrow(id: string): Promise<never> {
    const raw = await this.movies.findById(id);
    if (raw && !raw.deleted_at) {
      throw new ForbiddenException('You do not have access to this movie');
    }
    throw new NotFoundException(`Movie "${id}" not found`);
  }
}
