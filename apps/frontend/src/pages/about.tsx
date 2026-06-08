import { Film, Users, Zap, Heart } from 'lucide-react';

const PILLARS = [
  {
    icon: Film,
    title: 'Built for film lovers',
    body: 'We believe watching together is better than watching alone. Uni-Watch makes that possible no matter the distance.',
  },
  {
    icon: Zap,
    title: 'Frame-perfect sync',
    body: 'Our synchronization engine keeps every viewer on the exact same frame. No drift, no spoilers.',
  },
  {
    icon: Users,
    title: 'Made for your crew',
    body: "Whether it's two people or twenty, Uni-Watch rooms scale effortlessly and stay intimate.",
  },
  {
    icon: Heart,
    title: 'Always free to use',
    body: 'Core co-watching is free forever. We grow sustainably, never by selling your data.',
  },
] as const;

const TEAM = [
  { name: 'Moriel T.', role: 'Founder & CEO', initials: 'MT' },
  { name: 'Alex R.', role: 'Head of Engineering', initials: 'AR' },
  { name: 'Sofia K.', role: 'Product Design', initials: 'SK' },
  { name: 'James L.', role: 'Backend Infrastructure', initials: 'JL' },
] as const;

export function AboutPage() {
  return (
    <div
      className="relative flex flex-col"
      style={{ background: 'var(--bg-primary)', minHeight: 'calc(100dvh - 56px)' }}
    >
      {/* Ambient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 15% 25%, rgba(65,90,119,0.09) 0%, transparent 50%),
            radial-gradient(ellipse at 85% 70%, rgba(119,141,169,0.07) 0%, transparent 45%)
          `,
        }}
      />

      <div
        className="relative z-10 mx-auto w-full"
        style={{ maxWidth: 820, padding: '56px 24px 80px' }}
      >
        {/* Header */}
        <div className="fade-up" style={{ animationDelay: '0ms', marginBottom: 48 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 14,
              fontFamily: 'var(--font-mono)',
            }}
          >
            ✦ Our story
          </p>
          <h1
            className="display"
            style={{
              fontSize: 'clamp(36px, 6vw, 60px)',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: '0 0 20px',
            }}
          >
            Watching together,<br />
            <span
              style={{
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--text-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              wherever you are.
            </span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              maxWidth: 600,
            }}
          >
            Uni-Watch started with a simple idea: distance shouldn&apos;t stop friends from
            sharing a movie night. We built the platform we always wanted &mdash; one that
            feels like the same couch, even across continents.
          </p>
        </div>

        {/* Pillars */}
        <div
          className="fade-up"
          style={{
            animationDelay: '100ms',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
            marginBottom: 56,
          }}
        >
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              style={{
                padding: '20px 22px',
                borderRadius: 14,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--accent)',
                  marginBottom: 14,
                }}
              >
                <Icon size={16} />
              </span>
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {title}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* Mission statement */}
        <div
          className="fade-up"
          style={{
            animationDelay: '180ms',
            padding: '28px 32px',
            borderRadius: 16,
            border: '1px solid var(--border-medium)',
            background: 'var(--bg-elevated)',
            marginBottom: 56,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 12,
              fontFamily: 'var(--font-mono)',
            }}
          >
            Our mission
          </p>
          <p
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.65,
              margin: 0,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.01em',
            }}
          >
            &ldquo;To make watching together feel effortless &mdash; regardless of geography,
            timezone, or connection speed. Every feature we build is in service of
            the moment two people press play at the same time.&rdquo;
          </p>
        </div>

        {/* Team */}
        <div className="fade-up" style={{ animationDelay: '260ms' }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 20,
              fontFamily: 'var(--font-display)',
            }}
          >
            The team
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {TEAM.map(({ name, role, initials }) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--text-secondary) 100%)',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: 'var(--font-display)',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </span>
                <div>
                  <p
                    style={{
                      margin: '0 0 2px',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {name}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
