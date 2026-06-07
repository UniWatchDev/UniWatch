import type { Member } from '@/types/room';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface ParticipantListProps {
  members: Member[];
  currentUserId: string | null;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function presenceRingClass(status: Member['status']): string {
  if (status === 'active') return 'ring-active';
  if (status === 'away') return 'ring-away';
  return 'ring-idle';
}

export function ParticipantList({ members, currentUserId }: ParticipantListProps) {
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
        return (
          <li
            key={member.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2"
            style={{
              background: isYou ? 'rgba(124,58,237,0.07)' : 'transparent',
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
                    className="h-4 gap-0.5 border-amber-500/30 bg-amber-500/10 px-1 text-[9px] font-bold text-amber-400"
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
              </div>
              <p
                className="truncate text-[11px]"
                style={{ color: 'var(--text-muted)' }}
              >
                @{member.username}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
