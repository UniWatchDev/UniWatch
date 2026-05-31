import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import type { CreateRoomInput, RoomPreview, RoomResponse, UpdateRoomInput } from '@repo/schemas/rooms';
import { RoomType, RoomStatus, type RoomDocument } from '@/rooms/room.schema';
import { MoviesService } from '@/movies/movies.service';
import { RoomRepository } from '@/rooms/room.repository';
import type { Env } from '@/utils/env.validation';

type RefLike = Types.ObjectId | { _id: Types.ObjectId | string };
type PopulatedUser = { _id: Types.ObjectId | string; userName?: string; firstName?: string };

function refToId(ref: RefLike | string | null | undefined): string | null {
  if (ref == null) return null;
  if (typeof ref === 'string') return ref;
  if (ref instanceof Types.ObjectId) return ref.toString();
  return String(ref._id);
}

function safeIds(arr: Types.ObjectId[] | null | undefined): string[] {
  return ((arr as unknown as (RefLike | null | undefined)[] | null | undefined) ?? [])
    .map(refToId)
    .filter((id): id is string => id != null);
}

function toResponse(doc: RoomDocument): RoomResponse {
  const allowedUsers = safeIds(doc.allowed_users);
  const bannedUsers = safeIds(doc.banned_users);
  const creatorDoc = doc.creator as unknown as PopulatedUser | null | undefined;
  const creatorId = creatorDoc != null ? String(creatorDoc._id) : '';
  const creatorName = creatorDoc?.userName ?? creatorDoc?.firstName ?? undefined;
  return {
    id: doc._id.toString(),
    name: doc.name,
    room_type: doc.room_type,
    movie: doc.movie != null ? refToId(doc.movie as RefLike) : null,
    creator: creatorId,
    description: doc.description ?? null,
    password: doc.password ?? null,
    allowed_users: allowedUsers,
    banned_users: bannedUsers,
    deactivate_at: doc.deactivate_at.toISOString(),
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
    status: doc.status,
    movie_name: doc.movie_name ?? null,
    movie_description: doc.movie_description ?? null,
    creator_name: creatorName,
    member_count: allowedUsers.length
  };
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly rooms: RoomRepository,
    private readonly movies: MoviesService,
    private readonly config: ConfigService<Env, true>
  ) {}

  async list(): Promise<RoomResponse[]> {
    const docs = await this.rooms.findAllActive();
    return docs.map(toResponse);
  }

  async get(id: string, userId: string): Promise<RoomResponse> {
    const doc = await this.rooms.findOneAccessibleById(id, userId);
    if (doc) return toResponse(doc);
    const raw = await this.rooms.findRawById(id);
    if (!raw || raw.deleted_at) {
      throw new NotFoundException(`Room "${id}" not found`);
    }
    throw new ForbiddenException('You do not have access to this room');
  }

  async create(userId: string, data: CreateRoomInput): Promise<RoomResponse> {
    let movieName = data.movie_name;
    let movieDescription = data.movie_description;
    let roomStatus: RoomStatus = RoomStatus.PREPARING;
    if (data.movie !== undefined) {
      const movie = await this.movies.get(data.movie, userId);
      if (movieName === undefined) {
        movieName = movie.name;
      }
      if (movieDescription === undefined && movie.description != null) {
        movieDescription = movie.description;
      }
      if (movie.has_file && movie.upload_status === 'ready') {
        roomStatus = RoomStatus.READY;
      }
    }
    const deactivateAt = data.deactivate_at !== undefined
      ? new Date(data.deactivate_at)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const doc = await this.rooms.create({
      name: data.name,
      creator: new Types.ObjectId(userId),
      room_type: data.room_type,
      status: roomStatus,
      deactivate_at: deactivateAt,
      ...(data.movie !== undefined && { movie: new Types.ObjectId(data.movie) }),
      ...(data.room_type !== 'public' && data.password !== undefined && { password: data.password }),
      ...(data.description !== undefined && { description: data.description }),
      ...(movieName !== undefined && { movie_name: movieName }),
      ...(movieDescription !== undefined && { movie_description: movieDescription })
    });
    return toResponse(doc);
  }

  async update(id: string, userId: string, data: UpdateRoomInput): Promise<RoomResponse> {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch['name'] = data.name;
    if (data.room_type !== undefined) patch['room_type'] = data.room_type;
    if (data.room_type === 'public') {
      patch['password'] = null;
    } else if (data.password !== undefined) {
      if (data.room_type === 'private') {
        patch['password'] = data.password;
      } else {
        const raw = await this.rooms.findRawById(id);
        if (raw?.room_type === RoomType.PRIVATE) patch['password'] = data.password;
      }
    }
    if (data.description !== undefined) patch['description'] = data.description;
    if (data.movie_name !== undefined) patch['movie_name'] = data.movie_name;
    if (data.movie_description !== undefined) patch['movie_description'] = data.movie_description;
    if (data.deactivate_at !== undefined) patch['deactivate_at'] = new Date(data.deactivate_at);
    if (data.movie !== undefined) {
      const movie = await this.movies.get(data.movie, userId);
      patch['movie'] = new Types.ObjectId(data.movie);
      if (data.movie_name === undefined) {
        patch['movie_name'] = movie.name;
      }
      if (data.movie_description === undefined && movie.description != null) {
        patch['movie_description'] = movie.description;
      }
    }

    const doc = await this.rooms.updateIfCreator(id, userId, patch);
    if (doc) return toResponse(doc);
    const raw = await this.rooms.findRawById(id);
    if (!raw || raw.deleted_at) {
      throw new NotFoundException(`Room "${id}" not found`);
    }
    throw new ForbiddenException('Only the room creator can edit this room');
  }

  async preview(id: string): Promise<RoomPreview> {
    const raw = await this.rooms.findRawById(id);
    if (!raw || raw.deleted_at) {
      throw new NotFoundException(`Room "${id}" not found`);
    }
    const previewCreator = raw.creator as unknown as PopulatedUser | null | undefined;
    return {
      id: raw._id.toString(),
      name: raw.name,
      room_type: raw.room_type,
      has_password: raw.password != null && raw.password.length > 0,
      status: raw.status,
      creator_name: previewCreator?.userName ?? previewCreator?.firstName ?? undefined,
      member_count: safeIds(raw.allowed_users).length
    };
  }

  async join(id: string, userId: string, password?: string): Promise<{ success: true }> {
    const raw = await this.rooms.findRawById(id);
    if (!raw || raw.deleted_at) {
      throw new NotFoundException(`Room "${id}" not found`);
    }

    if (refToId(raw.creator as RefLike | null | undefined) === userId) {
      return { success: true };
    }

    if (safeIds(raw.banned_users).includes(userId)) {
      throw new ForbiddenException('You have been banned from this room');
    }

    if (safeIds(raw.allowed_users).includes(userId)) {
      return { success: true };
    }

    if (raw.password != null && raw.password.length > 0) {
      if (!password || password !== raw.password) {
        throw new ForbiddenException('Incorrect room password');
      }
    }

    await this.rooms.addUser(id, new Types.ObjectId(userId));
    return { success: true };
  }

  async delete(id: string, userId: string): Promise<{ success: true }> {
    const raw = await this.rooms.findRawById(id);
    const movieIdBefore =
      raw?.movie != null ? refToId(raw.movie as RefLike) : null;
    const doc = await this.rooms.softDeleteIfCreator(id, userId);
    if (doc) {
      await this.scheduleLinkedMoviePurge(movieIdBefore);
      return { success: true };
    }
    if (!raw || raw.deleted_at) {
      throw new NotFoundException(`Room "${id}" not found`);
    }
    throw new ForbiddenException('Only the room creator can delete this room');
  }

  async leave(id: string, userId: string): Promise<{ success: true }> {
    const raw = await this.rooms.findRawById(id);
    if (!raw || raw.deleted_at) {
      throw new NotFoundException(`Room "${id}" not found`);
    }
    if (refToId(raw.creator as RefLike | null | undefined) === userId) {
      throw new ForbiddenException('The room creator cannot leave their own room');
    }
    await this.rooms.removeUser(id, new Types.ObjectId(userId));
    const updated = await this.rooms.findRawById(id);
    if (updated && safeIds(updated.allowed_users).length === 0) {
      await this.rooms.setDeactivatedAt(id, new Date());
      const movieId = updated.movie != null ? refToId(updated.movie as RefLike) : null;
      await this.scheduleLinkedMoviePurge(movieId);
    }
    return { success: true };
  }

  private async scheduleLinkedMoviePurge(movieId: string | null): Promise<void> {
    if (movieId == null) {
      return;
    }
    const ttlHours = this.config.get('MOVIE_FILE_TTL_HOURS', { infer: true });
    const purgeAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    await this.movies.scheduleFilePurge(movieId, purgeAt);
  }
}
