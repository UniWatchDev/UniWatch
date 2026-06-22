import { useEffect, useRef } from 'react';

interface UsePlayerKeyboardOptions {
  canControl: boolean;
  isPlaying: boolean;
  duration: number;
  muted: boolean;
  onTogglePlay: () => void;
  onSeekBy: (deltaSeconds: number) => void;
  onSeekTo: (seconds: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTyping(): boolean {
  const el = document.activeElement;
  if (el === null) return false;
  if (INPUT_TAGS.has(el.tagName)) return true;
  if (el.getAttribute('contenteditable') === 'true') return true;
  return false;
}

export function usePlayerKeyboard({
  canControl,
  isPlaying,
  duration,
  muted,
  onTogglePlay,
  onSeekBy,
  onSeekTo,
  onToggleMute,
  onToggleFullscreen,
}: UsePlayerKeyboardOptions): void {
  // Use refs so the handler closure never goes stale
  const opts = useRef({
    canControl, isPlaying, duration, muted,
    onTogglePlay, onSeekBy, onSeekTo, onToggleMute, onToggleFullscreen,
  });
  useEffect(() => {
    opts.current = {
      canControl, isPlaying, duration, muted,
      onTogglePlay, onSeekBy, onSeekTo, onToggleMute, onToggleFullscreen,
    };
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;

      const {
        canControl: cc,
        duration: dur,
        onTogglePlay: play,
        onSeekBy: seek,
        onSeekTo: seekTo,
        onToggleMute: mute,
        onToggleFullscreen: fullscreen,
      } = opts.current;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          if (cc) { e.preventDefault(); play(); }
          break;
        case 'ArrowLeft':
          if (cc) { e.preventDefault(); seek(-5); }
          break;
        case 'ArrowRight':
          if (cc) { e.preventDefault(); seek(5); }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          mute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          fullscreen();
          break;
        default: {
          // 0-9 → seek to 0%-90%
          const digit = parseInt(e.key, 10);
          if (!isNaN(digit) && digit >= 0 && digit <= 9 && cc && dur > 0) {
            e.preventDefault();
            seekTo((digit / 10) * dur);
          }
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); };
  }, []);
}
