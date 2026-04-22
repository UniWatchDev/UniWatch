import { NOTES_ENDPOINT, NOTE_ENDPOINT } from '@repo/consts/notes';
import {
  createNoteSchema,
  deleteNoteResponseSchema,
  noteIdParamsSchema,
  noteSchema,
  notesListSchema,
  patchNoteSchema,
  updateNoteSchema,
  type CreateNoteInput,
  type DeleteNoteResponse,
  type Note,
  type NoteIdParams,
  type PatchNoteInput,
  type UpdateNoteInput
} from '@repo/schemas/notes';
import type { EndpointContract } from '../shared/endpoint.js';

export const listNotesContract: EndpointContract<Note[]> = {
  method: 'GET',
  path: NOTES_ENDPOINT,
  responseSchema: notesListSchema
};

export const getNoteContract: EndpointContract<Note, void, NoteIdParams> = {
  method: 'GET',
  path: NOTE_ENDPOINT,
  responseSchema: noteSchema,
  paramsSchema: noteIdParamsSchema
};

export const createNoteContract: EndpointContract<Note, CreateNoteInput> = {
  method: 'POST',
  path: NOTES_ENDPOINT,
  responseSchema: noteSchema,
  bodySchema: createNoteSchema
};

export const updateNoteContract: EndpointContract<
  Note,
  UpdateNoteInput,
  NoteIdParams
> = {
  method: 'PUT',
  path: NOTE_ENDPOINT,
  responseSchema: noteSchema,
  bodySchema: updateNoteSchema,
  paramsSchema: noteIdParamsSchema
};

export const patchNoteContract: EndpointContract<
  Note,
  PatchNoteInput,
  NoteIdParams
> = {
  method: 'PATCH',
  path: NOTE_ENDPOINT,
  responseSchema: noteSchema,
  bodySchema: patchNoteSchema,
  paramsSchema: noteIdParamsSchema
};

export const deleteNoteContract: EndpointContract<
  DeleteNoteResponse,
  void,
  NoteIdParams
> = {
  method: 'DELETE',
  path: NOTE_ENDPOINT,
  responseSchema: deleteNoteResponseSchema,
  paramsSchema: noteIdParamsSchema
};
