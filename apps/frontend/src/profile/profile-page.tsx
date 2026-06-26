import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { API_BASE_URL } from '@repo/consts/api';
import { getUserByUserNameContract } from '@repo/contracts/profile';
import type { LoginResponse } from '@repo/schemas/auth';
import type { GetUserProfileResponse, UserProfile } from '@repo/schemas/profile';
import type { FriendPresence, PendingFriendRequest } from '@repo/schemas/realtime';

import { redirectToLogin } from '@/auth/auth-redirect';
import { useCookieAuth } from '@/auth/use-cookie-auth';
import { MOCK_ACHIEVEMENTS, MOCK_WATCH_HISTORY } from '@/data/mock-profile-data';
import { useFriendContext } from '@/friends/use-friend-context';
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

function presenceToProfileFriend(f: FriendPresence): ProfileFriend {
  return {
    id: f.userId,
    name: f.userName,
    username: f.userName,
    avatarId: f.avatarId,
    avatarColor: '#7c3aed',
    status: f.isOnline ? 'active' : 'offline'
  };
}

function pendingToFriendRequest(r: PendingFriendRequest): FriendRequest {
  return {
    id: r.requestId,
    name: r.fromUserName,
    username: r.fromUserName,
    avatarId: r.fromAvatarId,
    avatarColor: '#7c3aed',
    status: 'active',
    requestedAt: r.createdAt
  };
}

type PageState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | {
      status: 'ready';
      isOwner: boolean;
      isProfilePrivate: boolean;
      identitySource: ProfileIdentitySource;
      subjectUserId: string;
    };

type ProfileIdentitySource = {
  userId: string;
  userName: string;
  firstName: string;
  lastName?: string | undefined;
  avatarId: string;
  createdAt: string;
  email?: string | undefined;
};

type FriendActionState = 'idle' | 'loading' | 'done' | 'error';

export function ProfilePage() {
  const { userName: userNameParam = '' } = useParams();
  const navigate = useNavigate();
  const { sessionUser, loadMe, setSessionUser } = useCookieAuth();
  const {
    friends: ctxFriends,
    pendingRequests: ctxPending,
    respondToRequest,
    unfriend,
    sendFriendRequest,
    removeFriendLocally,
    openDm
  } = useFriendContext();

  const [pageState, setPageState] = useState<PageState>({ status: 'loading' });
  const [activeTab, setActiveTab] = useState<ProfileTab>('friends');
  const [editOpen, setEditOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [friendActionState, setFriendActionState] = useState<FriendActionState>('idle');
  const [friendActionMsg, setFriendActionMsg] = useState<string | null>(null);

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
          subjectUserId: me.userId,
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
        const params = getUserByUserNameContract.paramsSchema.parse({ userName: userNameParam });
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
          if (alive) setPageState({ status: 'not_found' });
          return;
        }
        if (!response.ok) {
          if (alive) setPageState({ status: 'not_found' });
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
          subjectUserId: data.profile.userId,
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
        if (alive) setPageState({ status: 'not_found' });
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [loadMe, navigate, sessionUser, userNameParam]);

  // -------------------------------------------------------------------------
  // Owner's social data from context (live)
  // -------------------------------------------------------------------------

  const friends: ProfileFriend[] = ctxFriends.map(presenceToProfileFriend);
  const requests: FriendRequest[] = ctxPending.map(pendingToFriendRequest);

  const acceptRequest = useCallback(
    (id: string) => {
      void respondToRequest(id, 'accept');
    },
    [respondToRequest]
  );

  const declineRequest = useCallback(
    (id: string) => {
      void respondToRequest(id, 'reject');
    },
    [respondToRequest]
  );

  const removeFriend = useCallback(
    (id: string) => {
      void unfriend(id);
      removeFriendLocally(id);
    },
    [removeFriendLocally, unfriend]
  );

  // -------------------------------------------------------------------------
  // Other user social actions
  // -------------------------------------------------------------------------

  const subjectUserId =
    pageState.status === 'ready' ? pageState.subjectUserId : null;

  const isFriendWithSubject =
    subjectUserId !== null && ctxFriends.some((f) => f.userId === subjectUserId);

  const handleSendRequest = useCallback(async () => {
    if (subjectUserId === null) return;
    setFriendActionState('loading');
    try {
      await sendFriendRequest(subjectUserId);
      setFriendActionMsg('Friend request sent!');
      setFriendActionState('done');
    } catch (err) {
      setFriendActionMsg((err as Error).message);
      setFriendActionState('error');
    }
  }, [sendFriendRequest, subjectUserId]);

  const handleUnfriend = useCallback(async () => {
    if (subjectUserId === null) return;
    setFriendActionState('loading');
    try {
      await unfriend(subjectUserId);
      removeFriendLocally(subjectUserId);
      setFriendActionMsg('Removed from friends.');
      setFriendActionState('done');
    } catch {
      setFriendActionState('error');
    }
  }, [removeFriendLocally, subjectUserId, unfriend]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

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

  const { isOwner, isProfilePrivate, identitySource, subjectUserId: targetId } = pageState;
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
          <p className="auth-feedback-success fade-in" style={{ marginBottom: 16 }} role="status">
            {saveMessage}
          </p>
        ) : null}

        <ProfileHeader
          identity={identity}
          canEdit={isOwner}
          onEdit={() => { setEditOpen(true); }}
        />

        {/* Other user social actions */}
        {!isOwner && showSocial && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            {isFriendWithSubject ? (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                  onClick={() => { openDm(targetId); }}
                >
                  Message
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                  disabled={friendActionState === 'loading'}
                  onClick={() => { void handleUnfriend(); }}
                >
                  Remove friend
                </button>
              </>
            ) : friendActionState === 'done' ? (
              <span style={{ fontSize: 13, color: '#4ade80' }}>{friendActionMsg}</span>
            ) : (
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: 13 }}
                disabled={friendActionState === 'loading'}
                onClick={() => { void handleSendRequest(); }}
              >
                {friendActionState === 'loading' ? 'Sending…' : 'Add friend'}
              </button>
            )}
            {friendActionState === 'error' && friendActionMsg !== null && (
              <span style={{ fontSize: 12, color: 'var(--coral)' }}>{friendActionMsg}</span>
            )}
          </div>
        )}

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
            {isOwner ? (
              <ProfileTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                friends={friends}
                history={MOCK_WATCH_HISTORY}
                achievements={MOCK_ACHIEVEMENTS}
                canRemoveFriends={true}
                onRemoveFriend={removeFriend}
              />
            ) : null}
          </>
        ) : null}

        {showPrivateBanner ? <PrivateProfileBanner /> : null}
      </main>

      {editOpen && sessionUser !== null && isOwner ? (
        <EditProfileModal
          user={sessionUser}
          onClose={() => { setEditOpen(false); }}
          onSaved={(user: UserProfile) => {
            setSessionUser(user);
            setPageState({
              status: 'ready',
              isOwner: true,
              isProfilePrivate: user.isProfilePrivate,
              subjectUserId: user.userId,
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
            window.setTimeout(() => { setSaveMessage(null); }, 4000);
          }}
        />
      ) : null}
    </div>
  );
}
