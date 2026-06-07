import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { API_BASE_URL } from '@repo/consts/api';
import { getUserByUserNameContract } from '@repo/contracts/profile';
import type { LoginResponse } from '@repo/schemas/auth';
import type { GetUserProfileResponse, UserProfile } from '@repo/schemas/profile';

import { redirectToLogin } from '@/auth/auth-redirect';
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
import { PrivateProfileBanner } from '@/profile/private-profile-banner';
import { ProfileHeader } from '@/profile/profile-header';
import { ProfileStats } from '@/profile/profile-stats';
import { ProfileTabs } from '@/profile/profile-tabs';
import type { FriendRequest, ProfileFriend, ProfileTab } from '@/types/profile';

function userNamesMatch(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

type PageState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'ready'; isOwner: boolean; isProfilePrivate: boolean; identitySource: ProfileIdentitySource };

type ProfileIdentitySource = {
  userId: string;
  userName: string;
  firstName: string;
  lastName?: string | undefined;
  avatarId: string;
  createdAt: string;
  email?: string | undefined;
};

export function ProfilePage() {
  const { userName: userNameParam = '' } = useParams();
  const navigate = useNavigate();
  const { sessionUser, loadMe, setSessionUser } = useCookieAuth();
  const [pageState, setPageState] = useState<PageState>({ status: 'loading' });
  const [activeTab, setActiveTab] = useState<ProfileTab>('friends');
  const [editOpen, setEditOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [friends, setFriends] = useState<ProfileFriend[]>(() => [...MOCK_FRIENDS]);
  const [requests, setRequests] = useState<FriendRequest[]>(() => [...MOCK_FRIEND_REQUESTS]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (userNameParam.trim() === '') {
        setPageState({ status: 'not_found' });
        return;
      }

      let me: LoginResponse | null = sessionUser;
      if (me === null) {
        const authResult = await loadMe();
        if (!alive) return;
        if (!authResult.ok) {
          redirectToLogin(navigate, { replace: true });
          return;
        }
        me = authResult.user;
      }

      const isOwner = userNamesMatch(me.userName, userNameParam);
      if (isOwner) {
        setPageState({
          status: 'ready',
          isOwner: true,
          isProfilePrivate: me.isProfilePrivate,
          identitySource: {
            userId: me.userId,
            userName: me.userName,
            firstName: me.firstName,
            lastName: me.lastName,
            avatarId: me.avatarId,
            createdAt: me.createdAt,
            email: me.email
          }
        });
        return;
      }

      try {
        const params = getUserByUserNameContract.paramsSchema.parse({
          userName: userNameParam
        });
        const path = getUserByUserNameContract.path.replace(
          ':userName',
          encodeURIComponent(params.userName)
        );
        const response = await fetch(`${API_BASE_URL}${path}`, {
          method: getUserByUserNameContract.method,
          credentials: 'include',
          headers: { Accept: 'application/json' }
        });
        if (response.status === 404) {
          setPageState({ status: 'not_found' });
          return;
        }
        if (!response.ok) {
          setPageState({ status: 'not_found' });
          return;
        }
        const data: GetUserProfileResponse = getUserByUserNameContract.responseSchema.parse(
          await response.json()
        );
        if (!alive) return;
        setPageState({
          status: 'ready',
          isOwner: data.viewerIsOwner,
          isProfilePrivate: data.profile.isProfilePrivate,
          identitySource: {
            userId: data.profile.userId,
            userName: data.profile.userName,
            firstName: data.profile.firstName,
            lastName: data.profile.lastName,
            avatarId: data.profile.avatarId,
            createdAt: data.profile.createdAt
          }
        });
      } catch {
        if (alive) {
          setPageState({ status: 'not_found' });
        }
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [loadMe, navigate, sessionUser, userNameParam]);

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

  if (pageState.status === 'loading') {
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

  if (pageState.status === 'not_found') {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-4"
        style={{ background: 'var(--bg-primary)', minHeight: '50dvh', padding: 24 }}
      >
        <p className="display" style={{ fontSize: 18, color: 'var(--text-primary)' }}>
          User not found
        </p>
      </div>
    );
  }

  const { isOwner, isProfilePrivate, identitySource } = pageState;
  const identity = buildProfileIdentity(identitySource);
  const showSocial = isOwner || !isProfilePrivate;
  const showPrivateBanner = !isOwner && isProfilePrivate;

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
        {saveMessage !== null ? (
          <p
            className="auth-feedback-success fade-in"
            style={{ marginBottom: 16 }}
            role="status"
          >
            {saveMessage}
          </p>
        ) : null}
        <ProfileHeader
          identity={identity}
          canEdit={isOwner}
          onEdit={() => {
            setEditOpen(true);
          }}
        />
        {showSocial ? (
          <>
            <ProfileStats
              friendsCount={friends.length}
              watchedCount={MOCK_WATCH_HISTORY.length}
              achievementsCount={MOCK_ACHIEVEMENTS.length}
            />
            {isOwner ? (
              <PendingRequests
                requests={requests}
                onAccept={acceptRequest}
                onDecline={declineRequest}
              />
            ) : null}
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              friends={friends}
              history={MOCK_WATCH_HISTORY}
              achievements={MOCK_ACHIEVEMENTS}
              canRemoveFriends={isOwner}
              onRemoveFriend={removeFriend}
            />
          </>
        ) : null}
        {showPrivateBanner ? <PrivateProfileBanner /> : null}
      </main>
      {editOpen && sessionUser !== null && isOwner ? (
        <EditProfileModal
          user={sessionUser}
          onClose={() => {
            setEditOpen(false);
          }}
          onSaved={(user: UserProfile) => {
            setSessionUser(user);
            setPageState({
              status: 'ready',
              isOwner: true,
              isProfilePrivate: user.isProfilePrivate,
              identitySource: {
                userId: user.userId,
                userName: user.userName,
                firstName: user.firstName,
                lastName: user.lastName,
                avatarId: user.avatarId,
                createdAt: user.createdAt,
                email: user.email
              }
            });
            setSaveMessage('Profile saved.');
            window.setTimeout(() => {
              setSaveMessage(null);
            }, 4000);
          }}
        />
      ) : null}
    </div>
  );
}
