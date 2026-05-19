import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Request } from 'express';
import type { Note, DeleteNoteResponse } from '@repo/schemas/notes';

import { getAuthenticatedUserId } from '@/auth/get-authenticated-user-id';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

import {
  CreateNoteDto,
  UpdateNoteDto,
  PatchNoteDto,
  NoteDto,
  DeleteNoteResponseDto,
  NoteIdParamsDto
} from '@/notes/notes.dto';
import { NotesService } from '@/notes/notes.service';

@ApiTags('notes')
@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ZodResponse({ status: 200, description: 'List all notes', type: [NoteDto] })
  list(@Req() req: Request): Promise<Note[]> {
    return this.notesService.list(getAuthenticatedUserId(req));
  }

  @Get(':id')
  @ZodResponse({ status: 200, description: 'Get a note by id', type: NoteDto })
  get(@Req() req: Request, @Param() params: NoteIdParamsDto): Promise<Note> {
    return this.notesService.get(params.id, getAuthenticatedUserId(req));
  }

  @Post()
  @HttpCode(201)
  @ZodResponse({ status: 201, description: 'Create a note', type: NoteDto })
  create(@Req() req: Request, @Body() body: CreateNoteDto): Promise<Note> {
    return this.notesService.create(getAuthenticatedUserId(req), body);
  }

  @Put(':id')
  @ZodResponse({ status: 200, description: 'Update a note', type: NoteDto })
  update(
    @Req() req: Request,
    @Param() params: NoteIdParamsDto,
    @Body() body: UpdateNoteDto
  ): Promise<Note> {
    return this.notesService.update(params.id, getAuthenticatedUserId(req), body);
  }

  @Patch(':id')
  @ZodResponse({ status: 200, description: 'Patch a note', type: NoteDto })
  patch(
    @Req() req: Request,
    @Param() params: NoteIdParamsDto,
    @Body() body: PatchNoteDto
  ): Promise<Note> {
    return this.notesService.patch(params.id, getAuthenticatedUserId(req), body);
  }

  @Delete(':id')
  @ZodResponse({
    status: 200,
    description: 'Delete a note',
    type: DeleteNoteResponseDto
  })
  delete(
    @Req() req: Request,
    @Param() params: NoteIdParamsDto
  ): Promise<DeleteNoteResponse> {
    return this.notesService.delete(params.id, getAuthenticatedUserId(req));
  }
}
