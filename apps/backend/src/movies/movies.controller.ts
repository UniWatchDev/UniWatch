import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Request } from 'express';
import type { MovieResponse } from '@repo/schemas/movies';
import { getAuthenticatedUserId } from '@/auth/get-authenticated-user-id';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import {
  CreateMovieDto,
  MovieIdParamsDto,
  MovieResponseDto,
  UpdateMovieDto
} from '@/movies/movies.dto';
import { MoviesService } from '@/movies/movies.service';

@ApiTags('movies')
@Controller('movies')
@UseGuards(JwtAuthGuard)
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ZodResponse({ status: 200, description: 'List all movies', type: [MovieResponseDto] })
  list(@Req() req: Request): Promise<MovieResponse[]> {
    return this.moviesService.list(getAuthenticatedUserId(req));
  }

  @Get(':id')
  @ZodResponse({ status: 200, description: 'Get a movie by id', type: MovieResponseDto })
  get(@Req() req: Request, @Param() params: MovieIdParamsDto): Promise<MovieResponse> {
    return this.moviesService.get(params.id, getAuthenticatedUserId(req));
  }

  @Post()
  @HttpCode(201)
  @ZodResponse({ status: 201, description: 'Create a movie', type: MovieResponseDto })
  create(@Req() req: Request, @Body() body: CreateMovieDto): Promise<MovieResponse> {
    return this.moviesService.create(getAuthenticatedUserId(req), body);
  }

  @Patch(':id')
  @ZodResponse({ status: 200, description: 'Update a movie', type: MovieResponseDto })
  update(
    @Req() req: Request,
    @Param() params: MovieIdParamsDto,
    @Body() body: UpdateMovieDto
  ): Promise<MovieResponse> {
    return this.moviesService.update(params.id, getAuthenticatedUserId(req), body);
  }

  @Delete(':id')
  delete(
    @Req() req: Request,
    @Param() params: MovieIdParamsDto
  ): Promise<{ success: true }> {
    return this.moviesService.delete(params.id, getAuthenticatedUserId(req));
  }
}
