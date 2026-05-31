// Stable palette assigned to users for the duration of a room session.
export const ROOM_COLORS = [
  '#f97316', // orange
  '#38bdf8', // sky
  '#a78bfa', // violet
  '#4ade80', // green
  '#fb923c', // amber
  '#f472b6', // pink
  '#34d399', // emerald
  '#60a5fa', // blue
  '#fbbf24', // yellow
  '#e879f9' // fuchsia
] as const satisfies readonly string[];

// Fallback color when a user's assigned color cannot be resolved.
export const DEFAULT_USER_COLOR = '#64748b';
