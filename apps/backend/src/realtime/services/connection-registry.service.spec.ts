import { ConnectionRegistryService } from '@/realtime/services/connection-registry.service';

describe('ConnectionRegistryService', () => {
  let registry: ConnectionRegistryService;

  beforeEach(() => {
    registry = new ConnectionRegistryService();
  });

  it('resolves the user behind a registered socket', () => {
    registry.register('socket-1', { userId: 'user-1', userName: 'Ada' });

    expect(registry.getUser('socket-1')).toEqual({ userId: 'user-1', userName: 'Ada' });
    expect(registry.getSocketIds('user-1')).toEqual(['socket-1']);
  });

  it('tracks multiple concurrent sockets for the same user', () => {
    registry.register('socket-1', { userId: 'user-1', userName: 'Ada' });
    registry.register('socket-2', { userId: 'user-1', userName: 'Ada' });

    expect(registry.getSocketIds('user-1').sort()).toEqual(['socket-1', 'socket-2']);
  });

  it('removes only the unregistered socket and keeps the others', () => {
    registry.register('socket-1', { userId: 'user-1', userName: 'Ada' });
    registry.register('socket-2', { userId: 'user-1', userName: 'Ada' });

    const removed = registry.unregister('socket-1');

    expect(removed).toEqual({ userId: 'user-1', userName: 'Ada' });
    expect(registry.getUser('socket-1')).toBeUndefined();
    expect(registry.getSocketIds('user-1')).toEqual(['socket-2']);
  });

  it('drops the user index once the last socket is unregistered', () => {
    registry.register('socket-1', { userId: 'user-1', userName: 'Ada' });

    registry.unregister('socket-1');

    expect(registry.getSocketIds('user-1')).toEqual([]);
    expect(registry.getUser('socket-1')).toBeUndefined();
  });

  it('returns undefined when unregistering an unknown socket', () => {
    expect(registry.unregister('ghost')).toBeUndefined();
  });
});
