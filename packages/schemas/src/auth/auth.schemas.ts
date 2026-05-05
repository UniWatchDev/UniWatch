import { email, z } from 'zod';

function stripNullBytes(value: string): string {
  return value.replace(/\u0000/g, '');
}

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

/** Shared password rules (register + reset). */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/\d/, 'Password must include at least one number');

/** `email` and `userName` must be unique per server; `phoneNumber` may repeat across accounts. */
export const registerBodySchema = z.strictObject({
  userName: z
    .string()
    .trim()
    .transform(stripNullBytes)
    .pipe(
      z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(32, 'Username must be at most 32 characters')
        .regex(
          /^[a-zA-Z0-9_]+$/,
          'Username may only contain letters, numbers, and underscores'
        )
    ),

  phoneNumber: z
    .string()
    .trim()
    .transform(stripNullBytes)
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
    .transform(stripNullBytes)
    .transform((value) => value.toLowerCase())
    .pipe(email('Enter a valid email address')),

  password: z.string().transform(stripNullBytes).pipe(passwordSchema)
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const emailVerificationCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from your email');

export const registerResponseSchema = z.strictObject({
  userId: z.number().int().positive(),
  userName: z.string(),
  phoneNumber: z.string().regex(/^\+9725\d{8}$/),
  email: email(),
  createdAt: z.string(),
  emailVerified: z.boolean(),
  debug: z
    .strictObject({
      emailVerificationCode: emailVerificationCodeSchema,
      emailVerificationExpiresAt: z.string()
    })
    .optional()
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

/**
 * Login with email (contains `@`, validated as email) or username
 * (3–32 chars, same character rules as registration).
 */
export const loginBodySchema = z.strictObject({
  identifier: z
    .string()
    .trim()
    .min(1, 'Email or username is required')
    .transform((raw) => raw.toLowerCase())
    .refine(
      (value) => {
        if (value.includes('@')) {
          return email().safeParse(value).success;
        }
        return (
          value.length >= 3 &&
          value.length <= 32 &&
          /^[a-zA-Z0-9_]+$/.test(value)
        );
      },
      {
        message:
          'Use a valid email, or a username of 3–32 letters, numbers, or underscores'
      }
    ),
  password: z.string().min(1, 'Password is required')
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const loginResponseSchema = z.strictObject({
  userId: z.number().int().positive(),
  userName: z.string(),
  email: email(),
  emailVerified: z.boolean()
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const verifyEmailBodySchema = z.strictObject({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(email('Enter a valid email address')),
  code: emailVerificationCodeSchema
});

export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;

export const resendVerificationBodySchema = z.strictObject({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(email('Enter a valid email address'))
});

export type ResendVerificationBody = z.infer<typeof resendVerificationBodySchema>;

/** Non-enumerating ack for resend (and future forgot-password). */
export const authNonEnumeratingAckSchema = z.strictObject({
  ok: z.literal(true),
  message: z.string(),
  debug: z
    .strictObject({
      emailVerificationCode: emailVerificationCodeSchema,
      emailVerificationExpiresAt: z.string()
    })
    .optional()
});

export type AuthNonEnumeratingAck = z.infer<typeof authNonEnumeratingAckSchema>;

export const verifyEmailResponseSchema = z.strictObject({
  emailVerified: z.literal(true),
  userId: z.number().int().positive(),
  userName: z.string(),
  email: email()
});

export type VerifyEmailResponse = z.infer<typeof verifyEmailResponseSchema>;

/** Same shape as resend body (`{ email }`). */
export const forgotPasswordBodySchema = resendVerificationBodySchema;

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

export const forgotPasswordAckSchema = z.strictObject({
  ok: z.literal(true),
  message: z.string(),
  debug: z
    .strictObject({
      passwordResetToken: z.string().min(32),
      passwordResetExpiresAt: z.string()
    })
    .optional()
});

export type ForgotPasswordAck = z.infer<typeof forgotPasswordAckSchema>;

export const resetPasswordBodySchema = z.strictObject({
  token: z.string().min(32, 'Token is required'),
  newPassword: passwordSchema
});

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
