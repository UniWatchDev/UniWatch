import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { diskStorage } from 'multer';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { MovieResponse } from '@repo/schemas/movies';
import { ADMIN_CONTROLLER_PATH } from '@repo/consts/admin';

import { AdminGuard } from '@/auth/admin.guard';
import {
  CatalogMovieIdParamsDto,
  CatalogMovieResponseDto,
  CreateCatalogMovieDto,
  UpdateCatalogMovieDto,
  UploadCatalogMovieDto
} from '@/admin/admin.dto';
import { getAuthenticatedUserId } from '@/auth/get-authenticated-user-id';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { MovieResponseDto } from '@/movies/movies.dto';
import { MoviesService } from '@/movies/movies.service';

@ApiTags('admin')
@Controller(ADMIN_CONTROLLER_PATH)
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCatalogController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get('catalog/movies')
  @ZodResponse({
    status: 200,
    description: 'List all catalog movies (including unpublished-ready entries)',
    type: [MovieResponseDto]
  })
  listCatalogMovies(): Promise<MovieResponse[]> {
    return this.moviesService.listCatalogAdmin();
  }

  @Post('catalog/movies')
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse({
    status: 201,
    description: 'Publish a pre-uploaded R2 object as a catalog movie',
    type: CatalogMovieResponseDto
  })
  createCatalogMovie(
    @Req() req: Request,
    @Body() body: CreateCatalogMovieDto
  ): Promise<MovieResponse> {
    return this.moviesService.createCatalogEntry(getAuthenticatedUserId(req), body);
  }

  @Patch('catalog/movies/:id')
  @ZodResponse({
    status: 200,
    description: 'Update catalog visibility or metadata',
    type: CatalogMovieResponseDto
  })
  updateCatalogMovie(
    @Param() params: CatalogMovieIdParamsDto,
    @Body() body: UpdateCatalogMovieDto
  ): Promise<MovieResponse> {
    return this.moviesService.updateCatalogEntry(params.id, body);
  }

  @Post('catalog/movies/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}-${file.originalname}`);
        }
      }),
      limits: { files: 1 }
    })
  )
  @ZodResponse({
    status: 201,
    description: 'Upload a video file and publish it to the catalog',
    type: CatalogMovieResponseDto
  })
  uploadCatalogMovie(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: UploadCatalogMovieDto
  ): Promise<MovieResponse> {
    if (file === undefined) {
      throw new BadRequestException('File is required');
    }
    return this.moviesService.uploadCatalogMovie(getAuthenticatedUserId(req), file, body);
  }
}
