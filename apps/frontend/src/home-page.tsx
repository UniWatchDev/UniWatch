import { Link } from 'react-router-dom';

import {
  STARTER_DECK,
  STARTER_EYEBROW,
  STARTER_HEADLINE,
  STARTER_NAME,
  STARTER_PITCH,
  STARTER_STATS
} from '@repo/consts/starter';

import { AuthPanel } from '@/auth-panel';
import { EndpointExplorer } from '@/endpoint-explorer';
import { HealthCheck } from '@/health-check';
import { PackageVerification } from '@/package-verification';

export default function HomePage() {
  return (
    <div className="relative flex h-dvh w-dvw overflow-hidden text-[color:var(--color-ink)]">
      <div className="ambient ambient-coral" />
      <div className="ambient ambient-violet" />
      <div className="ambient ambient-sky" />

      <main className="relative z-10 grid h-full w-full grid-cols-12 grid-rows-[auto_minmax(0,1.05fr)_minmax(0,1fr)_auto] gap-4 px-6 pb-4 pt-5">
        <header className="col-span-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-violet), var(--color-coral))'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor" />
              </svg>
            </span>
            <div>
              <p className="display text-[20px] font-bold leading-none">
                {STARTER_NAME}
              </p>
              <p className="mono text-[11px] uppercase tracking-wider text-[color:var(--color-mute)]">
                Vite 8 · React 19 · edition
              </p>
            </div>
          </div>
          <nav className="display flex items-baseline gap-6 text-[14px] font-medium text-[color:var(--color-mute)]">
            <Link
              className="hover:text-[color:var(--color-violet)]"
              to="/app"
            >
              app
            </Link>
            <a className="hover:text-[color:var(--color-violet)]" href="#docs">
              docs
            </a>
            <a
              className="hover:text-[color:var(--color-violet)]"
              href="#github"
            >
              github
            </a>
            <a
              className="hover:text-[color:var(--color-violet)]"
              href="#discord"
            >
              discord
            </a>
            <span className="rounded-full bg-gradient-to-r from-[color:var(--color-violet)] to-[color:var(--color-coral)] px-3.5 py-1 text-[12px] font-semibold text-white">
              v0.1
            </span>
          </nav>
        </header>

        <section className="fade-up glass col-span-7 col-start-1 row-start-2 flex min-h-0 flex-col overflow-hidden rounded-3xl px-7 py-6">
          <span className="gradient-border inline-flex w-fit rounded-full px-3 py-1">
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em]">
              ✦ {STARTER_EYEBROW}
            </span>
          </span>
          <h1 className="display mt-3 text-[clamp(44px,4.6vw,84px)] leading-[0.95]">
            <span className="block">Ship faster.</span>
            <span className="block">
              <span className="gradient-text italic">Agents</span> onboard.
            </span>
          </h1>
          <p className="mt-3 max-w-[48ch] text-[clamp(14px,1.15vw,18px)] leading-[1.45] text-[color:var(--color-mute)]">
            {STARTER_DECK}
          </p>
          <p className="sr-only">{STARTER_HEADLINE}</p>

          <ul className="mt-auto flex flex-wrap gap-2 pt-4">
            {STARTER_STATS.map((stat) => (
              <li
                key={stat.label}
                className="lift glass flex items-baseline gap-2 rounded-2xl px-4 py-2.5"
              >
                <span className="display text-[30px] font-bold leading-none">
                  {stat.value}
                  {'suffix' in stat && (
                    <span className="gradient-text text-[22px]">
                      {stat.suffix}
                    </span>
                  )}
                </span>
                <span className="mono text-[11px] uppercase tracking-wider text-[color:var(--color-mute)]">
                  {stat.label}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="fade-up glass col-span-5 col-start-8 row-start-2 flex min-h-0 flex-col rounded-3xl p-5"
          style={{ animationDelay: '80ms' }}
        >
          <PackageVerification />
        </section>

        <section
          className="fade-up glass col-span-7 col-start-1 row-start-3 flex min-h-0 flex-col rounded-3xl p-5"
          style={{ animationDelay: '160ms' }}
        >
          <EndpointExplorer />
        </section>

        <section
          className="fade-up glass col-span-5 col-start-8 row-start-3 flex min-h-0 flex-col rounded-3xl p-5"
          style={{ animationDelay: '240ms' }}
        >
          <p className="mono mb-3 text-[12px] leading-relaxed text-[color:var(--color-mute)]">
            Full-page auth flows:{' '}
            <Link to="/login" className="text-[color:var(--color-violet)]">
              /login
            </Link>
            ,{' '}
            <Link to="/register" className="text-[color:var(--color-violet)]">
              /register
            </Link>
            .
          </p>
          <AuthPanel />
        </section>

        <footer className="col-span-12 row-start-4 grid grid-cols-4 gap-3">
          <div className="col-span-1">
            <HealthCheck />
          </div>
          {STARTER_PITCH.map((p, i) => (
            <div
              key={p.title}
              className="lift glass fade-up rounded-2xl px-5 py-3.5"
              style={{ animationDelay: `${String(300 + i * 80)}ms` }}
            >
              <p className="display text-[13px] font-semibold uppercase tracking-wider text-[color:var(--color-violet)]">
                {p.title}
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-[color:var(--color-mute)]">
                {p.body}
              </p>
            </div>
          ))}
        </footer>
      </main>
    </div>
  );
}
