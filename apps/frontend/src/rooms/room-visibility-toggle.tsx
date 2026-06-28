import { Globe, Lock } from 'lucide-react';

interface RoomVisibilityToggleProps {
  isPrivate: boolean;
  onChange: (isPrivate: boolean) => void;
  disabled?: boolean;
}

export function RoomVisibilityToggle({
  isPrivate,
  onChange,
  disabled = false,
}: RoomVisibilityToggleProps) {
  return (
    <div className="room-visibility-toggle">
      <button
        type="button"
        className={`room-visibility-toggle__option${!isPrivate ? ' is-active' : ''}`}
        onClick={() => { onChange(false); }}
        disabled={disabled}
        aria-pressed={!isPrivate}
      >
        <Globe size={15} aria-hidden="true" />
        Public
      </button>
      <button
        type="button"
        className={`room-visibility-toggle__option${isPrivate ? ' is-active' : ''}`}
        onClick={() => { onChange(true); }}
        disabled={disabled}
        aria-pressed={isPrivate}
      >
        <Lock size={15} aria-hidden="true" />
        Private
      </button>
    </div>
  );
}
