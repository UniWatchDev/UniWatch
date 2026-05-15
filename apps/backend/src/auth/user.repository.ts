import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { UserRecord, type UserDocument } from '@/auth/user.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(UserRecord.name) private readonly model: Model<UserDocument>
  ) {}

  findById(id: string): Promise<UserDocument | null> {
    return this.model.findById(id);
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email });
  }

  findByUserName(userName: string): Promise<UserDocument | null> {
    return this.model.findOne({ userName: new RegExp(`^${userName}$`, 'i') });
  }

  findByIdentifier(identifier: string): Promise<UserDocument | null> {
    if (identifier.includes('@')) return this.findByEmail(identifier);
    return this.findByUserName(identifier);
  }

  async create(data: {
    email: string;
    userName: string;
    phoneNumber: string;
    passwordHash: string;
  }): Promise<UserDocument> {
    return new this.model(data).save();
  }

  markEmailVerified(id: string): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(id, { $set: { emailVerified: true } }, { new: true });
  }

  updatePassword(id: string, passwordHash: string): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      { $set: { passwordHash }, $inc: { passwordVersion: 1 } },
      { new: true }
    );
  }
}
