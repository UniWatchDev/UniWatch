import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import {
  RefreshSessionRecord,
  type RefreshSessionDocument
} from '@/auth/refresh-session.schema';

@Injectable()
export class RefreshSessionRepository {
  constructor(
    @InjectModel(RefreshSessionRecord.name)
    private readonly model: Model<RefreshSessionDocument>
  ) {}

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.model.create({
      userId: new Types.ObjectId(userId),
      tokenHash,
      expiresAt
    });
  }

  findByTokenHash(tokenHash: string): Promise<RefreshSessionDocument | null> {
    return this.model.findOne({ tokenHash });
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.model.deleteOne({ tokenHash });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.model.deleteMany({ userId: new Types.ObjectId(userId) });
  }
}
