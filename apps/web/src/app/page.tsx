import {
  STARTER_BYLINE,
  STARTER_DECK,
  STARTER_EDITION,
  STARTER_EYEBROW,
  STARTER_HEADLINE,
  STARTER_ISSUE,
  STARTER_ISSUE_DATE,
  STARTER_LEDE,
  STARTER_NAME,
  STARTER_PITCH,
  STARTER_PUBLICATION,
  STARTER_STATS,
  STARTER_VOLUME
} from '@repo/consts/starter';

import { EndpointExplorer } from './endpoint-explorer';
import { HealthCheck } from './health-check';
import { NotesPanel } from './notes-panel';
import { PackageVerification } from './package-verification';

export default function Home() {
  return (
    <main className="grid h-dvh w-dvw grid-cols-12 grid-rows-[auto_minmax(0,1.5fr)_minmax(0,1fr)_auto] gap-x-10 gap-y-4 overflow-hidden bg-[color:var(--color-paper)] px-14 pb-4 pt-4 text-[color:var(--color-ink)]">
      {/* Masthead — col-span-12 */}
      <header className="col-span-12 flex items-baseline justify-between border-b border-[color:var(--color-ink)] pb-3">
        <div className="flex items-baseline gap-4">
          <span className="serif text-[30px] italic leading-none">
            {STARTER_NAME}
          </span>
          <span className="mono small-caps text-[12px] text-[color:var(--color-mute)]">
            {STARTER_PUBLICATION}
          </span>
        </div>
        <div className="mono small-caps flex items-baseline gap-6 text-[12px] text-[color:var(--color-mute)]">
          <span>{STARTER_VOLUME}</span>
          <span>{STARTER_ISSUE}</span>
          <span>{STARTER_ISSUE_DATE}</span>
          <span className="text-[color:var(--color-accent)]">
            {STARTER_EDITION}
          </span>
        </div>
      </header>

      {/* Hero — cols 1-7 */}
      <article className="fade-up col-span-7 col-start-1 row-start-2 flex min-h-0 flex-col justify-between overflow-hidden">
        <div>
          <p className="mono small-caps text-[13px] text-[color:var(--color-accent)]">
            {STARTER_EYEBROW}
          </p>
          <h1 className="serif mt-3 text-[clamp(52px,5.2vw,92px)] italic leading-[0.92] tracking-[-0.025em]">
            <span className="block">Ship faster.</span>
            <span className="block">Agents onboard.</span>
            <span className="sr-only">{STARTER_HEADLINE}</span>
          </h1>
          <p className="serif-text mt-4 max-w-[42ch] text-[clamp(17px,1.45vw,22px)] leading-[1.3] text-[color:var(--color-ink)]">
            {STARTER_DECK}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-[color:var(--color-rule)]" />
          <span className="mono small-caps text-[10px] text-[color:var(--color-mute)]">
            The full story
          </span>
          <span className="h-px flex-1 bg-[color:var(--color-rule)]" />
        </div>
        <div className="max-w-[64ch]">
          <p className="drop-cap serif-text text-[clamp(14px,1.1vw,17px)] leading-[1.55] text-[color:var(--color-ink)]">
            {STARTER_LEDE}
          </p>
          <p className="mono small-caps mt-2 text-[10px] text-[color:var(--color-mute)]">
            {STARTER_BYLINE}
          </p>
        </div>
      </article>

      {/* Stats + Package verification — cols 8-12 */}
      <aside className="col-span-5 col-start-8 row-start-2 flex min-h-0 flex-col gap-5 overflow-hidden border-l border-[color:var(--color-rule)] pl-8">
        <div>
          <p className="mono small-caps text-[12px] text-[color:var(--color-accent)]">
            / By the numbers
          </p>
          <div className="mt-2 h-px w-full origin-left bg-[color:var(--color-ink)] rule-draw" />
          <ul className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
            {STARTER_STATS.map((stat, i) => (
              <li
                key={stat.label}
                className="fade-up flex items-baseline gap-2 border-b border-dotted border-[color:var(--color-rule)] pb-2"
                style={{ animationDelay: `${String(i * 80)}ms` }}
              >
                <span className="mono text-[56px] leading-[0.9] tracking-tight text-[color:var(--color-ink)]">
                  {stat.value}
                  {'suffix' in stat && (
                    <span className="mono text-[24px] text-[color:var(--color-accent)]">
                      {stat.suffix}
                    </span>
                  )}
                </span>
                <div className="ml-auto flex flex-col items-end text-right">
                  <span className="mono small-caps text-[11px] text-[color:var(--color-mute)]">
                    {stat.label}
                  </span>
                  <span className="mono text-[10px] text-[color:var(--color-accent)]">
                    /{stat.kicker}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <PackageVerification />
        </div>
      </aside>

      {/* Lower row: endpoint explorer + notes */}
      <section className="col-span-7 col-start-1 row-start-3 flex min-h-0 flex-col border-t-2 border-[color:var(--color-ink)] pt-3">
        <EndpointExplorer />
      </section>

      <section className="col-span-5 col-start-8 row-start-3 flex min-h-0 flex-col border-t-2 border-[color:var(--color-ink)] pt-3">
        <NotesPanel />
      </section>

      {/* Footer strip */}
      <footer className="col-span-12 row-start-4 flex items-baseline gap-6 border-t border-[color:var(--color-rule)] pt-3">
        <div className="w-52 shrink-0">
          <HealthCheck />
        </div>
        <ul className="flex flex-1 gap-6">
          {STARTER_PITCH.map((p) => (
            <li
              key={p.title}
              className="flex-1 border-l border-[color:var(--color-rule)] pl-4"
            >
              <p className="mono small-caps text-[11px] text-[color:var(--color-accent)]">
                {p.title}
              </p>
              <p className="serif-text mt-1 text-[13px] italic leading-snug text-[color:var(--color-mute)]">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      </footer>
    </main>
  );
}
