import type { Achievement } from '@/types/profile';

export interface AchievementsPanelProps {
  readonly achievements: Achievement[];
}

const RARITY_COLORS: Record<Achievement['rarity'], string> = {
  common: 'var(--text-muted)',
  rare: '#38bdf8',
  epic: '#a78bfa'
};

function AchievementIcon({ icon }: { readonly icon: Achievement['icon'] }) {
  const paths: Record<Achievement['icon'], string> = {
    film: 'M15 10l4.553-2.526A1 1 0 0121 8.382v7.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
    users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 4V2h10v2M5 9H3M21 9h-2'
  };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={paths[icon]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AchievementsPanel({ achievements }: AchievementsPanelProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 14,
        padding: 20
      }}
    >
      {achievements.map((achievement) => (
        <article
          key={achievement.id}
          className="card-elevated fade-up"
          style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'var(--accent-dim)',
              color: 'var(--accent-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AchievementIcon icon={achievement.icon} />
          </div>
          <div>
            <p className="display" style={{ margin: 0, fontSize: 15, color: 'var(--text-primary)' }}>
              {achievement.title}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {achievement.description}
            </p>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: RARITY_COLORS[achievement.rarity]
            }}
          >
            {achievement.rarity} · {achievement.unlockedAt}
          </p>
        </article>
      ))}
    </div>
  );
}
