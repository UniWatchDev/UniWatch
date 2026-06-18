import {
  COUNTDOWN_DURATION_MS,
  PlaybackCountdownService
} from '@/realtime/services/playback-countdown.service';
import { RoomStateService } from '@/realtime/services/room-state.service';

describe('PlaybackCountdownService', () => {
  const roomId = 'room-1';

  let roomState: RoomStateService;
  let countdown: PlaybackCountdownService;

  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse('2026-06-16T12:00:00.000Z') });
    roomState = new RoomStateService();
    countdown = new PlaybackCountdownService(roomState);
    roomState.getOrCreate(roomId);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('stores and clears the pending start', () => {
    const pending = { movieId: 'movie-1', positionSec: 5, playbackRate: 1 };
    countdown.setPending(roomId, pending);

    expect(countdown.getPending(roomId)).toEqual(pending);

    countdown.deletePending(roomId);
    expect(countdown.getPending(roomId)).toBeUndefined();
  });

  it('activates the countdown and fires onComplete once the duration elapses', () => {
    const onComplete = jest.fn();

    countdown.start(roomId, onComplete);

    expect(countdown.hasTimer(roomId)).toBe(true);
    expect(roomState.get(roomId)?.countdown.active).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();

    jest.advanceTimersByTime(COUNTDOWN_DURATION_MS);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(roomId);
    expect(countdown.hasTimer(roomId)).toBe(false);
  });

  it('does not start a second timer while one is already running', () => {
    countdown.start(roomId, jest.fn());
    const firstEndsAt = roomState.get(roomId)?.countdown.endsAt;

    jest.advanceTimersByTime(1_000);
    countdown.start(roomId, jest.fn());

    expect(roomState.get(roomId)?.countdown.endsAt).toBe(firstEndsAt);
  });

  it('ignores start when the room has no runtime state', () => {
    const onComplete = jest.fn();

    countdown.start('missing-room', onComplete);

    expect(countdown.hasTimer('missing-room')).toBe(false);
    jest.advanceTimersByTime(COUNTDOWN_DURATION_MS);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('cancel stops the timer, clears pending, and resets the countdown', () => {
    const onComplete = jest.fn();
    countdown.start(roomId, onComplete);
    countdown.setPending(roomId, { movieId: 'movie-1', positionSec: 0, playbackRate: 1 });

    countdown.cancel(roomId);

    expect(countdown.hasTimer(roomId)).toBe(false);
    expect(countdown.getPending(roomId)).toBeUndefined();
    expect(roomState.get(roomId)?.countdown).toEqual({ active: false, endsAt: null });

    jest.advanceTimersByTime(COUNTDOWN_DURATION_MS);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
