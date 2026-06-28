import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export function RoomVideoStageOverlay({
  icon: Icon,
  eyebrow,
  title,
  description,
  loading = false,
  badge,
  footer,
  interactiveFooter = false,
  ariaLive = 'polite',
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string | undefined;
  loading?: boolean;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  interactiveFooter?: boolean;
  ariaLive?: 'polite' | 'assertive';
}) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-linear-to-b from-black/35 via-black/55 to-black/75 px-6 text-center pointer-events-none"
      aria-live={ariaLive}
    >
      <div className="flex max-w-md flex-col items-center gap-4">
        <div
          className="flex size-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_0_32px_rgba(255,255,255,0.08)]"
          aria-hidden="true"
        >
          {loading ? <Loader2 className="size-7 animate-spin" /> : <Icon className="size-7" />}
        </div>

        <p className="m-0 font-mono text-xs uppercase tracking-[0.24em] text-white/55">{eyebrow}</p>
        <p className="m-0 text-lg font-semibold text-white">{title}</p>

        {description != null && description.length > 0 && (
          <p className="m-0 max-w-sm text-sm leading-relaxed text-white/75">{description}</p>
        )}

        {badge}

        {footer != null && (
          <div className={`w-full max-w-sm${interactiveFooter ? ' pointer-events-auto' : ''}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
