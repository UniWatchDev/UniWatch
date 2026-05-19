import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { RoomRecord, type RoomDocument } from '@/rooms/room.schema';

@Injectable()
export class RoomRepository {
  constructor(
    @InjectModel(RoomRecord.name) private readonly model: Model<RoomDocument>
  ) {}

  findAccessibleForUser(userId: string): Promise<RoomDocument[]> {
    const uid = new Types.ObjectId(userId);
    return this.model
      .find({
        deleted_at: null,
        $or: [{ creator: uid }, { allowed_users: uid }]
      })
      .populate('creator movie allowed_users banned_users');
  }

  findRawById(id: string): Promise<RoomDocument | null> {
    return this.model.findById(id).populate('creator movie allowed_users banned_users');
  }

  findOneAccessibleById(roomId: string, userId: string): Promise<RoomDocument | null> {
    const uid = new Types.ObjectId(userId);
    return this.model
      .findOne({
        _id: roomId,
        deleted_at: null,
        $or: [{ creator: uid }, { allowed_users: uid }]
      })
      .populate('creator movie allowed_users banned_users');
  }

  findByMovie(movieId: string): Promise<RoomDocument[]> {
    return this.model.find({ movie: movieId, deleted_at: null });
  }

  findByCreator(userId: string): Promise<RoomDocument[]> {
    return this.model.find({
      creator: new Types.ObjectId(userId),
      deleted_at: null
    });
  }

  create(data: {
    name: string;
    creator: Types.ObjectId;
    room_type: string;
    deactivate_at: Date;
    movie?: Types.ObjectId;
    password?: string;
    description?: string;
    movie_name?: string;
    movie_description?: string;
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

  softDeleteIfCreator(roomId: string, creatorId: string): Promise<RoomDocument | null> {
    return this.model.findOneAndUpdate(
      {
        _id: roomId,
        creator: new Types.ObjectId(creatorId),
        deleted_at: null
      },
      { $set: { deleted_at: new Date() } },
      { returnDocument: 'after' }
    );
  }
}
