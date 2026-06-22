import { useEffect, useState } from 'react';

const HIDE_DELAY_MS = 2800;

/**
 * Drives the auto-hiding player chrome. Controls are always visible while
 * paused; while playing they fade out after a short idle period and reappear
 * on any interaction. Applies in both windowed (docked) and fullscreen modes
 * so the player reads like a real cinema app (Netflix-style).
 */
export function useFullscreenOverlayControls(_isFullscreen: boolean, isPlaying: boolean) {
  const [hiddenByIdle, setHiddenByIdle] = useState(false);
  const [interaction, setInteraction] = useState(0);

  const revealControls = () => {
    setHiddenByIdle(false);
    setInteraction((count) => count + 1);
  };

  const hideControls = () => {
    if (isPlaying) setHiddenByIdle(true);
  };

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }
    const timer = setTimeout(() => { setHiddenByIdle(true); }, HIDE_DELAY_MS);
    return () => { clearTimeout(timer); };
  }, [isPlaying, interaction]);

  const overlayVisible = !isPlaying || !hiddenByIdle;

  return { overlayVisible, revealControls, hideControls };
}
