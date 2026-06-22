import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '@/auth/auth.module';
import { MovieRecord, MovieSchema } from '@/movies/movie.schema';
import { MovieRepository } from '@/movies/movie.repository';
import { MoviesService } from '@/movies/movies.service';
import { MoviesController } from '@/movies/movies.controller';
import { MovieCleanupService } from '@/movies/movie-cleanup.service';
import { MovieIndexSyncService } from '@/movies/movie-index-sync.service';
import { VideoProcessingService } from '@/movies/video-processing.service';
import { RealtimeModule } from '@/realtime/realtime.module';
import { RoomRecord, RoomSchema } from '@/rooms/room.schema';
import { StorageModule } from '@/storage/storage.module';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    forwardRef(() => RealtimeModule),
    MongooseModule.forFeature([
      { name: MovieRecord.name, schema: MovieSchema },
      { name: RoomRecord.name, schema: RoomSchema }
    ])
  ],
  controllers: [MoviesController],
  providers: [
    MoviesService,
    MovieRepository,
    MovieCleanupService,
    MovieIndexSyncService,
    VideoProcessingService
  ],
  exports: [MovieRepository, MoviesService]
})
export class MoviesModule {}
