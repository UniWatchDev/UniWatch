import { useState } from 'react';
import { Check, Link, UserPlus } from 'lucide-react';

import { MOCK_FRIENDS } from '@/data/mock-profile-data';
import type { Member } from '@/types/room';
import { initials } from '@/utils/initials';

export function InviteFriends({ members }: { members: Member[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const memberUsernames = new Set(members.map((m) => m.username));

  const copyInvite = (friendId: string) => {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(friendId);
      setTimeout(() => {
        setCopied(null);
      }, 2000);
    });
  };

  return (
    <div style={{ padding: '12px 12px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <UserPlus size={13} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          Invite Friends
        </span>
      </div>
      {MOCK_FRIENDS.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>No friends yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          {MOCK_FRIENDS.map((friend) => {
            const inRoom = memberUsernames.has(friend.username);
            const wasCopied = copied === friend.id;
            return (
              <div
                key={friend.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: friend.avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {initials(friend.name)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {friend.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>@{friend.username}</p>
                </div>
                {inRoom ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>
                    In Room
                  </span>
                ) : (
                  <button
                    type="button"
                    title="Copy invite link"
                    onClick={() => {
                      copyInvite(friend.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 99,
                      border: '1px solid var(--border-medium)',
                      background: wasCopied ? 'rgba(74,222,128,0.1)' : 'var(--accent-dim)',
                      color: wasCopied ? '#4ade80' : 'var(--accent)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 150ms ease',
                    }}
                  >
                    {wasCopied ? <Check size={11} /> : <Link size={11} />}
                    {wasCopied ? 'Copied!' : 'Invite'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 10 }} />
    </div>
  );
}
