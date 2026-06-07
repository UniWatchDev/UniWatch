import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, MessageSquare, Zap } from 'lucide-react';

import { useCookieAuth } from '@/auth/use-cookie-auth';
import { StarField } from '@/components/star-field';
import { useTheme } from '@/theme/use-theme';
import { ThemeToggle } from '@/theme/theme-toggle';

const FEATURES = [
  {
    icon: Play,
    title: 'Create a Room',
    desc: 'Upload any video and host a private screening for your crew.',
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    desc: 'React, laugh, and talk in real time — everyone on the same moment.',
  },
  {
    icon: Zap,
    title: 'Perfect Sync',
    desc: 'Frame-perfect playback so nobody is a second ahead or behind.',
  },
] as const;

export function LandingPage() {
  const { sessionUser, authInitialized } = useCookieAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    if (authInitialized && sessionUser !== null) {
      void navigate('/rooms', { replace: true });
    }
  }, [authInitialized, sessionUser, navigate]);

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Background stars */}
      <div className="pointer-events-none absolute inset-0">
        <StarField titleVisible={false} />
      </div>

      {/* Ambient glow blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: theme === 'dark'
            ? `
              radial-gradient(ellipse at 20% 40%, rgba(245,158,11,0.08) 0%, transparent 55%),
              radial-gradient(ellipse at 80% 20%, rgba(249,115,22,0.06) 0%, transparent 50%),
              radial-gradient(ellipse at 55% 80%, rgba(245,158,11,0.05) 0%, transparent 45%)
            `
            : `
              radial-gradient(ellipse at 20% 40%, rgba(65,90,119,0.10) 0%, transparent 55%),
              radial-gradient(ellipse at 80% 20%, rgba(119,141,169,0.08) 0%, transparent 50%),
              radial-gradient(ellipse at 55% 80%, rgba(27,38,59,0.06) 0%, transparent 45%)
            `,
        }}
      />

      {/* Top bar */}
      <header
        className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10"
        style={{ flexShrink: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 9,
              background: theme === 'dark'
                ? 'linear-gradient(135deg, #d97706, #f59e0b)'
                : 'linear-gradient(135deg, #1b263b, #415a77)',
              boxShadow: '0 4px 16px var(--accent-glow)',
              flexShrink: 0,
            }}
            aria-hidden
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 10l4.553-2.526A1 1 0 0121 8.382v7.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span
            className="display"
            style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Uni-Watch
          </span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggle />
          <Link to="/login" className="btn-ghost navbar-link" style={{ fontSize: 13 }}>
            Sign In
          </Link>
          <Link to="/register" className="btn-primary navbar-link" style={{ fontSize: 13 }}>
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10 text-center sm:px-10">
        <div className="fade-up" style={{ animationDelay: '0ms' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 20,
              fontFamily: 'var(--font-mono)',
            }}
          >
            ✦ The co-watching platform
          </p>
        </div>

        <div className="fade-up" style={{ animationDelay: '80ms' }}>
          <h1
            className="display title-glow"
            style={{
              fontSize: 'clamp(48px, 9vw, 96px)',
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: '0 0 20px',
            }}
          >
            Uni<span className="gradient-text">Watch</span>
          </h1>
        </div>

        <div className="fade-up" style={{ animationDelay: '160ms' }}>
          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 19px)',
              color: 'var(--text-secondary)',
              maxWidth: 480,
              lineHeight: 1.65,
              margin: '0 auto 36px',
            }}
          >
            Watch any video perfectly in sync with your friends — live chat,
            shared reactions, and rooms that feel like the same couch.
          </p>
        </div>

        <div
          className="fade-up"
          style={{
            animationDelay: '240ms',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
          }}
        >
          <Link
            to="/register"
            className="btn-primary"
            style={{ fontSize: 15, padding: '12px 28px', gap: 8 }}
          >
            <Play size={15} fill="currentColor" />
            Start Watching
          </Link>
          <Link
            to="/login"
            className="btn-ghost"
            style={{ fontSize: 15, padding: '12px 28px' }}
          >
            Sign In
          </Link>
        </div>

        {/* Social proof hint */}
        <div className="fade-up" style={{ animationDelay: '320ms', marginTop: 28 }}>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              letterSpacing: '0.02em',
            }}
          >
            Free to use · No credit card required
          </p>
        </div>
      </main>

      {/* Feature strip */}
      <div
        className="relative z-10 fade-up"
        style={{
          animationDelay: '400ms',
          padding: '0 24px 36px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '16px 18px',
                borderRadius: 12,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--accent)',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Icon size={15} />
              </span>
              <div>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: 13,
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
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.55,
                  }}
                >
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
