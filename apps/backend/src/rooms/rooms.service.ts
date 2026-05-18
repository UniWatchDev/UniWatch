import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { CreateRoomInput, RoomResponse } from '@repo/schemas/rooms';
import type { RoomDocument } from '@/rooms/room.schema';
import { RoomRepository } from '@/rooms/room.repository';

function toResponse(doc: RoomDocument): RoomResponse {
  return {
    id: doc._id.toString(),
    name: doc.name,
    room_type: doc.room_type,
    movie: doc.movie.toString(),
    creator: doc.creator.toString(),
    description: doc.description ?? null,
    password: doc.password ?? null,
    allowed_users: doc.allowed_users.map((u) => u.toString()),
    banned_users: doc.banned_users?.map((u) => u.toString()) ?? null,
    deactivate_at: doc.deactivate_at.toISOString(),
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString()
  };
}

@Injectable()
export class RoomsService {
  constructor(private readonly rooms: RoomRepository) {}

  async list(): Promise<RoomResponse[]> {
    const docs = await this.rooms.findAll();
    return docs.map(toResponse);
  }

  async get(id: string): Promise<RoomResponse> {
    const doc = await this.rooms.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundException(`Room "${id}" not found`);
    return toResponse(doc);
  }

  async create(data: CreateRoomInput): Promise<RoomResponse> {
    const doc = await this.rooms.create({
      name: data.name,
      creator: new Types.ObjectId(data.creator),
      movie: new Types.ObjectId(data.movie),
      room_type: data.room_type,
      deactivate_at: new Date(data.deactivate_at),
      ...(data.password !== undefined && { password: data.password }),
      ...(data.description !== undefined && { description: data.description })
    });
    return toResponse(doc);
  }

  async delete(id: string): Promise<{ success: true }> {
    const doc = await this.rooms.softDelete(id);
    if (!doc) throw new NotFoundException(`Room "${id}" not found`);
    return { success: true };
  }
}
