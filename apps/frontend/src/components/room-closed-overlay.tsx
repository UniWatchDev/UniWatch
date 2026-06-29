import {
  ROOM_EXIT_TONE_LABELS,
  getRoomExitToneStyle,
  type RoomExitTone
} from '@/components/room-exit-notice';

interface RoomClosedOverlayProps {
  message: string;
  title?: string;
  tone?: RoomExitTone;
}

export function RoomClosedOverlay({
  message,
  title,
  tone = 'closed'
}: RoomClosedOverlayProps) {
  const styles = getRoomExitToneStyle(tone);
  const Icon = styles.Icon;
  const heading = title ?? ROOM_EXIT_TONE_LABELS[tone];

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-6 backdrop-blur-sm animate-in fade-in duration-300 ${styles.overlayBackdrop}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="room-closed-title"
      aria-describedby="room-closed-description"
    >
      <div
        className={`flex max-w-md flex-col items-center gap-4 rounded-2xl border px-8 py-10 text-center animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ${styles.panel}`}
      >
        <div
          className={`flex size-16 items-center justify-center rounded-full border ${styles.iconWrap}`}
          aria-hidden="true"
        >
          <Icon className="size-8" />
        </div>

        <div>
          <p
            id="room-closed-title"
            className={`m-0 font-mono text-xs uppercase tracking-[0.24em] ${styles.kicker}`}
          >
            {heading}
          </p>
          <p id="room-closed-description" className={`mt-3 mb-0 text-lg font-semibold ${styles.message}`}>
            {message}
          </p>
          <p className={`mt-2 mb-0 text-sm ${styles.footer}`}>Returning you to the lobby…</p>
        </div>
      </div>
    </div>
  );
}
