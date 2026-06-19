import type { RoomStatus } from '@repo/schemas/rooms';

/** Labels and badge styling shared by the lobby cards and the in-room header. */
export const ROOM_STATUS_DISPLAY: Record<RoomStatus, { label: string; className: string }> = {
  waiting: {
    label: 'WAITING',
    className:
      'border-amber-500/40 bg-amber-500/20 font-mono text-[10px] tracking-widest text-amber-400',
  },
  ready: {
    label: 'READY TO WATCH',
    className:
      'border-emerald-500/40 bg-emerald-500/20 font-mono text-[10px] tracking-widest text-emerald-400',
  },
  watching: {
    label: '● LIVE',
    className:
      'border-red-500/40 bg-red-500/20 font-mono text-[10px] tracking-widest text-red-400',
  },
};

/** Short label for compact surfaces (e.g. video player chrome). */
export function roomStatusShortLabel(status: RoomStatus): string {
  switch (status) {
    case 'watching':
      return 'LIVE';
    case 'ready':
      return 'READY';
    case 'waiting':
      return 'WAITING';
  }
}
