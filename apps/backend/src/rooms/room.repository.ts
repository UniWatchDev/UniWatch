import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { RoomRecord, type RoomDocument } from '@/rooms/room.schema';

@Injectable()
export class RoomRepository {
  constructor(
    @InjectModel(RoomRecord.name) private readonly model: Model<RoomDocument>
  ) {}

  findAll(): Promise<RoomDocument[]> {
    return this.model.find({ deleted_at: null }).populate('creator movie');
  }

  findById(id: string): Promise<RoomDocument | null> {
    return this.model.findById(id).populate('creator movie allowed_users banned_users');
  }

  findByMovie(movieId: string): Promise<RoomDocument[]> {
    return this.model.find({ movie: movieId, deleted_at: null });
  }

  findByCreator(userId: string): Promise<RoomDocument[]> {
    return this.model.find({ creator: userId, deleted_at: null });
  }

  create(data: {
    name: string;
    creator: Types.ObjectId;
    movie: Types.ObjectId;
    room_type: string;
    deactivate_at: Date;
    password?: string;
    description?: string;
    lobby?: Types.ObjectId;
  }): Promise<RoomDocument> {
    return new this.model(data).save();
  }

  addUser(roomId: string, userId: Types.ObjectId): Promise<RoomDocument | null> {
    return this.model.findByIdAndUpdate(
      roomId,
      { $addToSet: { allowed_users: userId } },
      { new: true }
    );
  }

  banUser(roomId: string, userId: Types.ObjectId): Promise<RoomDocument | null> {
    return this.model.findByIdAndUpdate(
      roomId,
      {
        $addToSet: { banned_users: userId },
        $pull: { allowed_users: userId }
      },
      { new: true }
    );
  }

  softDelete(id: string): Promise<RoomDocument | null> {
    return this.model.findByIdAndUpdate(id, { deleted_at: new Date() }, { new: true });
  }
}
