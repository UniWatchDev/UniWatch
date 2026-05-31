export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export function getEmailVerificationCode(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const debug = value['debug'];
  if (!isRecord(debug)) {
    return undefined;
  }
  const code = debug['emailVerificationCode'];
  return typeof code === 'string' ? code : undefined;
}

export function getPasswordResetToken(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const debug = value['debug'];
  if (!isRecord(debug)) {
    return undefined;
  }
  const token = debug['passwordResetToken'];
  return typeof token === 'string' ? token : undefined;
}

export function formatErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export function formatFetchError(err: unknown): string {
  if (err instanceof TypeError) {
    return 'Backend unavailable — ensure `pnpm dev` is running and port 3000 is up.';
  }
  return formatErr(err);
}

export async function readHttpErrorMessage(response: Response): Promise<string> {
  const raw = await response.text();
  if (raw.length === 0) {
    return `HTTP ${String(response.status)}`;
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (
      data !== null &&
      typeof data === 'object' &&
      'detail' in data &&
      typeof (data as { detail: unknown }).detail === 'string'
    ) {
      return (data as { detail: string }).detail;
    }
  } catch {
    /* ignore */
  }
  return `HTTP ${String(response.status)}`;
}
