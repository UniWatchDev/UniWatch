import { Ban, DoorClosed, UserX } from 'lucide-react';

interface RoomClosedOverlayProps {
  message: string;
}

function overlayContext(message: string): { title: string; Icon: typeof DoorClosed } {
  if (message.includes('kicked')) return { title: 'Kicked from room', Icon: UserX };
  if (message.includes('blocked')) return { title: 'Blocked from room', Icon: Ban };
  return { title: 'Room closed', Icon: DoorClosed };
}

export function RoomClosedOverlay({ message }: RoomClosedOverlayProps) {
  const { title, Icon } = overlayContext(message);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm animate-in fade-in duration-300"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="room-closed-title"
      aria-describedby="room-closed-description"
    >
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-8 py-10 text-center shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div
          className="flex size-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-100"
          aria-hidden="true"
        >
          <Icon className="size-8" />
        </div>

        <div>
          <p
            id="room-closed-title"
            className="m-0 font-mono text-xs uppercase tracking-[0.24em] text-amber-200/70"
          >
            {title}
          </p>
          <p id="room-closed-description" className="mt-3 mb-0 text-lg font-semibold text-white">
            {message}
          </p>
          <p className="mt-2 mb-0 text-sm text-white/65">Returning you to the lobby…</p>
        </div>
      </div>
    </div>
  );
}
