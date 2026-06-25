import { email, z } from 'zod';

/** Keep in sync with `loginResponseSchema` in `auth.schemas.ts`. */
export const mongoObjectIdStringSchema = z
  .string()
  .length(24)
  .regex(/^[a-f0-9]+$/i, 'Invalid user id');

function stripNullBytes(value: string): string {
  return value.replace(/\u0000/g, '');
}

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

const profileFirstNameSchema = z
  .string()
  .trim()
  .transform(stripNullBytes)
  .pipe(
    z
      .string()
      .min(1, 'First name is required')
      .max(64, 'First name is too long')
  );

/** Empty string clears last name on PATCH. */
const profileLastNameField = z
  .string()
  .trim()
  .transform(stripNullBytes)
  .transform((value) => (value.length === 0 ? undefined : value))
  .pipe(z.string().max(64, 'Last name is too long').optional());

export const AVATAR_PRESET_IDS = [
  'violet-reel',
  'coral-popcorn',
  'sky-star',
  'mint-clapper',
  'amber-moon',
  'rose-heart',
  'teal-ticket',
  'gold-bolt'
] as const;

export const DEFAULT_AVATAR_ID = 'violet-reel' as const;

export const avatarPresetIdSchema = z.enum(AVATAR_PRESET_IDS);

export type AvatarPresetId = z.infer<typeof avatarPresetIdSchema>;

const profilePhoneSchema = z
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
  );

/** Full profile for owner session (`/auth/me`, login, PATCH me response). */
export const userProfileSchema = z.strictObject({
  userId: mongoObjectIdStringSchema,
  userName: z.string(),
  firstName: z.string(),
  lastName: z.string().optional(),
  email: email(),
  phoneNumber: z
    .string()
    .regex(/^\+9725\d{8}$/, 'Invalid phone number'),
  emailVerified: z.boolean(),
  isProfilePrivate: z.boolean(),
  avatarId: avatarPresetIdSchema,
  createdAt: z.string()
});

export type UserProfile = z.infer<typeof userProfileSchema>;

/** Visitor-safe profile card (no email or phone). */
export const publicProfileSchema = z.strictObject({
  userId: mongoObjectIdStringSchema,
  userName: z.string(),
  firstName: z.string(),
  lastName: z.string().optional(),
  isProfilePrivate: z.boolean(),
  avatarId: avatarPresetIdSchema,
  createdAt: z.string()
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;

export const userNameParamsSchema = z.strictObject({
  userName: z
    .string()
    .trim()
    .min(3, 'Username is required')
    .max(32, 'Username is too long')
});

export type UserNameParams = z.infer<typeof userNameParamsSchema>;

export const getUserProfileResponseSchema = z.strictObject({
  profile: publicProfileSchema,
  viewerIsOwner: z.boolean()
});

export type GetUserProfileResponse = z.infer<typeof getUserProfileResponseSchema>;

/** PATCH `/api/auth/me` — username and email are not accepted. */
export const updateProfileBodySchema = z.strictObject({
  firstName: profileFirstNameSchema,
  lastName: profileLastNameField,
  phoneNumber: profilePhoneSchema,
  isProfilePrivate: z.boolean(),
  avatarId: avatarPresetIdSchema
});

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

/** GET /api/users/search?q=:term query params. */
export const userSearchQuerySchema = z.strictObject({
  q: z.string().trim().min(1).max(64)
});
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;

/** GET /api/users/search response — array of public profiles. */
export const userSearchResponseSchema = z.array(publicProfileSchema);
export type UserSearchResponse = z.infer<typeof userSearchResponseSchema>;
