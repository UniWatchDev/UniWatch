import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { MovieResponse } from '@repo/schemas/movies';
import {
  CreateMovieDto,
  MovieIdParamsDto,
  MovieResponseDto,
  UpdateMovieDto
} from '@/movies/movies.dto';
import { MoviesService } from '@/movies/movies.service';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ZodResponse({ status: 200, description: 'List all movies', type: [MovieResponseDto] })
  list(): Promise<MovieResponse[]> {
    return this.moviesService.list();
  }

  @Get(':id')
  @ZodResponse({ status: 200, description: 'Get a movie by id', type: MovieResponseDto })
  get(@Param() params: MovieIdParamsDto): Promise<MovieResponse> {
    return this.moviesService.get(params.id);
  }

  @Post()
  @HttpCode(201)
  @ZodResponse({ status: 201, description: 'Create a movie', type: MovieResponseDto })
  create(@Body() body: CreateMovieDto): Promise<MovieResponse> {
    return this.moviesService.create(body);
  }

  @Patch(':id')
  @ZodResponse({ status: 200, description: 'Update a movie', type: MovieResponseDto })
  update(
    @Param() params: MovieIdParamsDto,
    @Body() body: UpdateMovieDto
  ): Promise<MovieResponse> {
    return this.moviesService.update(params.id, body);
  }

  @Delete(':id')
  delete(@Param() params: MovieIdParamsDto): Promise<{ success: true }> {
    return this.moviesService.delete(params.id);
  }
}
