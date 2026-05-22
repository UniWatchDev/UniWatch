import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SiteFooter } from '@/components/site-footer';
import { useCookieAuth } from '@/auth/use-cookie-auth';
import {
  MOCK_ACHIEVEMENTS,
  MOCK_FRIEND_REQUESTS,
  MOCK_FRIENDS,
  MOCK_WATCH_HISTORY
} from '@/data/mock-profile-data';
import { EditProfileModal } from '@/profile/edit-profile-modal';
import { buildProfileIdentity } from '@/profile/profile-identity';
import { PendingRequests } from '@/profile/pending-requests';
import { ProfileHeader } from '@/profile/profile-header';
import { ProfileStats } from '@/profile/profile-stats';
import { ProfileTabs } from '@/profile/profile-tabs';
import type { FriendRequest, ProfileFriend, ProfileTab } from '@/types/profile';

type AuthGate = 'checking' | 'authenticated' | 'unauthenticated';

export function ProfilePage() {
  const navigate = useNavigate();
  const { sessionUser, loadMe } = useCookieAuth();
  const [authGate, setAuthGate] = useState<AuthGate>('checking');
  const [activeTab, setActiveTab] = useState<ProfileTab>('friends');
  const [editOpen, setEditOpen] = useState(false);
  const [friends, setFriends] = useState<ProfileFriend[]>(() => [...MOCK_FRIENDS]);
  const [requests, setRequests] = useState<FriendRequest[]>(() => [...MOCK_FRIEND_REQUESTS]);

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      const result = sessionUser !== null ? { ok: true as const } : await loadMe();
      if (cancelled) return;
      if (result.ok) {
        setAuthGate('authenticated');
      } else {
        setAuthGate('unauthenticated');
        void navigate('/login', { replace: true });
      }
    }

    void ensureSession();
    return () => {
      cancelled = true;
    };
  }, [loadMe, navigate, sessionUser]);

  const acceptRequest = useCallback((id: string) => {
    setRequests((prev) => {
      const request = prev.find((r) => r.id === id);
      if (request === undefined) return prev;
      const friend: ProfileFriend = {
        id: request.id,
        name: request.name,
        username: request.username,
        avatarColor: request.avatarColor,
        status: request.status
      };
      setFriends((f) => (f.some((existing) => existing.id === friend.id) ? f : [...f, friend]));
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const declineRequest = useCallback((id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const removeFriend = useCallback((id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
  }, []);

  if (authGate === 'checking' || sessionUser === null) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ background: 'var(--bg-primary)', minHeight: '50dvh' }}
      >
        <p className="mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Loading profile…
        </p>
      </div>
    );
  }

  const identity = buildProfileIdentity(sessionUser);

  return (
    <div
      className="soft-scroll flex flex-1 flex-col"
      style={{ background: 'var(--bg-primary)', overflowY: 'auto' }}
    >
      <main
        className="fade-up"
        style={{
          maxWidth: 900,
          margin: '0 auto',
          width: '100%',
          padding: '32px 24px 24px',
          boxSizing: 'border-box'
        }}
      >
        <ProfileHeader
          identity={identity}
          onEdit={() => {
            setEditOpen(true);
          }}
        />
        <ProfileStats
          friendsCount={friends.length}
          watchedCount={MOCK_WATCH_HISTORY.length}
          achievementsCount={MOCK_ACHIEVEMENTS.length}
        />
        <PendingRequests
          requests={requests}
          onAccept={acceptRequest}
          onDecline={declineRequest}
        />
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          friends={friends}
          history={MOCK_WATCH_HISTORY}
          achievements={MOCK_ACHIEVEMENTS}
          onRemoveFriend={removeFriend}
        />
      </main>
      <SiteFooter />
      {editOpen ? (
        <EditProfileModal
          onClose={() => {
            setEditOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
