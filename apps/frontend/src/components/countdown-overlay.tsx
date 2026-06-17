import { useEffect, useState } from 'react';
import type { Member } from '@/types/room';
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';

interface CountdownOverlayProps {
  members: Member[];
  endsAt: string | null;
  onComplete: () => void;
}

const STEPS = ['3', '2', '1', '🎬'] as const;
type Step = (typeof STEPS)[number];
const TICK_MS = 250;

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getStepIndex(endsAt: string | null, nowMs: number): number {
  if (endsAt === null) return 0;
  const remainingMs = new Date(endsAt).getTime() - nowMs;
  if (!Number.isFinite(remainingMs)) return 0;
  if (remainingMs <= 0) return STEPS.length;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  return Math.min(STEPS.length - 1, Math.max(0, 3 - remainingSeconds));
}

export function CountdownOverlay({ members, endsAt, onComplete }: CountdownOverlayProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, TICK_MS);

    return () => { clearInterval(timer); };
  }, [endsAt]);

  const stepIndex = getStepIndex(endsAt, nowMs);
  const hasEnded = endsAt !== null && stepIndex >= STEPS.length;

  useEffect(() => {
    if (hasEnded) {
      onComplete();
    }
  }, [hasEnded, onComplete]);

  const digit: Step = STEPS[stepIndex] ?? '🎬';
  const isFinal = digit === '🎬';

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'rgba(12, 9, 6, 0.92)',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'none'
      }}
    >
      {!isFinal && (
        <p
          className="mb-4 font-mono text-xs uppercase tracking-[0.3em]"
          style={{ color: 'var(--text-muted)' }}
        >
          Starting in
        </p>
      )}

      <div
        key={digit}
        className="countdown-digit mb-6 select-none"
        style={{
          fontSize: isFinal ? 72 : 112,
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          lineHeight: 1,
          color: isFinal ? '#fb923c' : '#ffffff',
          textShadow: isFinal
            ? '0 0 60px rgba(249,115,22,0.5)'
            : '0 0 40px rgba(255,255,255,0.15)',
        }}
      >
        {digit}
      </div>

      {members.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <AvatarGroup>
            {members.slice(0, 5).map((member) => (
              <Avatar key={member.id} size="default">
                <AvatarFallback
                  className="text-xs font-bold text-white"
                  style={{ background: member.avatarColor }}
                >
                  {initials(member.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {members.length > 5 && (
              <AvatarGroupCount className="text-xs" style={{ color: 'var(--text-muted)' }}>
                +{members.length - 5}
              </AvatarGroupCount>
            )}
          </AvatarGroup>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {members.length} {members.length === 1 ? 'viewer' : 'viewers'} ready
          </p>
        </div>
      )}
    </div>
  );
}
