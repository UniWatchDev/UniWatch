import type { ReactNode } from 'react';

export type AvatarPresetId =
  | 'violet-reel'
  | 'coral-popcorn'
  | 'sky-star'
  | 'mint-clapper'
  | 'amber-moon'
  | 'rose-heart'
  | 'teal-ticket'
  | 'gold-bolt';

export type AvatarPreset = {
  id: AvatarPresetId;
  label: string;
  background: string;
  icon: ReactNode;
};

const reelIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="2.5" fill="white" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const popcornIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M6 14c0-3 1.5-5 3-6 1 1 2 2.5 2 4.5M12 8c0-2 1-3.5 2.5-4.5 1.5 1 2.5 3 2.5 5.5M16 12c0-2.5 1.5-4.5 3-5.5 1 1 2 3 2 5"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const starIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 3l2.2 5.5L20 9.5l-4.5 3.8L17 19l-5-3.2L7 19l1.5-5.7L4 9.5l5.8-1L12 3z"
      stroke="white"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const clapperIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M5 7h14v10H5zM8 7V4h3v3M13 7V5h3v2M8 17v3h3v-3M13 17v2h3v-2"
      stroke="white"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const moonIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M18 14.5A7.5 7.5 0 019.5 6 9 9 0 1018 14.5z"
      stroke="white"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const heartIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 20s-6.5-4.2-9-7.8C1.2 9.2 3.2 5.5 7 5.5c2 0 3.2 1.2 5 3.2C13.8 6.7 15 5.5 17 5.5c3.8 0 5.8 3.7 4 6.7-2.5 3.6-9 7.8-9 7.8z"
      stroke="white"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const ticketIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M5 8h14v8H5zM9 8v8M9 8c-1 0-1.5-1.5-1.5-3S8 2 9 2M9 16c-1 0-1.5 1.5-1.5 3S8 22 9 22"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const boltIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M13 3L5 14h6l-1 7 9-13h-6l1-5z"
      stroke="white"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'violet-reel',
    label: 'Violet reel',
    background: 'linear-gradient(135deg, #5b21b6, #8b5cf6)',
    icon: reelIcon
  },
  {
    id: 'coral-popcorn',
    label: 'Coral popcorn',
    background: 'linear-gradient(135deg, #ea580c, #fb923c)',
    icon: popcornIcon
  },
  {
    id: 'sky-star',
    label: 'Sky star',
    background: 'linear-gradient(135deg, #0369a1, #38bdf8)',
    icon: starIcon
  },
  {
    id: 'mint-clapper',
    label: 'Mint clapper',
    background: 'linear-gradient(135deg, #047857, #34d399)',
    icon: clapperIcon
  },
  {
    id: 'amber-moon',
    label: 'Amber moon',
    background: 'linear-gradient(135deg, #b45309, #fbbf24)',
    icon: moonIcon
  },
  {
    id: 'rose-heart',
    label: 'Rose heart',
    background: 'linear-gradient(135deg, #be185d, #f472b6)',
    icon: heartIcon
  },
  {
    id: 'teal-ticket',
    label: 'Teal ticket',
    background: 'linear-gradient(135deg, #0f766e, #2dd4bf)',
    icon: ticketIcon
  },
  {
    id: 'gold-bolt',
    label: 'Gold bolt',
    background: 'linear-gradient(135deg, #a16207, #facc15)',
    icon: boltIcon
  }
];

export const DEFAULT_AVATAR_PRESET_ID: AvatarPresetId = 'violet-reel';

const presetById = new Map(AVATAR_PRESETS.map((p) => [p.id, p]));

function resolveDefaultPreset(): AvatarPreset {
  const preset = presetById.get(DEFAULT_AVATAR_PRESET_ID);
  if (preset === undefined) {
    throw new Error('Default avatar preset is missing from AVATAR_PRESETS');
  }
  return preset;
}

const defaultPreset = resolveDefaultPreset();

export function getAvatarPreset(id: string): AvatarPreset {
  const preset = presetById.get(id as AvatarPresetId);
  if (preset !== undefined) {
    return preset;
  }
  return defaultPreset;
}

export function isAvatarPresetId(id: string): id is AvatarPresetId {
  return presetById.has(id as AvatarPresetId);
}
