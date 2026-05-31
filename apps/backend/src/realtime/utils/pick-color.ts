import { ROOM_COLORS } from '@/realtime/realtime.consts';

/** Pick a palette color, preferring one not already in use within the room. */
export function pickColor(usedColors: ReadonlySet<string>): string {
  const available = ROOM_COLORS.filter((c) => !usedColors.has(c));
  const pool = available.length > 0 ? available : [...ROOM_COLORS];
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? ROOM_COLORS[0];
}
