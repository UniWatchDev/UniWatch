const UNIT_MS = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000
} as const;

/**
 * Parses a compact duration like `15m`, `7d`, `1h` into milliseconds.
 * Falls back to 15 minutes if the string does not match.
 */
export function parseDurationToMs(input: string): number {
  const m = /^(\d+)([smhd])$/i.exec(input.trim());
  if (!m) {
    return 15 * UNIT_MS.m;
  }
  const amount = m[1];
  const unitRaw = m[2];
  if (amount === undefined || unitRaw === undefined) {
    return 15 * UNIT_MS.m;
  }
  const n = Number(amount);
  const unit = unitRaw.toLowerCase() as keyof typeof UNIT_MS;
  if (!Number.isFinite(n) || n < 1) {
    return 15 * UNIT_MS.m;
  }
  return n * UNIT_MS[unit];
}
