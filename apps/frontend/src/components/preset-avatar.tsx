import { getAvatarPreset } from '@/data/avatar-presets';

export interface PresetAvatarProps {
  readonly avatarId: string;
  readonly size?: number;
  readonly ring?: boolean;
}

export function PresetAvatar({ avatarId, size = 36, ring = false }: PresetAvatarProps) {
  const preset = getAvatarPreset(avatarId);
  return (
    <div
      title={preset.label}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: preset.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: ring
          ? '0 0 0 3px var(--bg-primary), 0 0 0 5px rgba(124, 58, 237, 0.35)'
          : undefined
      }}
      aria-hidden
    >
      {preset.icon}
    </div>
  );
}
