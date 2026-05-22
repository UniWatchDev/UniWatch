import type { LoginResponse } from '@repo/schemas/auth';

import {
  MOCK_MEMBER_SINCE,
  MOCK_PROFILE_BADGE
} from '@/data/mock-profile-data';
import type { ProfileIdentity } from '@/types/profile';
import { hashUserIdToColor, initialsFromName } from '@/utils/avatar-color';

export function buildProfileIdentity(user: LoginResponse): ProfileIdentity {
  const displayName =
    [user.firstName.trim(), user.lastName?.trim()].filter(Boolean).join(' ') ||
    user.userName;
  return {
    displayName,
    handle: `@${user.userName}`,
    initials: initialsFromName(displayName),
    avatarColor: hashUserIdToColor(user.userId),
    email: user.email,
    memberSince: MOCK_MEMBER_SINCE,
    badge: MOCK_PROFILE_BADGE
  };
}
