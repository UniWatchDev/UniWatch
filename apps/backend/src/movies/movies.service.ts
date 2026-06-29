import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createReadStream, promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import {
  extensionForMovieMime,
  resolveMovieMime
} from '@repo/consts/movies';
import type {
  CreateMovieInput,
  MovieResponse,
  MovieStreamResponse,
  UpdateMovieInput
} from '@repo/schemas/movies';
import type { CreateCatalogMovieInput, UpdateCatalogMovieInput, UploadCatalogMovieBody } from '@repo/schemas/admin';

import { buildMovieThumbnailSvg } from '@/storage/movie-thumbnail.util';
import { STORAGE_SERVICE, type StorageService, type StoredObject } from '@/storage/storage.interface';
import { MovieUploadStatus, type MovieDocument } from '@/movies/movie.schema';
import { MovieRepository } from '@/movies/movie.repository';
import { RoomRecord, type RoomDocument } from '@/rooms/room.schema';
import type { Env } from '@/utils/env.validation';
import { isDuplicateKeyError } from '@/utils/is-duplicate-key-error';

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
    file_deleted_at: doc.file_deleted_at?.toISOString() ?? null,
    in_catalog: doc.in_catalog,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString()
  };
}

@Injectable()
export class MoviesService {
  constructor(
    private readonly movies: MovieRepository,
    private readonly config: ConfigService<Env, true>,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @InjectModel(RoomRecord.name) private readonly roomModel: Model<RoomDocument>
  ) {}

  async list(ownerId: string): Promise<MovieResponse[]> {
    const docs = await this.movies.findAllForOwner(ownerId);
    return docs.map(toResponse);
  }

  async listCatalog(): Promise<MovieResponse[]> {
    const docs = await this.movies.findCatalog();
    return docs.map(toResponse);
  }

  async listCatalogAdmin(): Promise<MovieResponse[]> {
    const docs = await this.movies.findAllCatalog();
    return docs.map(toResponse);
  }

