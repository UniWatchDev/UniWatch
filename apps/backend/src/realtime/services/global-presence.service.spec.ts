import { GlobalPresenceService } from './global-presence.service';

describe('GlobalPresenceService', () => {
  let svc: GlobalPresenceService;

  beforeEach(() => {
    svc = new GlobalPresenceService();
  });

  it('reports online after first socket registered', () => {
    svc.registerSocket('user1', 'socket1');
    expect(svc.isOnline('user1')).toBe(true);
  });

  it('reports offline after last socket removed', () => {
    svc.registerSocket('user1', 'socket1');
    const fullyOffline = svc.removeSocket('user1', 'socket1');
    expect(fullyOffline).toBe(true);
    expect(svc.isOnline('user1')).toBe(false);
  });

  it('stays online when one of multiple sockets removed', () => {
    svc.registerSocket('user1', 'socket1');
    svc.registerSocket('user1', 'socket2');
    const fullyOffline = svc.removeSocket('user1', 'socket1');
    expect(fullyOffline).toBe(false);
    expect(svc.isOnline('user1')).toBe(true);
  });

  it('getSocketsForUser returns all socket ids', () => {
    svc.registerSocket('user1', 'socket1');
    svc.registerSocket('user1', 'socket2');
    expect(svc.getSocketsForUser('user1').sort()).toEqual(['socket1', 'socket2']);
  });

  it('tracks current room', () => {
    svc.registerSocket('user1', 'socket1');
    svc.setCurrentRoom('user1', 'room42', 'Movie Night');
    const presence = svc.getUserPresence('user1');
    expect(presence.currentRoomId).toBe('room42');
    expect(presence.currentRoomName).toBe('Movie Night');
  });

  it('clears current room', () => {
    svc.registerSocket('user1', 'socket1');
    svc.setCurrentRoom('user1', 'room42', 'Movie Night');
    svc.clearCurrentRoom('user1');
    expect(svc.getUserPresence('user1').currentRoomId).toBeUndefined();
  });
});
