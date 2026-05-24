const AVATAR_PALETTE = [
  '#f97316',
  '#38bdf8',
  '#a78bfa',
  '#4ade80',
  '#fb7185',
  '#fbbf24',
  '#c4b5fd',
  '#34d399',
  '#60a5fa',
  '#f472b6'
] as const;

export function hashUserIdToColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index] ?? AVATAR_PALETTE[0];
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0];
  if (first === undefined) return '?';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const second = parts[1];
  const a = first[0] ?? '';
  const b = second?.[0] ?? '';
  return `${a}${b}`.toUpperCase();
}
