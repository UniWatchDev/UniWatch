import { useEffect, useState } from 'react';

import type { Member } from '@/types/room';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AtSign, Ban, Crown, MoreVertical, UserPlus, UserX } from 'lucide-react';
import { initials } from '@/utils/initials';

interface ParticipantListProps {
  members: Member[];
  currentUserId: string | null;
  canModerate: boolean;
  onAddFriend: (member: Member) => void;
  onTagUser: (member: Member) => void;
  onKickUser: (member: Member) => void;
  onBlockUser: (member: Member) => void;
}

function presenceRingClass(status: Member['status']): string {
  if (status === 'active') return 'ring-active';
  if (status === 'away') return 'ring-away';
  return 'ring-idle';
}

export function ParticipantList({
  members,
  currentUserId,
  canModerate,
  onAddFriend,
  onTagUser,
  onKickUser,
  onBlockUser
}: ParticipantListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (openMenuId === null) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-member-menu]') !== null) {
        return;
      }
      setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [openMenuId]);

  if (members.length === 0) {
    return (
      <p
        className="py-8 text-center text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        No one here yet…
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5 p-2">
      {members.map((member) => {
        const isYou = member.id === currentUserId;
        const isMenuOpen = openMenuId === member.id;
        const showModeration = canModerate && !isYou;
        return (
          <li
            key={member.id}
            data-member-menu
            className="relative flex items-center gap-3 rounded-lg px-2 py-2"
            style={{
              background: isYou ? 'rgba(245,158,11,0.07)' : 'transparent',
            }}
          >
            <div
              className={`relative shrink-0 rounded-full ${presenceRingClass(member.status)}`}
            >
              <Avatar size="default">
                <AvatarFallback
                  className="text-xs font-bold text-white"
                  style={{ background: member.avatarColor }}
                >
                  {initials(member.name)}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="truncate text-sm font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
                >
                  {member.name}
                </span>
                {member.isHost && (
                  <Badge
                    variant="outline"
                    className="h-4 gap-0.5 px-1 text-[9px] font-bold"
                    style={{ borderColor: 'var(--accent-dim)', background: 'var(--accent-dim)', color: 'var(--accent)' }}
                  >
                    <Crown size={8} />
                    HOST
                  </Badge>
                )}
                {isYou && (
                  <Badge
                    variant="outline"
                    className="h-4 border-white/15 bg-white/5 px-1 text-[9px] font-bold text-white/40"
                  >
                    YOU
                  </Badge>
                )}
                {member.isFriend && (
                  <Badge
                    variant="outline"
                    className="h-4 border-sky-500/20 bg-sky-500/10 px-1 text-[9px] font-bold text-sky-300"
                  >
                    FRIEND
                  </Badge>
                )}
                {member.isReady && (
                  <Badge
                    variant="outline"
                    className="h-4 border-emerald-500/20 bg-emerald-500/10 px-1 text-[9px] font-bold text-emerald-300"
                  >
                    READY
                  </Badge>
                )}
              </div>
              <p
                className="truncate text-[11px]"
                style={{ color: 'var(--text-muted)' }}
              >
                @{member.username}
              </p>
            </div>

            {!isYou && (
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => {
                  setOpenMenuId((current) => (current === member.id ? null : member.id));
                }}
                aria-label={`${member.name} options`}
                aria-expanded={isMenuOpen}
              >
                <MoreVertical size={14} />
              </button>
            )}

            {isMenuOpen && !isYou && (
              <div
                className="participant-menu absolute right-2 top-10 z-20 w-48 overflow-hidden rounded-xl border"
                style={{
                  borderColor: 'var(--border-medium)',
                  background: 'rgba(18, 12, 6, 0.98)',
                  boxShadow: '0 18px 40px rgba(0, 0, 0, 0.3)'
                }}
              >
                <button
                  type="button"
                  className="participant-menu__item flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                  onClick={() => {
                    onAddFriend(member);
                    setOpenMenuId(null);
                  }}
                >
                  <UserPlus size={13} />
                  Add as friend
                </button>
                <button
                  type="button"
                  className="participant-menu__item flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                  onClick={() => {
                    onTagUser(member);
                    setOpenMenuId(null);
                  }}
                >
                  <AtSign size={13} />
                  Tag in chat
                </button>
                {showModeration && (
                  <>
                    <div
                      className="my-1 border-t"
                      style={{ borderColor: 'var(--border-subtle)' }}
                      role="separator"
                    />
                    <button
                      type="button"
                      className="participant-menu__item flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                      style={{ color: 'rgba(255,255,255,0.85)' }}
                      onClick={() => {
                        onKickUser(member);
                        setOpenMenuId(null);
                      }}
                    >
                      <UserX size={13} />
                      Kick from room
                    </button>
                    <button
                      type="button"
                      className="participant-menu__item flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                      style={{ color: '#fca5a5' }}
                      onClick={() => {
                        onBlockUser(member);
                        setOpenMenuId(null);
                      }}
                    >
                      <Ban size={13} />
                      Ban from room
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
