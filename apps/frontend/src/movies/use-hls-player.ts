import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export type SelectedQuality = 'auto' | number;

interface UseHlsPlayerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** HLS master playlist URL, or null when there is nothing to play. */
  src: string | null;
  /** When false, the caller drives the <video> src itself (e.g. plain MP4). */
  enabled: boolean;
}

interface UseHlsPlayerReturn {
  /** Distinct variant heights, sorted high → low (e.g. [1080, 720, 480]). */
  qualities: number[];
  selectedQuality: SelectedQuality;
  selectQuality: (quality: SelectedQuality) => void;
}

function distinctHeightsDescending(levels: readonly { height: number }[]): number[] {
  const heights = new Set<number>();
  for (const level of levels) {
    if (level.height > 0) {
      heights.add(level.height);
    }
  }
  return [...heights].sort((a, b) => b - a);
}

/**
 * Attaches hls.js to the video element for adaptive HLS playback and exposes a
 * manual quality selector. Falls back to native HLS (Safari) when available.
 * For non-HLS sources the caller keeps owning the `src` attribute.
 */
export function useHlsPlayer({ videoRef, src, enabled }: UseHlsPlayerOptions): UseHlsPlayerReturn {
  const [qualities, setQualities] = useState<number[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<SelectedQuality>('auto');
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null || !enabled || src === null) {
      return;
    }

    // Safari and iOS play HLS natively; hls.js is neither needed nor supported.
    if (video.canPlayType('application/vnd.apple.mpegurl') !== '' || !Hls.isSupported()) {
      video.src = src;
      return () => {
        video.removeAttribute('src');
        video.load();
        setQualities([]);
        setSelectedQuality('auto');
      };
    }

    // Tuned for a rate-limited, un-cached origin (e.g. the R2 r2.dev dev URL):
    // start at a low rendition for fast startup, then let ABR climb, and pre-fill
    // a large forward buffer so playback keeps running while segments trickle in
    // (especially during the synchronized "ready"/countdown wait before play).
    const hls = new Hls({
      enableWorker: true,
      maxBufferLength: 90,
      maxBufferSize: 200 * 1000 * 1000,
      backBufferLength: 30,
      abrEwmaDefaultEstimate: 800_000,
      fragLoadingMaxRetry: 6
    });
    hlsRef.current = hls;
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setQualities(distinctHeightsDescending(hls.levels));
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
      setQualities([]);
      setSelectedQuality('auto');
    };
  }, [videoRef, src, enabled]);

  const selectQuality = useCallback((quality: SelectedQuality) => {
    setSelectedQuality(quality);
    const hls = hlsRef.current;
    if (hls === null) {
      return;
    }
    if (quality === 'auto') {
      hls.currentLevel = -1;
      return;
    }
    const targetIndex = hls.levels.findIndex((level) => level.height === quality);
    hls.currentLevel = targetIndex >= 0 ? targetIndex : -1;
  }, []);

  return { qualities, selectedQuality, selectQuality };
}
