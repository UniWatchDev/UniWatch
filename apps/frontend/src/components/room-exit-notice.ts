import type { LucideIcon } from 'lucide-react';
import { Ban, DoorClosed, UserX } from 'lucide-react';

export type RoomExitTone = 'closed' | 'kicked' | 'banned';

export const ROOM_EXIT_TONE_LABELS: Record<RoomExitTone, string> = {
  closed: 'Room closed',
  kicked: 'Removed from room',
  banned: 'Banned from room'
};

interface RoomExitToneStyle {
  overlayBackdrop: string;
  panel: string;
  iconWrap: string;
  kicker: string;
  message: string;
  footer: string;
  lobbyPanel: string;
  lobbyIconWrap: string;
  lobbyKicker: string;
  lobbyMessage: string;
  Icon: LucideIcon;
}

const TONE_STYLES: Record<RoomExitTone, RoomExitToneStyle> = {
  closed: {
    overlayBackdrop: 'bg-black/70',
    panel: 'border-amber-500/25 bg-amber-500/10 shadow-2xl',
    iconWrap: 'border-amber-500/30 bg-amber-500/15 text-amber-100',
    kicker: 'text-amber-200/70',
    message: 'text-white',
    footer: 'text-white/65',
    lobbyPanel: 'border-amber-500/25 bg-amber-500/10',
    lobbyIconWrap: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-200',
    lobbyKicker: 'text-amber-800/70 dark:text-amber-200/70',
    lobbyMessage: 'text-muted-foreground',
    Icon: DoorClosed
  },
  kicked: {
    overlayBackdrop: 'bg-black/70',
    panel: 'border-amber-500/30 bg-amber-500/12 shadow-2xl',
    iconWrap: 'border-amber-500/35 bg-amber-500/18 text-amber-50',
    kicker: 'text-amber-100/80',
    message: 'text-white',
    footer: 'text-white/70',
    lobbyPanel: 'border-amber-500/30 bg-amber-500/12',
    lobbyIconWrap: 'border-amber-500/35 bg-amber-500/18 text-amber-700 dark:text-amber-100',
    lobbyKicker: 'text-amber-900/75 dark:text-amber-100/80',
    lobbyMessage: 'text-muted-foreground',
    Icon: UserX
  },
  banned: {
    overlayBackdrop: 'bg-black/80',
    panel:
      'border-red-500/50 bg-red-950/95 shadow-2xl shadow-red-950/50 ring-2 ring-red-500/25',
    iconWrap: 'border-red-400/50 bg-red-500/25 text-red-50 animate-pulse',
    kicker: 'text-red-200/90',
    message: 'text-red-50',
    footer: 'text-red-100/75',
    lobbyPanel: 'border-red-500/40 bg-red-500/12 ring-1 ring-red-500/20',
    lobbyIconWrap: 'border-red-500/40 bg-red-500/20 text-red-600 dark:text-red-100',
    lobbyKicker: 'text-red-800 dark:text-red-200/90',
    lobbyMessage: 'text-red-900/85 dark:text-red-100/85',
    Icon: Ban
  }
};

export function getRoomExitToneStyle(tone: RoomExitTone): RoomExitToneStyle {
  return TONE_STYLES[tone];
}