  async createCatalogEntry(
    ownerId: string,
    data: CreateCatalogMovieInput
  ): Promise<MovieResponse> {
    try {
      const doc = await this.movies.createCatalogEntry(ownerId, data);
      return toResponse(doc);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`You already have a movie named "${data.name}"`);
      }
      throw error;
    }
  }

  async updateCatalogEntry(id: string, data: UpdateCatalogMovieInput): Promise<MovieResponse> {
    const doc = await this.movies.updateCatalogEntry(id, data);
    if (doc === null) {
      throw new NotFoundException('Catalog movie not found');
    }
    return toResponse(doc);
  }

  async uploadCatalogMovie(
    ownerId: string,
    file: Express.Multer.File,
    metadata: UploadCatalogMovieBody
  ): Promise<MovieResponse> {
    const allowedMimes = this.config.get('MOVIE_ALLOWED_MIMES', { infer: true });
    const maxBytes = this.config.get('MOVIE_UPLOAD_MAX_BYTES', { infer: true });

    const resolvedMime = resolveMovieMime(file.mimetype, file.originalname);
    if (resolvedMime === null || !allowedMimes.includes(resolvedMime)) {
      throw new BadRequestException(`Only ${allowedMimes.join(', ')} files are allowed`);
    }
    if (file.size > maxBytes) {
      throw new BadRequestException(`File exceeds maximum size of ${String(maxBytes)} bytes`);
    }

    const movieId = new Types.ObjectId();
    const movieIdStr = movieId.toString();
    const storageKey = `catalog/${ownerId}/${movieIdStr}${extensionForMovieMime(resolvedMime)}`;
    const thumbnailKey = `catalog/${ownerId}/${movieIdStr}-poster.svg`;

    try {
      const stream = createReadStream(file.path);
      await this.storage.putObject({
        key: storageKey,
        body: stream,
        contentType: resolvedMime,
        contentLength: file.size
      });

      const thumbnailBody = buildMovieThumbnailSvg(metadata.name.trim());
      await this.storage.putObject({
        key: thumbnailKey,
        body: thumbnailBody,
        contentType: 'image/svg+xml',
        contentLength: thumbnailBody.length
      });

      const doc = await this.movies.createCatalogEntryWithId(movieIdStr, ownerId, {
        name: metadata.name,
        language: metadata.language,
        description: metadata.description,
        storage_key: storageKey,
        thumbnail_key: thumbnailKey,
        mime_type: resolvedMime,
        size_bytes: file.size
      });

      return toResponse(doc);
    } catch (error) {
      await this.storage.deleteObject(storageKey).catch(() => undefined);
      await this.storage.deleteObject(thumbnailKey).catch(() => undefined);
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`You already have a movie named "${metadata.name}"`);
      }
      throw error;
    } finally {
      await fs.unlink(file.path).catch(() => undefined);
    }
  }

  async get(id: string, userId: string): Promise<MovieResponse> {
    const doc = await this.findAccessibleMovieDoc(id, userId, { requireReadyFile: false });
    return toResponse(doc);
  }

  async create(ownerId: string, data: CreateMovieInput): Promise<MovieResponse> {
    try {
      const doc = await this.movies.create(ownerId, data);
      return toResponse(doc);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`You already have a movie named "${data.name}"`);
      }
      throw error;
    }
  }

  async resolveOrCreate(
    ownerId: string,
    data: CreateMovieInput
  ): Promise<{ movie: MovieResponse; created: boolean }> {
    const trimmedName = data.name.trim();
    const existing = await this.movies.findOwnedByName(ownerId, trimmedName);
    if (existing) {
      return { movie: toResponse(existing), created: false };
    }

    try {
      const doc = await this.movies.create(ownerId, { ...data, name: trimmedName });
      return { movie: toResponse(doc), created: true };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const retry = await this.movies.findOwnedByName(ownerId, trimmedName);
        if (retry) {
          return { movie: toResponse(retry), created: false };
        }
      }
      throw error;
    }
  }

  async update(
    id: string,
    ownerId: string,
    data: UpdateMovieInput
  ): Promise<MovieResponse> {
    const set: Parameters<MovieRepository['update']>[2] = {};
    if (data.name !== undefined) set.name = data.name;
    if (data.movie_actors !== undefined) set.movie_actors = data.movie_actors;
    if (data.director !== undefined) set.director = data.director;
    if (data.rating !== undefined) set.rating = data.rating;
    if (data.length !== undefined) set.length = data.length;
    if (data.genre !== undefined) set.genre = data.genre;
    if (data.language !== undefined) set.language = data.language;
    if (data.description !== undefined) set.description = data.description;
    try {
      const doc = await this.movies.update(id, ownerId, set);
      if (doc) return toResponse(doc);
      return await this.assertExistsAndOwnedOrThrow(id);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const name = data.name ?? 'this name';
        throw new ConflictException(`You already have a movie named "${name}"`);
      }
      throw error;
    }
  }

  async delete(id: string, ownerId: string): Promise<{ success: true }> {
    const doc = await this.movies.softDelete(id, ownerId);
    if (doc) return { success: true };
    return await this.assertExistsAndOwnedOrThrow(id);
  }

  async uploadFile(
    id: string,
    ownerId: string,
    file: Express.Multer.File,
    replace: boolean
  ): Promise<MovieResponse> {
    const doc = await this.movies.findOwnedById(id, ownerId);
    if (!doc) {
      return await this.assertExistsAndOwnedOrThrow(id);
    }

    const hasReadyFile =
      doc.upload_status === MovieUploadStatus.READY &&
      doc.storage_key != null &&
      doc.storage_key.length > 0 &&
      doc.file_deleted_at == null;

    if (hasReadyFile && !replace) {
      throw new BadRequestException(
        'Movie already has a file. Pass replace=true to upload a new file.'
      );
    }

    const allowedMimes = this.config.get('MOVIE_ALLOWED_MIMES', { infer: true });
    const maxBytes = this.config.get('MOVIE_UPLOAD_MAX_BYTES', { infer: true });

    const resolvedMime = resolveMovieMime(file.mimetype, file.originalname);
    if (resolvedMime === null || !allowedMimes.includes(resolvedMime)) {
      throw new BadRequestException(
        `Only ${allowedMimes.join(', ')} files are allowed`
      );
    }
    if (file.size > maxBytes) {
      throw new BadRequestException(`File exceeds maximum size of ${String(maxBytes)} bytes`);
    }

    const storageKey = `movies/${ownerId}/${id}/${randomUUID()}${extensionForMovieMime(resolvedMime)}`;
    const thumbnailKey = `movies/${ownerId}/${id}/${randomUUID()}.svg`;
    const previousStorageKey = doc.storage_key;
    const previousThumbnailKey = doc.thumbnail_key;

    try {
      const stream = createReadStream(file.path);
      await this.storage.putObject({
        key: storageKey,
        body: stream,
        contentType: resolvedMime,
        contentLength: file.size
      });

      const thumbnailBody = buildMovieThumbnailSvg(doc.name);
      await this.storage.putObject({
        key: thumbnailKey,
        body: thumbnailBody,
        contentType: 'image/svg+xml',
        contentLength: thumbnailBody.length
      });

      const updated = await this.movies.update(id, ownerId, {
        storage_key: storageKey,
        thumbnail_key: thumbnailKey,
        mime_type: resolvedMime,
        size_bytes: file.size,
        upload_status: MovieUploadStatus.READY,
        file_uploaded_at: new Date(),
        file_deleted_at: null,
        file_purge_at: null
      });
      if (!updated) {
        await this.storage.deleteObject(storageKey).catch(() => undefined);
        await this.storage.deleteObject(thumbnailKey).catch(() => undefined);
        throw new NotFoundException(`Movie "${id}" not found`);
      }

      if (previousStorageKey != null && previousStorageKey !== storageKey) {
        await this.storage.deleteObject(previousStorageKey).catch(() => undefined);
      }
      if (previousThumbnailKey != null && previousThumbnailKey !== thumbnailKey) {
        await this.storage.deleteObject(previousThumbnailKey).catch(() => undefined);
      }

      return toResponse(updated);
    } catch (error) {
      await this.movies.update(id, ownerId, { upload_status: MovieUploadStatus.FAILED });
      throw error;
    } finally {
      await fs.unlink(file.path).catch(() => undefined);
    }
  }

  async getStreamUrl(id: string, userId: string): Promise<MovieStreamResponse> {
    const doc = await this.findAccessibleMovieDoc(id, userId, { requireReadyFile: true });
    const storageKey = doc.storage_key;
    if (storageKey == null) {
      throw new NotFoundException('Movie file is not available');
    }

    const expiresIn = this.config.get('MOVIE_STREAM_URL_EXPIRES_SECONDS', {
      infer: true
    });
    const url = await this.storage.getPresignedGetUrl(storageKey, expiresIn);
    return {
      url,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
    };
  }

  async getMediaFile(
    id: string,
    userId: string,
    range?: { start: number; end: number }
  ): Promise<{ object: StoredObject; mimeType: string; totalSize: number }> {
    const doc = await this.findAccessibleMovieDoc(id, userId, { requireReadyFile: true });
    const storageKey = doc.storage_key;
    if (storageKey == null) {
      throw new NotFoundException('Movie file is not available');
    }

    const stored = await this.storage.getObject(storageKey, range);
    if (stored === null) {
      throw new NotFoundException('Movie file is not available');
    }

    return {
      object: stored,
      mimeType: doc.mime_type ?? stored.contentType,
      totalSize: doc.size_bytes ?? stored.contentLength
    };
  }

  async getThumbnailUrl(id: string, userId: string): Promise<MovieStreamResponse> {
    const doc = await this.movies.findById(id);
    if (!doc || doc.deleted_at || doc.thumbnail_key == null || doc.file_deleted_at != null) {
      throw new NotFoundException('Movie thumbnail is not available');
    }

    await this.assertMovieAccess(doc, id, userId);

    const expiresIn = this.config.get('MOVIE_STREAM_URL_EXPIRES_SECONDS', {
      infer: true
    });
    const url = await this.storage.getPresignedGetUrl(doc.thumbnail_key, expiresIn);
    return {
      url,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
    };
  }

  async scheduleFilePurge(movieId: string, purgeAt: Date): Promise<void> {
    await this.movies.scheduleFilePurge(movieId, purgeAt);
  }

  async purgeDueFiles(): Promise<number> {
    const due = await this.movies.findDueForFilePurge(new Date());
    let count = 0;
    for (const doc of due) {
      if (doc.storage_key != null) {
        await this.storage.deleteObject(doc.storage_key).catch(() => undefined);
      }
      if (doc.thumbnail_key != null) {
        await this.storage.deleteObject(doc.thumbnail_key).catch(() => undefined);
      }
      await this.movies.markFileDeleted(doc._id.toString());
      count += 1;
    }
    return count;
  }

  private async findAccessibleMovieDoc(
    id: string,
    userId: string,
    options: { requireReadyFile: boolean }
  ): Promise<MovieDocument> {
    const doc = await this.movies.findById(id);
    if (!doc || doc.deleted_at) {
      throw new NotFoundException(`Movie "${id}" not found`);
    }

    await this.assertMovieAccess(doc, id, userId);

    if (options.requireReadyFile) {
      if (
        doc.storage_key == null ||
        doc.file_deleted_at != null ||
        doc.upload_status !== MovieUploadStatus.READY
      ) {
        throw new NotFoundException('Movie file is not available');
      }
    }

    return doc;
  }

  private async assertMovieAccess(
    doc: MovieDocument,
    movieId: string,
    userId: string
  ): Promise<void> {
    const isOwner = doc.ownerId.toString() === userId;
    if (isOwner || doc.in_catalog) {
      return;
    }

    const hasRoomAccess = await this.userHasRoomAccessToMovie(movieId, userId);
    if (!hasRoomAccess) {
      throw new ForbiddenException('You do not have access to this movie');
    }
  }

  private async userHasRoomAccessToMovie(movieId: string, userId: string): Promise<boolean> {
    const uid = new Types.ObjectId(userId);
    const movieOid = new Types.ObjectId(movieId);

    const roomWithMovie = await this.roomModel.findOne({
      movie: movieOid,
      deleted_at: null,
      $or: [{ creator: uid }, { allowed_users: uid }]
    });
    if (roomWithMovie != null) {
      return true;
    }

    // During a mid-session swap, socket playback can reference the new movie id
    // before every reader sees the updated room.movie field. Room members may
    // stream any movie owned by their room host while in that session.
    const movie = await this.movies.findById(movieId);
    if (!movie || movie.deleted_at) {
      return false;
    }

    const hostRoom = await this.roomModel.findOne({
      creator: movie.ownerId,
      deleted_at: null,
      $or: [{ creator: uid }, { allowed_users: uid }]
    });
    return hostRoom != null;
  }

  private async assertExistsAndOwnedOrThrow(id: string): Promise<never> {
    const raw = await this.movies.findById(id);
    if (raw && !raw.deleted_at) {
      throw new ForbiddenException('You do not have access to this movie');
    }
    throw new NotFoundException(`Movie "${id}" not found`);
  }
}
