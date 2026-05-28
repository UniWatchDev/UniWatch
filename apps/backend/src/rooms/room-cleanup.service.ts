import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RoomRepository } from '@/rooms/room.repository';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class RoomCleanupService {
  private readonly logger = new Logger(RoomCleanupService.name);

  constructor(private readonly roomRepository: RoomRepository) {}

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'room-cleanup',
    waitForCompletion: true
  })
  async handleRoomCleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - TWELVE_HOURS_MS);

    // TODO: skip rooms that have active users once presence tracking is implemented

    const { deletedCount } = await this.roomRepository.softDeleteOlderThan(cutoff);
    this.logger.log(`Room cleanup: soft-deleted ${String(deletedCount)} rooms older than 12 hours`);
  }
}
