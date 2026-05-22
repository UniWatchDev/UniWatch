import { AchievementsPanel } from '@/profile/achievements-panel';
import { FriendsPanel } from '@/profile/friends-panel';
import { HistoryPanel } from '@/profile/history-panel';
import type { Achievement, ProfileFriend, ProfileTab, WatchHistoryItem } from '@/types/profile';

export interface ProfileTabsProps {
  readonly activeTab: ProfileTab;
  readonly onTabChange: (tab: ProfileTab) => void;
  readonly friends: ProfileFriend[];
  readonly history: WatchHistoryItem[];
  readonly achievements: Achievement[];
  readonly canRemoveFriends: boolean;
  readonly onRemoveFriend: (id: string) => void;
}

const TABS: { id: ProfileTab; label: string; countKey: 'friends' | 'history' | 'achievements' }[] = [
  { id: 'friends', label: 'Friends', countKey: 'friends' },
  { id: 'history', label: 'History', countKey: 'history' },
  { id: 'achievements', label: 'Achievements', countKey: 'achievements' }
];

export function ProfileTabs({
  activeTab,
  onTabChange,
  friends,
  history,
  achievements,
  canRemoveFriends,
  onRemoveFriend
}: ProfileTabsProps) {
  const counts = {
    friends: friends.length,
    history: history.length,
    achievements: achievements.length
  };

  return (
    <section className="card" style={{ marginTop: 16, overflow: 'hidden' }}>
      <div
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 8px'
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.countKey];
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={isActive ? 'profile-tab profile-tab-active' : 'profile-tab'}
              onClick={() => {
                onTabChange(tab.id);
              }}
              style={{
                flex: 1,
                padding: '14px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'color 200ms ease, border-color 200ms ease'
              }}
            >
              {tab.label} {count}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">
        {activeTab === 'friends' ? (
          <FriendsPanel
            friends={friends}
            canRemove={canRemoveFriends}
            onRemove={onRemoveFriend}
          />
        ) : null}
        {activeTab === 'history' ? <HistoryPanel items={history} /> : null}
        {activeTab === 'achievements' ? <AchievementsPanel achievements={achievements} /> : null}
      </div>
    </section>
  );
}
