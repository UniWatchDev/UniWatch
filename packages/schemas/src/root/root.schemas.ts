import { z } from 'zod';

export const rootResponseSchema = z.object({
  message: z.string()
});

export type RootResponse = z.infer<typeof rootResponseSchema>;
