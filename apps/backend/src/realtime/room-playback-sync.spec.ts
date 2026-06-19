import type { PlaybackState } from '@repo/schemas/realtime';
import {
  getMaterializedPlaybackPosition,
  shouldUnfreezePlaybackFromRoomState
} from '@repo/schemas/realtime/playback-sync';

function makePlayback(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    movieId: 'movie-1',
    isPlaying: false,
    positionSec: 0,
    playbackRate: 1,
    updatedAt: '2026-06-16T12:00:00.000Z',
    ...overrides
  };
}

describe('playback sync helpers', () => {
  it('materializes live playback position while playing', () => {
    const position = getMaterializedPlaybackPosition(
      makePlayback({
        isPlaying: true,
        positionSec: 10,
        updatedAt: '2026-06-16T12:00:00.000Z'
      }),
      Date.parse('2026-06-16T12:00:05.000Z')
    );
    expect(position).toBe(15);
  });

  it('unfreezes playback when countdown ends', () => {
    const prev = makePlayback({ isPlaying: false });
    const next = makePlayback({ isPlaying: true, positionSec: 12 });
    expect(shouldUnfreezePlaybackFromRoomState(prev, next, true, false)).toBe(true);
  });

  it('unfreezes playback when isPlaying flips', () => {
    const prev = makePlayback({ isPlaying: false });
    const next = makePlayback({ isPlaying: true });
    expect(shouldUnfreezePlaybackFromRoomState(prev, next, false, false)).toBe(true);
  });

  it('unfreezes playback when movie id changes', () => {
    const prev = makePlayback({ movieId: 'movie-1', isPlaying: true, positionSec: 120 });
    const next = makePlayback({ movieId: 'movie-2', isPlaying: true, positionSec: 0 });
    expect(shouldUnfreezePlaybackFromRoomState(prev, next, false, false)).toBe(true);
  });

  it('does not unfreeze playback for member-only room:state', () => {
    const prev = makePlayback({ isPlaying: false, positionSec: 40 });
    const next = makePlayback({
      isPlaying: false,
      positionSec: 40,
      updatedAt: '2026-06-16T12:00:01.000Z'
    });
    expect(shouldUnfreezePlaybackFromRoomState(prev, next, false, false)).toBe(false);
  });
});
