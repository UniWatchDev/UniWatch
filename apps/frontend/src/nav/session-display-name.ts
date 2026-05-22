import {
  firstNameFromEmail,
  getStoredFirstName
} from '@/auth/profile-local';
import type { LoginResponse } from '@repo/schemas/auth';

export function sessionDisplayName(user: LoginResponse): string {
  const trimmed = user.firstName.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  const stored = getStoredFirstName();
  if (stored.length > 0) {
    return stored;
  }
  return firstNameFromEmail(user.email);
}
