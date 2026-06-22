import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export type SelectedQuality = 'auto' | number;

interface UseHlsPlayerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** HLS master playlist URL, or null when there is nothing to play. */
  src: string | null;
  /** When false, the caller drives the <video> src itself (e.g. plain MP4). */
  enabled: boolean;
  /** Partial HLS playlists grow while the movie is still processing. */
  partial?: boolean;
}

interface UseHlsPlayerReturn {
  /** Distinct variant heights, sorted high → low (e.g. [1080, 720, 480]). */
  qualities: number[];
  selectedQuality: SelectedQuality;
  /** Height of the rendition currently being decoded, or null when unknown / native HLS. */
  currentLevel: number | null;
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

const QUALITY_STORAGE_KEY = 'uniwatch:selected-video-quality';

function loadSelectedQuality(): SelectedQuality {
  if (typeof window === 'undefined') {
    return 1080;
  }
  try {
    const raw = window.sessionStorage.getItem(QUALITY_STORAGE_KEY);
    if (raw === null || raw.length === 0) {
      return 1080;
    }
    if (raw === 'auto') {
      return 'auto';
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 1080;
  } catch {
    return 1080;
  }
}

function saveSelectedQuality(quality: SelectedQuality): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(QUALITY_STORAGE_KEY, String(quality));
  } catch {
    // Ignore storage errors; the selection still stays local in memory.
  }
}

/**
 * Attaches hls.js to the video element for adaptive HLS playback and exposes a
 * manual quality selector. Falls back to native HLS (Safari) when available.
 * For non-HLS sources the caller keeps owning the `src` attribute.
 */
export function useHlsPlayer({
  videoRef,
  src,
  enabled,
  partial = false
}: UseHlsPlayerOptions): UseHlsPlayerReturn {
  const [qualities, setQualities] = useState<number[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<SelectedQuality>(() => loadSelectedQuality());
  const selectedQualityRef = useRef<SelectedQuality>(selectedQuality);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const pendingQualityRef = useRef<SelectedQuality | null>(selectedQuality);
  const initialPartialRef = useRef(partial);

  const applyQuality = (hls: Hls, quality: SelectedQuality) => {
    if (quality === 'auto') {
      hls.nextLevel = -1;
      return;
    }
    const targetIndex = hls.levels.findIndex((level) => level.height === quality);
    hls.nextLevel = targetIndex >= 0 ? targetIndex : -1;
  };

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
      };
    }

    // Tuned for a rate-limited, un-cached origin (e.g. the R2 r2.dev dev URL):
    // bias the first ABR decision toward a high rendition (default 4 Mbps
    // estimate ≈ 720p/1080p) so everyone starts in good quality, then let ABR
    // adapt down if bandwidth is lower. A large forward buffer keeps playback
    // running while segments trickle in (especially during the synchronized
    // "ready"/countdown wait before play).
    const hls = new Hls({
      enableWorker: true,
      maxBufferLength: initialPartialRef.current ? 120 : 90,
      maxBufferSize: initialPartialRef.current ? 250 * 1000 * 1000 : 200 * 1000 * 1000,
      backBufferLength: initialPartialRef.current ? 60 : 30,
      liveDurationInfinity: initialPartialRef.current,
      abrEwmaDefaultEstimate: 4_000_000,
      fragLoadingMaxRetry: 6
    });
    hlsRef.current = hls;
    pendingQualityRef.current = selectedQualityRef.current;
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const nextQualities = distinctHeightsDescending(hls.levels);
      setQualities(nextQualities);
      const pendingQuality = pendingQualityRef.current;
      if (pendingQuality !== null) {
        applyQuality(hls, pendingQuality);
        pendingQualityRef.current = null;
      }
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      const level = hls.levels[data.level];
      setCurrentLevel(level?.height ?? null);
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
      pendingQualityRef.current = null;
      setQualities([]);
      setCurrentLevel(null);
    };
  }, [videoRef, src, enabled]);

  const selectQuality = (quality: SelectedQuality) => {
    selectedQualityRef.current = quality;
    setSelectedQuality(quality);
    saveSelectedQuality(quality);
    pendingQualityRef.current = quality;
    const hls = hlsRef.current;
    if (hls === null) {
      return;
    }
    applyQuality(hls, quality);
    pendingQualityRef.current = null;
  };

  return { qualities, selectedQuality, currentLevel, selectQuality };
}
