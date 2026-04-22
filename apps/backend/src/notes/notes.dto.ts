import { createZodDto } from 'nestjs-zod';
import {
  noteSchema,
  createNoteSchema,
  updateNoteSchema,
  patchNoteSchema,
  deleteNoteResponseSchema,
  noteIdParamsSchema
} from '@repo/schemas/notes';

export class CreateNoteDto extends createZodDto(createNoteSchema) {}

export class UpdateNoteDto extends createZodDto(updateNoteSchema) {}

export class PatchNoteDto extends createZodDto(patchNoteSchema) {}

export class NoteDto extends createZodDto(noteSchema) {}

export class DeleteNoteResponseDto extends createZodDto(
  deleteNoteResponseSchema
) {}

export class NoteIdParamsDto extends createZodDto(noteIdParamsSchema) {}
