import type { WatchHistoryItem } from '@/types/profile';

export interface HistoryPanelProps {
  readonly items: WatchHistoryItem[];
}

export function HistoryPanel({ items }: HistoryPanelProps) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item) => (
        <li
          key={item.id}
          className="card-elevated"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 14
          }}
        >
          <div
            style={{
              width: 48,
              height: 64,
              borderRadius: 8,
              background: item.posterGradient,
              flexShrink: 0
            }}
            aria-hidden
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="display" style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
              {item.title} ({item.year})
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {item.genre} · Watched {item.watchedAt}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
