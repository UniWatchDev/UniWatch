import { useState, useEffect } from 'react';
import type { Member } from '@/types/room';
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';

interface CountdownOverlayProps {
  members: Member[];
  onComplete: () => void;
}

const STEPS = ['3', '2', '1', '🎬'] as const;
type Step = (typeof STEPS)[number];

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function CountdownOverlay({ members, onComplete }: CountdownOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (stepIndex >= STEPS.length) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setStepIndex((s) => s + 1);
      setAnimKey((k) => k + 1);
    }, 1000);

    return () => { clearTimeout(timer); };
  }, [stepIndex, onComplete]);

  const digit: Step = STEPS[stepIndex] ?? '🎬';
  const isFinal = digit === '🎬';

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'rgba(8, 8, 20, 0.9)',
        backdropFilter: 'blur(12px)',
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
        key={animKey}
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
