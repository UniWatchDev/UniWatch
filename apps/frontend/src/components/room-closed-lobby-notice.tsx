import { DoorClosed, X } from 'lucide-react';

interface RoomClosedLobbyNoticeProps {
  message: string;
  onDismiss: () => void;
}

export function RoomClosedLobbyNotice({ message, onDismiss }: RoomClosedLobbyNoticeProps) {
  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3.5 animate-in slide-in-from-top-2 fade-in duration-300"
      role="status"
      aria-live="polite"
    >
      <div
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-200"
        aria-hidden="true"
      >
        <DoorClosed className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-800/70 dark:text-amber-200/70">
          Room closed
        </p>
        <p className="mt-1 mb-0 text-sm leading-relaxed text-muted-foreground">{message}</p>
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
