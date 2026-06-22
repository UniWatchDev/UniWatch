import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Request, Response } from 'express';
import type {
  CompleteUploadResponse,
  MovieResponse,
  MovieStreamResponse,
  PresignUploadResponse
} from '@repo/schemas/movies';

import { getAuthenticatedUserId } from '@/auth/get-authenticated-user-id';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import {
  CompleteUploadRequestDto,
  CompleteUploadResponseDto,
  CreateMovieDto,
  MovieIdParamsDto,
  MovieResponseDto,
  MovieStreamResponseDto,
  PresignUploadRequestDto,
  PresignUploadResponseDto,
  UpdateMovieDto
} from '@/movies/movies.dto';
import { MovieIngestService } from '@/movies/movie-ingest.service';
import { MoviesService } from '@/movies/movies.service';

type ParsedMovieUploadQuery = {
  room_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseMovieUploadQuery(query: unknown): ParsedMovieUploadQuery {
  if (!isRecord(query)) {
    throw new BadRequestException('Upload query is required');
  }

  const roomId = query['room_id'];
  const fileName = query['file_name'];
  const fileType = query['file_type'];
  const fileSize = query['file_size'];
  if (typeof roomId !== 'string' || !/^[a-f\d]{24}$/iu.test(roomId)) {
    throw new BadRequestException('room_id must be a valid room id');
  }
  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    throw new BadRequestException('file_name is required');
  }
  if (typeof fileType !== 'string' || fileType.trim().length === 0) {
    throw new BadRequestException('file_type is required');
  }
  if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize <= 0) {
    throw new BadRequestException('file_size must be a positive number');
  }

  return {
    room_id: roomId,
    file_name: fileName,
    file_type: fileType,
    file_size: fileSize
  };
}

@ApiTags('movies')
@Controller('movies')
@UseGuards(JwtAuthGuard)
export class MoviesController {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly movieIngest: MovieIngestService
  ) {}

  @Get()
  @ZodResponse({ status: 200, description: 'List all movies', type: [MovieResponseDto] })
  list(@Req() req: Request): Promise<MovieResponse[]> {
    return this.moviesService.list(getAuthenticatedUserId(req));
  }

  @Get(':id/stream')
  @ZodResponse({
    status: 200,
    description: 'Presigned URL for movie playback',
    type: MovieStreamResponseDto
  })
  stream(
    @Req() req: Request,
    @Param() params: MovieIdParamsDto
  ): Promise<MovieStreamResponse> {
    return this.moviesService.getStreamUrl(params.id, getAuthenticatedUserId(req));
  }

  @Get(':id/media')
  async media(
    @Req() req: Request,
    @Param() params: MovieIdParamsDto,
    @Res() res: Response
  ): Promise<void> {
    const rangeHeader = req.headers.range;
    let range: { start: number; end: number } | undefined;
    if (typeof rangeHeader === 'string') {
      const match = /^bytes=(\d+)-(\d*)$/u.exec(rangeHeader);
      if (match?.[1] !== undefined) {
        const start = Number.parseInt(match[1], 10);
        const endPart = match[2] ?? '';
        const end = endPart !== '' ? Number.parseInt(endPart, 10) : undefined;
        range = { start, end: end ?? start + 1024 * 1024 - 1 };
      }
    }

    const media = await this.moviesService.getMediaFile(
      params.id,
      getAuthenticatedUserId(req),
      range
    );

    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=60');
    // Allow the Vite dev app (different port) to load authenticated media in <video>.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    if (range !== undefined) {
      res.status(206);
      res.setHeader(
        'Content-Range',
        `bytes ${String(range.start)}-${String(range.start + media.object.contentLength - 1)}/${String(media.totalSize)}`
      );
      res.setHeader('Content-Length', String(media.object.contentLength));
    } else {
      res.setHeader('Content-Length', String(media.totalSize));
    }

    if (Buffer.isBuffer(media.object.body)) {
      res.send(media.object.body);
      return;
    }

    media.object.body.pipe(res);
  }

  @Get(':id/thumbnail')
  @ZodResponse({
    status: 200,
    description: 'Presigned URL for movie thumbnail',
    type: MovieStreamResponseDto
  })
  thumbnail(
    @Req() req: Request,
    @Param() params: MovieIdParamsDto
  ): Promise<MovieStreamResponse> {
    return this.moviesService.getThumbnailUrl(params.id, getAuthenticatedUserId(req));
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

  @Post('resolve')
  @ZodResponse({
    status: 200,
    description: 'Return an existing owned movie when the name already exists',
    type: MovieResponseDto
  })
  async resolve(
    @Req() req: Request,
    @Body() body: CreateMovieDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<MovieResponse> {
    const result = await this.moviesService.resolveOrCreate(
      getAuthenticatedUserId(req),
      body
    );
    res.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result.movie;
  }

  @Post(':id/upload')
  @HttpCode(200)
  @ZodResponse({ status: 200, description: 'Upload movie file', type: MovieResponseDto })
  upload(
    @Req() req: Request,
    @Param() params: MovieIdParamsDto,
    @Query() query: unknown
  ): Promise<MovieResponse> {
    const uploadQuery = parseMovieUploadQuery(query);
    return this.movieIngest.ingestUpload({
      movieId: params.id,
      ownerId: getAuthenticatedUserId(req),
      roomId: uploadQuery.room_id,
      fileName: uploadQuery.file_name,
      fileType: uploadQuery.file_type,
      fileSize: uploadQuery.file_size,
      body: req
    });
  }

  @Post(':id/presign-upload')
  @HttpCode(200)
  @ZodResponse({
    status: 200,
    description: 'Presigned PUT URL for direct upload to R2',
    type: PresignUploadResponseDto
  })
  presignUpload(
    @Req() req: Request,
    @Param() params: MovieIdParamsDto,
    @Body() body: PresignUploadRequestDto
  ): Promise<PresignUploadResponse> {
    return this.moviesService.presignUpload(params.id, getAuthenticatedUserId(req), body);
  }

  @Post(':id/complete-upload')
  @HttpCode(200)
  @ZodResponse({
    status: 200,
    description: 'Mark the upload complete and start async processing',
    type: CompleteUploadResponseDto
  })
  completeUpload(
    @Req() req: Request,
    @Param() params: MovieIdParamsDto,
    @Body() body: CompleteUploadRequestDto
  ): Promise<CompleteUploadResponse> {
    return this.moviesService.completeUpload(
      params.id,
      getAuthenticatedUserId(req),
      body.room_id
    );
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
