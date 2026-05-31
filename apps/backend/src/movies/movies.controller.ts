import {
  BadRequestException,
  Body,
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
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { diskStorage } from 'multer';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { MovieResponse, MovieStreamResponse } from '@repo/schemas/movies';

import { getAuthenticatedUserId } from '@/auth/get-authenticated-user-id';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import {
  CreateMovieDto,
  MovieIdParamsDto,
  MovieResponseDto,
  MovieStreamResponseDto,
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
  @ZodResponse({ status: 200, description: 'Upload movie file', type: MovieResponseDto })
  upload(
    @Req() req: Request,
    @Param() params: MovieIdParamsDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('replace') replace?: string
  ): Promise<MovieResponse> {
    if (file === undefined) {
      throw new BadRequestException('File is required');
    }
    return this.moviesService.uploadFile(
      params.id,
      getAuthenticatedUserId(req),
      file,
      replace === 'true'
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
