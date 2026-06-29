import { Clapperboard, Play, Radio } from 'lucide-react';

import { RoomVideoStageOverlay } from '@/components/room-video-stage-overlay';

interface MovieAwaitingHostOverlayProps {
  movieName: string | null | undefined;
  loading: boolean;
  isHost: boolean;
}

export function MovieAwaitingHostOverlay({
  movieName,
  loading,
  isHost,
}: MovieAwaitingHostOverlayProps) {
  const trimmedName = movieName?.trim();
  const hasName = trimmedName !== undefined && trimmedName.length > 0;

  if (loading) {
    return (
      <RoomVideoStageOverlay
        icon={Clapperboard}
        loading
        eyebrow="Preparing video"
        title="Loading new movie…"
        description="Hang tight — the stream is getting ready for everyone."
      />
    );
  }

  return (
    <RoomVideoStageOverlay
      icon={isHost ? Play : Clapperboard}
      eyebrow={isHost ? 'Ready when you are' : 'New movie loaded'}
      title={hasName ? trimmedName : 'The host picked a new video'}
      description={
        isHost
          ? 'Press play on the controls below when you want everyone to watch together.'
          : 'The host changed the movie. You will start watching together when they press play.'
      }
      badge={
        !isHost ? (
          <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-100">
            <Radio className="size-3.5 animate-pulse" aria-hidden="true" />
            Waiting for host to start
          </div>
        ) : undefined
      }
    />
  );
}
