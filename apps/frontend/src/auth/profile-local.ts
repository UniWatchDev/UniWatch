const FIRST_NAME_KEY = 'uniwatch.profile.firstName';
const LOGIN_COUNT_KEY = 'uniwatch.auth.successfulLoginCount';

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

/** First segment of the email local-part, title-cased (fallback when no display name). */
export function firstNameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() ?? 'there';
  const raw = local.split(/[._-]/)[0] ?? local;
  if (raw.length === 0) return 'there';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Store the greeting first name (from registration or API user profile). */
export function rememberFirstNameFromRegistration(firstName: string, email: string): void {
  const t = firstName.trim();
  if (t.length > 0) {
    writeKey(
      FIRST_NAME_KEY,
      t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
    );
  } else {
    writeKey(FIRST_NAME_KEY, firstNameFromEmail(email));
  }
}

/** Increment successful login count; returns which greeting to show for this login. */
export function recordLoginForGreeting(): 'hi' | 'welcome' {
  const c = Number(readKey(LOGIN_COUNT_KEY) ?? '0');
  const variant: 'hi' | 'welcome' = c === 0 ? 'hi' : 'welcome';
  writeKey(LOGIN_COUNT_KEY, String(c + 1));
  return variant;
}

/** Greeting while signed in (after refresh): first login session uses Hi until a second login occurs. */
export function getNavGreetingVariant(): 'hi' | 'welcome' {
  const n = Number(readKey(LOGIN_COUNT_KEY) ?? '0');
  return n <= 1 ? 'hi' : 'welcome';
}

export function getStoredFirstName(): string {
  return readKey(FIRST_NAME_KEY)?.trim() ?? '';
}
