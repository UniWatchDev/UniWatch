import { X } from 'lucide-react';

import {
  ROOM_EXIT_TONE_LABELS,
  getRoomExitToneStyle,
  type RoomExitTone
} from '@/components/room-exit-notice';

interface RoomClosedLobbyNoticeProps {
  title?: string;
  message: string;
  tone?: RoomExitTone;
  onDismiss: () => void;
}

export function RoomClosedLobbyNotice({
  title,
  message,
  tone = 'closed',
  onDismiss
}: RoomClosedLobbyNoticeProps) {
  const styles = getRoomExitToneStyle(tone);
  const Icon = styles.Icon;
  const heading = title ?? ROOM_EXIT_TONE_LABELS[tone];

  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3.5 animate-in slide-in-from-top-2 fade-in duration-300 ${styles.lobbyPanel}`}
      role="status"
      aria-live={tone === 'banned' ? 'assertive' : 'polite'}
    >
      <div
        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border ${styles.lobbyIconWrap}${tone === 'banned' ? ' animate-pulse' : ''}`}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`m-0 font-mono text-[11px] uppercase tracking-[0.18em] ${styles.lobbyKicker}`}>
          {heading}
        </p>
        <p className={`mt-1 mb-0 text-sm leading-relaxed font-medium ${styles.lobbyMessage}`}>
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
        aria-label="Dismiss notice"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
