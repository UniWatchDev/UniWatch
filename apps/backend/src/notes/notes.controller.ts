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
  UseGuards
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Note, DeleteNoteResponse } from '@repo/schemas/notes';

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
  list(): Promise<Note[]> {
    return this.notesService.list();
  }

  @Get(':id')
  @ZodResponse({ status: 200, description: 'Get a note by id', type: NoteDto })
  get(@Param() params: NoteIdParamsDto): Promise<Note> {
    return this.notesService.get(params.id);
  }

  @Post()
  @HttpCode(201)
  @ZodResponse({ status: 201, description: 'Create a note', type: NoteDto })
  create(@Body() body: CreateNoteDto): Promise<Note> {
    return this.notesService.create(body);
  }

  @Put(':id')
  @ZodResponse({ status: 200, description: 'Update a note', type: NoteDto })
  update(
    @Param() params: NoteIdParamsDto,
    @Body() body: UpdateNoteDto
  ): Promise<Note> {
    return this.notesService.update(params.id, body);
  }

  @Patch(':id')
  @ZodResponse({ status: 200, description: 'Patch a note', type: NoteDto })
  patch(
    @Param() params: NoteIdParamsDto,
    @Body() body: PatchNoteDto
  ): Promise<Note> {
    return this.notesService.patch(params.id, body);
  }

  @Delete(':id')
  @ZodResponse({
    status: 200,
    description: 'Delete a note',
    type: DeleteNoteResponseDto
  })
  delete(@Param() params: NoteIdParamsDto): Promise<DeleteNoteResponse> {
    return this.notesService.delete(params.id);
  }
}
