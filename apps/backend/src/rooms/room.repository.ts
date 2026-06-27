import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { RoomRecord, type RoomDocument, type RoomStatus } from '@/rooms/room.schema';

@Injectable()
export class RoomRepository {
  constructor(
    @InjectModel(RoomRecord.name) private readonly model: Model<RoomDocument>
  ) {}

  findAllActive(): Promise<RoomDocument[]> {
    return this.model
      .find({ deleted_at: null })
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

  async findTypesByIds(ids: string[]): Promise<Map<string, 'public' | 'private'>> {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const docs = await this.model
      .find({ _id: { $in: objectIds } })
      .select('room_type')
      .lean();
    return new Map(
      docs.map((d) => [
        (d._id as Types.ObjectId).toString(),
        d.room_type as 'public' | 'private'
      ])
    );
  }

  create(data: {
    name: string;
    creator: Types.ObjectId;
    room_type: string;
    status?: RoomStatus;
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

  setStatus(roomId: string, status: string): Promise<RoomDocument | null> {
    return this.model.findByIdAndUpdate(
      roomId,
      { $set: { status } },
      { new: true }
    );
  }

  removeUser(roomId: string, userId: Types.ObjectId): Promise<RoomDocument | null> {
    return this.model.findByIdAndUpdate(
      roomId,
      { $pull: { allowed_users: userId } },
      { returnDocument: 'after' }
    );
  }

  setDeactivatedAt(roomId: string, deactivatedAt: Date): Promise<RoomDocument | null> {
    return this.model.findByIdAndUpdate(
      roomId,
      { $set: { deactivated_at: deactivatedAt } },
      { returnDocument: 'after' }
    );
  }

  findRecentlySoftDeletedWithMovies(since: Date): Promise<RoomDocument[]> {
    return this.model.find({
      deleted_at: { $gte: since },
      movie: { $ne: null }
    });
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

  updateIfCreator(
    roomId: string,
    creatorId: string,
    data: Record<string, unknown>
  ): Promise<RoomDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: roomId, creator: new Types.ObjectId(creatorId), deleted_at: null },
        { $set: data },
        { returnDocument: 'after' }
      )
      .populate('creator movie allowed_users banned_users');
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

  async softDeleteOlderThan(cutoff: Date): Promise<{ deletedCount: number }> {
    const result = await this.model.updateMany(
      { deleted_at: null, created_at: { $lt: cutoff } },
      { $set: { deleted_at: new Date(), deactivated_at: new Date() } }
    );
    return { deletedCount: result.modifiedCount };
  }

  findActiveOlderThan(cutoff: Date): Promise<RoomDocument[]> {
    return this.model.find({
      deleted_at: null,
      created_at: { $lt: cutoff },
      movie: { $ne: null }
    });
  }
}
