import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Note, DeleteNoteResponse } from '@repo/schemas/notes';
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
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ZodResponse({ status: 200, description: 'List all notes', type: [NoteDto] })
  list(): Note[] {
    return this.notesService.list();
  }

  @Get(':id')
  @ZodResponse({ status: 200, description: 'Get a note by id', type: NoteDto })
  get(@Param() params: NoteIdParamsDto): Note {
    return this.notesService.get(params.id);
  }

  @Post()
  @ZodResponse({ status: 201, description: 'Create a note', type: NoteDto })
  create(@Body() body: CreateNoteDto): Note {
    return this.notesService.create(body);
  }

  @Put(':id')
  @ZodResponse({ status: 200, description: 'Replace a note', type: NoteDto })
  update(@Param() params: NoteIdParamsDto, @Body() body: UpdateNoteDto): Note {
    return this.notesService.update(params.id, body);
  }

  @Patch(':id')
  @ZodResponse({ status: 200, description: 'Patch a note', type: NoteDto })
  patch(@Param() params: NoteIdParamsDto, @Body() body: PatchNoteDto): Note {
    return this.notesService.patch(params.id, body);
  }

  @Delete(':id')
  @ZodResponse({
    status: 200,
    description: 'Delete a note',
    type: DeleteNoteResponseDto
  })
  delete(@Param() params: NoteIdParamsDto): DeleteNoteResponse {
    return this.notesService.delete(params.id);
  }
}
