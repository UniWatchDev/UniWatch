import { z } from 'zod';

export const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Note = z.infer<typeof noteSchema>;

export const createNoteSchema = z.strictObject({
  title: z.string().min(1, 'Title is required'),
  content: z.string()
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z.strictObject({
  title: z.string().min(1, 'Title is required'),
  content: z.string()
});

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export const patchNoteSchema = z.strictObject({
  title: z.string().min(1).optional(),
  content: z.string().optional()
});

export type PatchNoteInput = z.infer<typeof patchNoteSchema>;

export const deleteNoteResponseSchema = z.object({
  success: z.boolean()
});

export type DeleteNoteResponse = z.infer<typeof deleteNoteResponseSchema>;

export const notesListSchema = z.array(noteSchema);

export const noteIdParamsSchema = z.strictObject({
  id: z.uuid()
});

export type NoteIdParams = z.infer<typeof noteIdParamsSchema>;
