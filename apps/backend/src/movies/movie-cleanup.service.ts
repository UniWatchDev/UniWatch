import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { MoviesService } from '@/movies/movies.service';

@Injectable()
export class MovieCleanupService {
  private readonly logger = new Logger(MovieCleanupService.name);

  constructor(private readonly moviesService: MoviesService) {}

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'movie-file-purge',
    waitForCompletion: true
  })
  async handleMovieFilePurge(): Promise<void> {
    const count = await this.moviesService.purgeDueFiles();
    if (count > 0) {
      this.logger.log(`Movie file purge: removed ${String(count)} file(s) from storage`);
    }
  }
}
