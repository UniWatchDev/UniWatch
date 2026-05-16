import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MovieRecord, MovieSchema } from '@/movies/movie.schema';
import { MovieRepository } from '@/movies/movie.repository';
import { MoviesService } from '@/movies/movies.service';
import { MoviesController } from '@/movies/movies.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: MovieRecord.name, schema: MovieSchema }])],
  controllers: [MoviesController],
  providers: [MoviesService, MovieRepository],
  exports: [MovieRepository]
})
export class MoviesModule {}
