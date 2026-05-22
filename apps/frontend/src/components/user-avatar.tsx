import { initialsFromName } from '@/utils/avatar-color';

export interface UserAvatarProps {
  readonly name: string;
  readonly avatarColor: string;
  readonly size?: number;
  readonly ring?: boolean;
}

export function UserAvatar({ name, avatarColor, size = 36, ring = false }: UserAvatarProps) {
  const initials = initialsFromName(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: avatarColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        boxShadow: ring ? `0 0 0 3px var(--bg-primary), 0 0 0 5px ${avatarColor}55` : undefined
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
