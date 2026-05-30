import { useEffect, useState } from 'react';

const HIDE_DELAY_MS = 2800;

export function useFullscreenOverlayControls(isFullscreen: boolean, isPlaying: boolean) {
  const [hiddenByIdle, setHiddenByIdle] = useState(false);
  const [interaction, setInteraction] = useState(0);

  const revealControls = () => {
    setHiddenByIdle(false);
    setInteraction((count) => count + 1);
  };

  useEffect(() => {
    if (!isFullscreen || !isPlaying) {
      return undefined;
    }
    const timer = setTimeout(() => { setHiddenByIdle(true); }, HIDE_DELAY_MS);
    return () => { clearTimeout(timer); };
  }, [isFullscreen, isPlaying, interaction]);

  const overlayVisible = !isPlaying || !hiddenByIdle;

  return { overlayVisible, revealControls };
}
