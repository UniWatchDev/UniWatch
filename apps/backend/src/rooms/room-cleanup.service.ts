import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { MoviesService } from '@/movies/movies.service';
import { RoomRepository } from '@/rooms/room.repository';
import type { Env } from '@/utils/env.validation';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class RoomCleanupService {
  private readonly logger = new Logger(RoomCleanupService.name);

  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly moviesService: MoviesService,
    private readonly config: ConfigService<Env, true>
  ) {}

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'room-cleanup',
    waitForCompletion: true
  })
  async handleRoomCleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - TWELVE_HOURS_MS);

    // TODO: skip rooms that have active users once presence tracking is implemented

    const roomsBeforeDelete = await this.roomRepository.findActiveOlderThan(cutoff);
    const { deletedCount } = await this.roomRepository.softDeleteOlderThan(cutoff);
    this.logger.log(`Room cleanup: soft-deleted ${String(deletedCount)} rooms older than 12 hours`);

    const ttlHours = this.config.get('MOVIE_FILE_TTL_HOURS', { infer: true });
    const purgeAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    for (const room of roomsBeforeDelete) {
      if (room.movie != null) {
        await this.moviesService.scheduleFilePurge(room.movie.toString(), purgeAt);
      }
    }
  }
}
