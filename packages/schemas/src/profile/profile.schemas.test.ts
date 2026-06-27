import { describe, expect, it } from 'vitest';
import { activeUserSchema } from './profile.schemas.js';

describe('activeUserSchema', () => {
  it('parses a valid active user with a room', () => {
    const result = activeUserSchema.safeParse({
      userId: 'a'.repeat(24),
      userName: 'alice',
      firstName: 'Alice',
      avatarId: 'violet-reel',
      friendshipStatus: 'friend',
      mutualFriendsCount: 0,
      currentRoom: { roomId: 'b'.repeat(24), roomName: 'Movie Night', roomType: 'public' }
    });
    expect(result.success).toBe(true);
  });

  it('parses a valid active user without a room', () => {
    const result = activeUserSchema.safeParse({
      userId: 'a'.repeat(24),
      userName: 'bob',
      firstName: 'Bob',
      avatarId: 'coral-popcorn',
      friendshipStatus: 'none',
      mutualFriendsCount: 2,
      currentRoom: null
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid friendshipStatus', () => {
    const result = activeUserSchema.safeParse({
      userId: 'a'.repeat(24),
      userName: 'bob',
      firstName: 'Bob',
      avatarId: 'coral-popcorn',
      friendshipStatus: 'enemy',
      mutualFriendsCount: 0,
      currentRoom: null
    });
    expect(result.success).toBe(false);
  });
});
