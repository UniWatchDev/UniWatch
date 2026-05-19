import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Types } from 'mongoose';
import type { CreateRoomInput, RoomResponse } from '@repo/schemas/rooms';
import type { RoomDocument } from '@/rooms/room.schema';
import { MoviesService } from '@/movies/movies.service';
import { RoomRepository } from '@/rooms/room.repository';

type RefLike = Types.ObjectId | { _id: Types.ObjectId | string };

function refToId(ref: RefLike | string): string {
  if (typeof ref === 'string') return ref;
  if (ref instanceof Types.ObjectId) return ref.toString();
  return String(ref._id);
}

function toResponse(doc: RoomDocument): RoomResponse {
  return {
    id: doc._id.toString(),
    name: doc.name,
    room_type: doc.room_type,
    movie: doc.movie != null ? refToId(doc.movie as RefLike) : null,
    creator: refToId(doc.creator as RefLike),
    description: doc.description ?? null,
    password: doc.password ?? null,
    allowed_users: doc.allowed_users.map((u) => refToId(u as RefLike)),
    banned_users: doc.banned_users.map((u) => refToId(u as RefLike)),
    deactivate_at: doc.deactivate_at.toISOString(),
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
    status: doc.status,
    movie_name: doc.movie_name ?? null,
    movie_description: doc.movie_description ?? null,
    creator_name: doc.creator_name ?? undefined,
    member_count: doc.allowed_users.length
  };
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly rooms: RoomRepository,
    private readonly movies: MoviesService
  ) {}

  async list(userId: string): Promise<RoomResponse[]> {
    const docs = await this.rooms.findAccessibleForUser(userId);
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
    if (data.movie !== undefined) {
      await this.movies.get(data.movie, userId);
    }
    const deactivateAt = data.deactivate_at !== undefined
      ? new Date(data.deactivate_at)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const doc = await this.rooms.create({
      name: data.name,
      creator: new Types.ObjectId(userId),
      room_type: data.room_type,
      deactivate_at: deactivateAt,
      ...(data.movie !== undefined && { movie: new Types.ObjectId(data.movie) }),
      ...(data.password !== undefined && { password: data.password }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.movie_name !== undefined && { movie_name: data.movie_name }),
      ...(data.movie_description !== undefined && { movie_description: data.movie_description })
    });
    return toResponse(doc);
  }

  async delete(id: string, userId: string): Promise<{ success: true }> {
    const doc = await this.rooms.softDeleteIfCreator(id, userId);
    if (doc) return { success: true };
    const raw = await this.rooms.findRawById(id);
    if (!raw || raw.deleted_at) {
      throw new NotFoundException(`Room "${id}" not found`);
    }
    throw new ForbiddenException('Only the room creator can delete this room');
  }
}
