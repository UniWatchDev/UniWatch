import { email, z } from 'zod';

/** Accepts +9725XXXXXXXX, 9725XXXXXXXX, or 05XXXXXXXX (spaces/hyphens stripped). */
function normalizeIsraeliMobile(raw: string): string {
  const compact = raw.trim().replace(/[\s-]/g, '');

  if (/^\+9725\d{8}$/.test(compact)) {
    return compact;
  }
  if (/^9725\d{8}$/.test(compact)) {
    return `+${compact}`;
  }
  if (/^05\d{8}$/.test(compact)) {
    return `+972${compact.slice(1)}`;
  }

  return compact;
}

export const registerBodySchema = z.strictObject({
  userName: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username may only contain letters, numbers, and underscores'
    ),

  phoneNumber: z
    .string()
    .trim()
    .transform(normalizeIsraeliMobile)
    .pipe(
      z
        .string()
        .regex(
          /^\+9725\d{8}$/,
          'Use a valid Israeli mobile (+9725XXXXXXXX or 05XXXXXXXX)'
        )
    ),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(email('Enter a valid email address')),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
    .regex(/\d/, 'Password must include at least one number')
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const registerResponseSchema = z.strictObject({
  userId: z.number().int().positive(),
  userName: z.string(),
  phoneNumber: z.string().regex(/^\+9725\d{8}$/),
  email: email(),
  createdAt: z.string()
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const loginBodySchema = z.strictObject({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(email('Enter a valid email address')),
  password: z.string().min(1, 'Password is required')
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const loginResponseSchema = z.strictObject({
  userId: z.number().int().positive(),
  userName: z.string(),
  email: email()
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
