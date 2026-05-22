import { MOCK_PROFILE_BADGE } from '@/data/mock-profile-data';
import type { ProfileIdentity } from '@/types/profile';
import { initialsFromName } from '@/utils/avatar-color';

import { formatMemberSince } from '@/profile/format-member-since';

type ProfileSource = {
  userId: string;
  userName: string;
  firstName: string;
  lastName?: string | undefined;
  avatarId: string;
  createdAt: string;
  email?: string | undefined;
};

export function buildProfileIdentity(source: ProfileSource): ProfileIdentity {
  const displayName =
    [source.firstName.trim(), source.lastName?.trim()].filter(Boolean).join(' ') ||
    source.userName;
  return {
    displayName,
    handle: `@${source.userName}`,
    initials: initialsFromName(displayName),
    avatarColor: '#7c3aed',
    avatarId: source.avatarId,
    email: source.email ?? '',
    memberSince: formatMemberSince(source.createdAt),
    badge: MOCK_PROFILE_BADGE
  };
}
