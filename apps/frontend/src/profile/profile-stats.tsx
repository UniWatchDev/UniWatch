export interface ProfileStatsProps {
  readonly friendsCount: number;
  readonly watchedCount: number;
  readonly achievementsCount: number;
}

function StatCell({
  value,
  label,
  isLast = false
}: {
  readonly value: number;
  readonly label: string;
  readonly isLast?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: '20px 12px',
        borderRight: isLast ? 'none' : '1px solid var(--border-subtle)'
      }}
    >
      <div
        className="display"
        style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase'
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function ProfileStats({ friendsCount, watchedCount, achievementsCount }: ProfileStatsProps) {
  return (
    <section
      className="card"
      style={{
        display: 'flex',
        padding: 0,
        overflow: 'hidden',
        marginTop: 16
      }}
    >
      <StatCell value={friendsCount} label="Friends" />
      <StatCell value={watchedCount} label="Watched" />
      <StatCell value={achievementsCount} label="Achievements" isLast />
    </section>
  );
}
