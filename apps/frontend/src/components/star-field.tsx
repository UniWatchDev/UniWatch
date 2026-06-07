import { useMemo } from 'react';

import { useTheme } from '@/theme/use-theme';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  dur: number;
  delay: number;
  variant: 'a' | 'b';
  shape: 'dot' | 'cross' | 'sparkle';
}

const SHOOTING_STARS = [
  { id: 0, x: 5,  y: -5, width: 130, dur: 7.0, delay: 1.0, angle: 35, dist: 700 },
  { id: 1, x: 45, y:  3, width: 100, dur: 8.0, delay: 3.5, angle: 42, dist: 600 },
  { id: 2, x: 70, y: -8, width: 150, dur: 6.0, delay: 7.0, angle: 38, dist: 650 },
  { id: 3, x: 20, y: 10, width: 110, dur: 9.0, delay: 0.0, angle: 40, dist: 580 },
  { id: 4, x: 85, y:  5, width:  90, dur: 7.0, delay: 5.2, angle: 45, dist: 620 },
  { id: 5, x: 55, y: -3, width: 120, dur: 8.0, delay: 2.1, angle: 36, dist: 680 },
] as const;

function SparkleShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
      <path d="M10 0 L11 9 L20 10 L11 11 L10 20 L9 11 L0 10 L9 9 Z" />
    </svg>
  );
}

function CrossShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
      <rect x="8" y="0" width="4" height="20" rx="2" />
      <rect x="0" y="8" width="20" height="4" rx="2" />
    </svg>
  );
}

export function StarField({ titleVisible = true }: { titleVisible?: boolean }) {
  const stars = useMemo<Star[]>(() => {
    const count = 22;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (Math.sin(i * 2.4) * 50 + 50),
      y: (Math.cos(i * 1.7) * 40 + 50),
      size: 6 + (i % 4) * 3,
      dur: 1.6 + (i % 5) * 0.5,
      delay: (i % 7) * 0.3,
      variant: i % 3 === 0 ? 'b' : 'a',
      shape: i % 3 === 0 ? 'sparkle' : i % 3 === 1 ? 'cross' : 'dot',
    }));
  }, []);

  const { theme } = useTheme();
  const colors = theme === 'dark'
    ? ['#f59e0b', '#fbbf24', '#fb923c', '#d97706', '#fde68a']
    : ['#415a77', '#778da9', '#1b263b', '#415a77', '#778da9'];

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 16px 24px',
        overflow: 'visible',
      }}
    >
      {/* Stars container */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        {SHOOTING_STARS.map((s) => (
          <span
            key={`shooting-${String(s.id)}`}
            className="shooting-star"
            style={
              {
                left: `${String(s.x)}%`,
                top: `${String(s.y)}%`,
                width: s.width,
                '--shoot-dur': `${String(s.dur)}s`,
                '--shoot-delay': `${String(s.delay)}s`,
                '--shoot-angle': `${String(s.angle)}deg`,
                '--shoot-dist': `${String(s.dist)}px`,
              } as React.CSSProperties
            }
          />
        ))}
        {stars.map((s) => {
          const color = colors[s.id % colors.length] ?? '#8b5cf6';
          return (
            <span
              key={s.id}
              className={`star ${s.variant === 'b' ? 'star-b' : ''}`}
              style={
                {
                  left: `${String(s.x)}%`,
                  top: `${String(s.y)}%`,
                  '--dur': `${String(s.dur)}s`,
                  '--delay': `${String(s.delay)}s`,
                } as React.CSSProperties
              }
            >
              {s.shape === 'dot' && (
                <span
                  style={{
                    display: 'block',
                    width: s.size,
                    height: s.size,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 ${String(s.size * 2)}px ${color}`,
                  }}
                />
              )}
              {s.shape === 'cross' && <CrossShape size={s.size + 2} color={color} />}
              {s.shape === 'sparkle' && <SparkleShape size={s.size + 4} color={color} />}
            </span>
          );
        })}
      </div>

      {/* Title */}
      {titleVisible && (
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--accent-hover)',
              marginBottom: 12,
            }}
          >
            ✦ The co-watching platform
          </p>
          <h1
            className="display title-glow"
            style={{
              fontSize: 'clamp(36px, 6vw, 72px)',
              fontWeight: 900,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Uni
            <span className="gradient-text">Watch</span>
          </h1>
          <p
            style={{
              marginTop: 12,
              fontSize: 'clamp(13px, 1.4vw, 16px)',
              color: 'var(--text-secondary)',
              maxWidth: 420,
              lineHeight: 1.6,
            }}
          >
            Watch any video perfectly in sync with your friends - live chat, shared reactions, and rooms
            that feel like being on the same couch.
          </p>
        </div>
      )}
    </div>
  );
}
