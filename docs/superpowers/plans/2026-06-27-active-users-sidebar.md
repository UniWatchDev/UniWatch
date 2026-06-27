# Active Users Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `LobbyFriendSidebar` with an `ActiveUsersSidebar` that shows all online platform users (friends first, then strangers), with per-user DM / add-friend / join-room actions, incoming request management, and a user search.

**Architecture:** New `GET /api/users/active` REST endpoint polled every 3 s returns all online users enriched with friendship status, mutual friend count, and current room type. The existing `FriendContext` socket layer is untouched. User search (`GET /api/users/search`) is updated to return the same enriched `ActiveUser` shape so search results use the same action buttons.

**Tech Stack:** NestJS 11, MongoDB/Mongoose, Zod 4, React 19, TypeScript strict.

## Global Constraints

- Never use `any` — use `unknown` with type guards.
- Use `import type` for type-only imports.
- Honor `exactOptionalPropertyTypes` — never assign `undefined` to an optional property explicitly.
- Max ~300 lines per file.
- Import order: external libs → `@repo/*` → `@/` → relative.
- No barrel files — use `package.json` exports maps.
- Run `pnpm lint && pnpm check-types && pnpm build` before claiming any task complete.

---

### Task 1: Add `ActiveUser` schema types to `@repo/schemas/profile`

**Files:**
- Modify: `packages/schemas/src/profile/profile.schemas.ts`

**Interfaces:**
- Produces: `friendshipStatusSchema`, `FriendshipStatus`, `activeUserSchema`, `ActiveUser`, `getActiveUsersResponseSchema`, `GetActiveUsersResponse`; updated `userSearchResponseSchema` / `UserSearchResponse` (now `ActiveUser[]`)

- [ ] **Step 1: Write the failing type test**

Add a new test file:

```ts
// packages/schemas/src/profile/profile.schemas.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/schemas && pnpm exec vitest run src/profile/profile.schemas.test.ts 2>&1 | tail -20
```

Expected: FAIL — `activeUserSchema` is not exported yet.

- [ ] **Step 3: Add types to `profile.schemas.ts`**

At the bottom of `packages/schemas/src/profile/profile.schemas.ts`, after the existing `userSearchResponseSchema`, add:

```ts
export const friendshipStatusSchema = z.enum(['friend', 'pending_sent', 'none']);
export type FriendshipStatus = z.infer<typeof friendshipStatusSchema>;

const activeUserRoomSchema = z.strictObject({
  roomId: z.string(),
  roomName: z.string(),
  roomType: z.enum(['public', 'private'])
});

export const activeUserSchema = z.strictObject({
  userId: mongoObjectIdStringSchema,
  userName: z.string(),
  firstName: z.string(),
  avatarId: avatarPresetIdSchema,
  friendshipStatus: friendshipStatusSchema,
  mutualFriendsCount: z.number().int().nonnegative(),
  currentRoom: activeUserRoomSchema.nullable()
});

export type ActiveUser = z.infer<typeof activeUserSchema>;

export const getActiveUsersResponseSchema = z.array(activeUserSchema);
export type GetActiveUsersResponse = z.infer<typeof getActiveUsersResponseSchema>;
```

Also replace the existing `userSearchResponseSchema` (currently `z.array(publicProfileSchema)`) with:

```ts
/** GET /api/users/search response — array of enriched active users. */
export const userSearchResponseSchema = z.array(activeUserSchema);
export type UserSearchResponse = z.infer<typeof userSearchResponseSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/schemas && pnpm exec vitest run src/profile/profile.schemas.test.ts 2>&1 | tail -20
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Build schemas to confirm no TS errors**

```bash
pnpm --filter @repo/schemas build 2>&1 | tail -20
```

Expected: exits 0 with no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/schemas/src/profile/profile.schemas.ts packages/schemas/src/profile/profile.schemas.test.ts
git commit -m "feat(schemas): add ActiveUser type and update UserSearchResponse"
```

---

### Task 2: Add endpoint const and update `@repo/contracts/users`

**Files:**
- Modify: `packages/consts/src/profile/profile.consts.ts`
- Modify: `packages/contracts/src/users/users.contracts.ts`

**Interfaces:**
- Consumes: `activeUserSchema`, `getActiveUsersResponseSchema` from `@repo/schemas/profile`; `USERS_ACTIVE_ENDPOINT` from `@repo/consts/profile`
- Produces: `getActiveUsersContract`, updated `searchUsersContract`

- [ ] **Step 1: Add the endpoint const**

In `packages/consts/src/profile/profile.consts.ts`, after the existing `USERS_SEARCH_ENDPOINT` line, add:

```ts
/** GET /api/users/active — all online platform users enriched with friendship status. */
export const USERS_ACTIVE_ENDPOINT = '/api/users/active' as const;
```

- [ ] **Step 2: Update the users contracts file**

Replace the contents of `packages/contracts/src/users/users.contracts.ts` with:

```ts
import { USERS_ACTIVE_ENDPOINT, USERS_SEARCH_ENDPOINT } from '@repo/consts/profile';
import {
  activeUserSchema,
  getActiveUsersResponseSchema,
  userSearchQuerySchema,
  type ActiveUser,
  type UserSearchQuery
} from '@repo/schemas/profile';
import type { EndpointContract } from '../shared/endpoint.js';

export const searchUsersContract: EndpointContract<ActiveUser[], void, void, UserSearchQuery> = {
  method: 'GET',
  path: USERS_SEARCH_ENDPOINT,
  responseSchema: userSearchQuerySchema.array ? getActiveUsersResponseSchema : getActiveUsersResponseSchema,
  querySchema: userSearchQuerySchema
};

export const getActiveUsersContract: EndpointContract<ActiveUser[]> = {
  method: 'GET',
  path: USERS_ACTIVE_ENDPOINT,
  responseSchema: getActiveUsersResponseSchema
};
```

Wait — the `responseSchema` on `searchUsersContract` should be `getActiveUsersResponseSchema`. Write it cleanly:

```ts
import { USERS_ACTIVE_ENDPOINT, USERS_SEARCH_ENDPOINT } from '@repo/consts/profile';
import {
  getActiveUsersResponseSchema,
  userSearchQuerySchema,
  type ActiveUser,
  type UserSearchQuery
} from '@repo/schemas/profile';
import type { EndpointContract } from '../shared/endpoint.js';

export const searchUsersContract: EndpointContract<ActiveUser[], void, void, UserSearchQuery> = {
  method: 'GET',
  path: USERS_SEARCH_ENDPOINT,
  responseSchema: getActiveUsersResponseSchema,
  querySchema: userSearchQuerySchema
};

export const getActiveUsersContract: EndpointContract<ActiveUser[]> = {
  method: 'GET',
  path: USERS_ACTIVE_ENDPOINT,
  responseSchema: getActiveUsersResponseSchema
};
```

- [ ] **Step 3: Build consts and contracts**

```bash
pnpm --filter @repo/consts build && pnpm --filter @repo/contracts build 2>&1 | tail -20
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/consts/src/profile/profile.consts.ts packages/contracts/src/users/users.contracts.ts
git commit -m "feat(contracts): add getActiveUsersContract, update searchUsers response type"
```

---

### Task 3: Backend repository and presence helpers

**Files:**
- Modify: `apps/backend/src/realtime/services/global-presence.service.ts`
- Modify: `apps/backend/src/auth/user.repository.ts`
- Modify: `apps/backend/src/rooms/room.repository.ts`

**Interfaces:**
- Produces:
  - `GlobalPresenceService.getOnlineUserIds(): string[]`
  - `UserRepository.findMutualFriendCounts(strangerIds: string[], currentFriendIds: string[]): Promise<Map<string, number>>`
  - `RoomRepository.findTypesByIds(ids: string[]): Promise<Map<string, 'public' | 'private'>>`

- [ ] **Step 1: Add `getOnlineUserIds()` to `GlobalPresenceService`**

In `apps/backend/src/realtime/services/global-presence.service.ts`, add after `getOnlineFriendPresences`:

```ts
getOnlineUserIds(): string[] {
  return Array.from(this.users.keys());
}
```

- [ ] **Step 2: Add `findMutualFriendCounts()` to `UserRepository`**

In `apps/backend/src/auth/user.repository.ts`, add after `findFriendIds`:

```ts
async findMutualFriendCounts(
  strangerIds: string[],
  currentFriendIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>(strangerIds.map((id) => [id, 0]));
  if (strangerIds.length === 0 || currentFriendIds.length === 0) return counts;

  const strangerOids = strangerIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  const friendOids = currentFriendIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const results = await this.model.aggregate<{ _id: Types.ObjectId; mutualCount: number }>([
    { $match: { _id: { $in: strangerOids } } },
    {
      $project: {
        mutualCount: {
          $size: {
            $ifNull: [{ $setIntersection: ['$friends', friendOids] }, []]
          }
        }
      }
    }
  ]);

  for (const r of results) {
    counts.set(r._id.toString(), r.mutualCount);
  }
  return counts;
}
```

- [ ] **Step 3: Add `findTypesByIds()` to `RoomRepository`**

In `apps/backend/src/rooms/room.repository.ts`, add after `findByCreator`:

```ts
async findTypesByIds(ids: string[]): Promise<Map<string, 'public' | 'private'>> {
  const objectIds = ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  const docs = await this.model
    .find({ _id: { $in: objectIds } })
    .select('room_type')
    .lean();
  return new Map(
    docs.map((d) => [
      (d._id as Types.ObjectId).toString(),
      d.room_type as 'public' | 'private'
    ])
  );
}
```

- [ ] **Step 4: Type-check backend**

```bash
pnpm --filter backend check-types 2>&1 | tail -20
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/realtime/services/global-presence.service.ts \
        apps/backend/src/auth/user.repository.ts \
        apps/backend/src/rooms/room.repository.ts
git commit -m "feat(backend): add getOnlineUserIds, findMutualFriendCounts, findTypesByIds helpers"
```

---

### Task 4: `UsersService.getActiveUsers()` + update `searchUsers()`

**Files:**
- Modify: `apps/backend/src/users/users.service.ts`
- Modify: `apps/backend/src/users/users.service.spec.ts`

**Interfaces:**
- Consumes: `GlobalPresenceService.getOnlineUserIds()`, `getOnlineUserIds()`, `UserRepository.findManyByIds()`, `UserRepository.findFriendIds()`, `UserRepository.findMutualFriendCounts()`, `FriendRequestRepository.findAllPendingForUser()`, `RoomRepository.findTypesByIds()`
- Produces:
  - `UsersService.getActiveUsers(currentUserId: string): Promise<ActiveUser[]>`
  - `UsersService.searchUsers(viewerUserId: string, q: string): Promise<ActiveUser[]>`

- [ ] **Step 1: Write failing tests**

Replace the `searchUsers` describe block and add a new `getActiveUsers` describe block in `apps/backend/src/users/users.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';

import { UserRepository } from '@/auth/user.repository';
import { FriendRequestRepository } from '@/friends/friend-request.repository';
import { GlobalPresenceService } from '@/realtime/services/global-presence.service';
import { RoomRepository } from '@/rooms/room.repository';
import { UsersService } from './users.service';

const ALICE = '000000000000000000000001';
const BOB   = '000000000000000000000002';
const CAROL = '000000000000000000000003';
const DAVE  = '000000000000000000000004';

function makeUserDoc(overrides: {
  id: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  isProfilePrivate?: boolean;
}) {
  return {
    _id: { toString: () => overrides.id },
    userName: overrides.userName ?? 'user',
    firstName: overrides.firstName ?? 'First',
    lastName: overrides.lastName,
    isProfilePrivate: overrides.isProfilePrivate ?? false,
    avatarId: 'violet-reel',
    createdAt: new Date('2024-01-01T00:00:00.000Z')
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<UserRepository>;
  let friendRequestRepo: jest.Mocked<FriendRequestRepository>;
  let presenceService: jest.Mocked<GlobalPresenceService>;
  let roomRepo: jest.Mocked<RoomRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: {
            findByUserName: jest.fn(),
            findFriendIds: jest.fn().mockResolvedValue([]),
            searchByUsername: jest.fn().mockResolvedValue([]),
            findManyByIds: jest.fn().mockResolvedValue([]),
            findMutualFriendCounts: jest.fn().mockResolvedValue(new Map())
          }
        },
        {
          provide: FriendRequestRepository,
          useValue: {
            findAllPendingForUser: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: GlobalPresenceService,
          useValue: {
            getOnlineUserIds: jest.fn().mockReturnValue([]),
            getUserPresence: jest.fn().mockReturnValue({ isOnline: true })
          }
        },
        {
          provide: RoomRepository,
          useValue: {
            findTypesByIds: jest.fn().mockResolvedValue(new Map())
          }
        }
      ]
    }).compile();

    service = module.get(UsersService);
    userRepo = module.get<jest.Mocked<UserRepository>>(UserRepository);
    friendRequestRepo = module.get<jest.Mocked<FriendRequestRepository>>(FriendRequestRepository);
    presenceService = module.get<jest.Mocked<GlobalPresenceService>>(GlobalPresenceService);
    roomRepo = module.get<jest.Mocked<RoomRepository>>(RoomRepository);
  });

  describe('getActiveUsers', () => {
    it('returns empty array when no users are online', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([]);
      const result = await service.getActiveUsers(ALICE);
      expect(result).toEqual([]);
    });

    it('excludes self from results', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([ALICE]);
      const result = await service.getActiveUsers(ALICE);
      expect(result).toEqual([]);
    });

    it('returns friend with friendshipStatus "friend"', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([BOB]);
      userRepo.findManyByIds.mockResolvedValue([makeUserDoc({ id: BOB, userName: 'bob' })] as never);
      userRepo.findFriendIds.mockResolvedValue([BOB]);
      presenceService.getUserPresence.mockReturnValue({ isOnline: true });

      const result = await service.getActiveUsers(ALICE);
      expect(result).toHaveLength(1);
      expect(result[0]?.friendshipStatus).toBe('friend');
      expect(result[0]?.mutualFriendsCount).toBe(0);
    });

    it('returns stranger with friendshipStatus "none" and mutual count', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([CAROL]);
      userRepo.findManyByIds.mockResolvedValue([makeUserDoc({ id: CAROL, userName: 'carol' })] as never);
      userRepo.findFriendIds.mockResolvedValue([]);
      userRepo.findMutualFriendCounts.mockResolvedValue(new Map([[CAROL, 2]]));
      presenceService.getUserPresence.mockReturnValue({ isOnline: true });

      const result = await service.getActiveUsers(ALICE);
      expect(result[0]?.friendshipStatus).toBe('none');
      expect(result[0]?.mutualFriendsCount).toBe(2);
    });

    it('returns pending_sent user with friendshipStatus "pending_sent"', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([CAROL]);
      userRepo.findManyByIds.mockResolvedValue([makeUserDoc({ id: CAROL, userName: 'carol' })] as never);
      userRepo.findFriendIds.mockResolvedValue([]);
      friendRequestRepo.findAllPendingForUser.mockResolvedValue([
        { from: { toString: () => ALICE }, to: { toString: () => CAROL } } as never
      ]);
      presenceService.getUserPresence.mockReturnValue({ isOnline: true });

      const result = await service.getActiveUsers(ALICE);
      expect(result[0]?.friendshipStatus).toBe('pending_sent');
    });

    it('places friends before strangers', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([CAROL, BOB]);
      userRepo.findManyByIds.mockResolvedValue([
        makeUserDoc({ id: CAROL, userName: 'carol' }),
        makeUserDoc({ id: BOB, userName: 'bob' })
      ] as never);
      userRepo.findFriendIds.mockResolvedValue([BOB]);
      presenceService.getUserPresence.mockReturnValue({ isOnline: true });

      const result = await service.getActiveUsers(ALICE);
      expect(result[0]?.userId).toBe(BOB);
      expect(result[1]?.userId).toBe(CAROL);
    });

    it('attaches currentRoom when user is in a public room', async () => {
      const ROOM_ID = 'r'.repeat(24);
      presenceService.getOnlineUserIds.mockReturnValue([BOB]);
      userRepo.findManyByIds.mockResolvedValue([makeUserDoc({ id: BOB })] as never);
      userRepo.findFriendIds.mockResolvedValue([BOB]);
      presenceService.getUserPresence.mockReturnValue({
        isOnline: true,
        currentRoomId: ROOM_ID,
        currentRoomName: 'Movie Night'
      });
      roomRepo.findTypesByIds.mockResolvedValue(new Map([[ROOM_ID, 'public']]));

      const result = await service.getActiveUsers(ALICE);
      expect(result[0]?.currentRoom).toEqual({
        roomId: ROOM_ID,
        roomName: 'Movie Night',
        roomType: 'public'
      });
    });
  });

  describe('searchUsers', () => {
    it('returns friends in search results with friendshipStatus "friend"', async () => {
      userRepo.findFriendIds.mockResolvedValue([BOB]);
      userRepo.searchByUsername.mockResolvedValue([makeUserDoc({ id: BOB, userName: 'bob' })] as never);

      const results = await service.searchUsers(ALICE, 'bob');
      expect(results[0]?.friendshipStatus).toBe('friend');
    });

    it('passes empty excludeIds so friends are included', async () => {
      userRepo.findFriendIds.mockResolvedValue([BOB]);
      userRepo.searchByUsername.mockResolvedValue([]);

      await service.searchUsers(ALICE, 'b');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepo.searchByUsername).toHaveBeenCalledWith(ALICE, 'b', []);
    });

    it('returns currentRoom as null for all search results', async () => {
      userRepo.searchByUsername.mockResolvedValue([makeUserDoc({ id: CAROL })] as never);
      const results = await service.searchUsers(ALICE, 'c');
      expect(results[0]?.currentRoom).toBeNull();
    });

    it('returns stranger with mutualFriendsCount', async () => {
      userRepo.searchByUsername.mockResolvedValue([makeUserDoc({ id: CAROL })] as never);
      userRepo.findMutualFriendCounts.mockResolvedValue(new Map([[CAROL, 3]]));

      const results = await service.searchUsers(ALICE, 'c');
      expect(results[0]?.mutualFriendsCount).toBe(3);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter backend test -- --testPathPattern=users.service.spec 2>&1 | tail -30
```

Expected: FAIL — `getActiveUsers` not defined.

- [ ] **Step 3: Rewrite `apps/backend/src/users/users.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';

import {
  avatarPresetIdSchema,
  type ActiveUser,
  type FriendshipStatus,
  type GetUserProfileResponse,
  type PublicProfile,
  type UserSearchResponse
} from '@repo/schemas/profile';

import { UserRepository } from '@/auth/user.repository';
import type { UserDocument } from '@/auth/user.schema';
import { FriendRequestRepository } from '@/friends/friend-request.repository';
import { GlobalPresenceService } from '@/realtime/services/global-presence.service';
import { RoomRepository } from '@/rooms/room.repository';

function userToPublicProfile(doc: UserDocument): PublicProfile {
  const userId = doc._id.toString();
  return {
    userId,
    userName: doc.userName,
    firstName: doc.firstName,
    ...(doc.lastName !== undefined && doc.lastName.length > 0
      ? { lastName: doc.lastName }
      : {}),
    isProfilePrivate: doc.isProfilePrivate,
    avatarId: avatarPresetIdSchema.parse(doc.avatarId),
    createdAt: doc.createdAt.toISOString()
  };
}

function docToActiveUser(
  doc: UserDocument,
  friendshipStatus: FriendshipStatus,
  mutualFriendsCount: number,
  currentRoom: ActiveUser['currentRoom']
): ActiveUser {
  return {
    userId: doc._id.toString(),
    userName: doc.userName,
    firstName: doc.firstName,
    avatarId: avatarPresetIdSchema.parse(doc.avatarId),
    friendshipStatus,
    mutualFriendsCount,
    currentRoom
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UserRepository,
    private readonly friendRequests: FriendRequestRepository,
    private readonly presence: GlobalPresenceService,
    private readonly rooms: RoomRepository
  ) {}

  async getProfileByUserName(
    viewerUserId: string,
    userName: string
  ): Promise<GetUserProfileResponse> {
    const doc = await this.users.findByUserName(userName);
    if (doc === null) {
      throw new NotFoundException('User not found');
    }
    const viewerIsOwner = doc._id.toString() === viewerUserId;
    return { profile: userToPublicProfile(doc), viewerIsOwner };
  }

  async getActiveUsers(currentUserId: string): Promise<ActiveUser[]> {
    const onlineIds = this.presence
      .getOnlineUserIds()
      .filter((id) => id !== currentUserId);

    if (onlineIds.length === 0) return [];

    const [profiles, friendIds, pendingRequests] = await Promise.all([
      this.users.findManyByIds(onlineIds),
      this.users.findFriendIds(currentUserId),
      this.friendRequests.findAllPendingForUser(currentUserId)
    ]);

    const friendIdSet = new Set(friendIds);
    const pendingSentIds = new Set(
      pendingRequests
        .filter((r) => r.from.toString() === currentUserId)
        .map((r) => r.to.toString())
    );

    const strangerIds = onlineIds.filter(
      (id) => !friendIdSet.has(id) && !pendingSentIds.has(id)
    );

    const [mutualCounts, roomTypes] = await Promise.all([
      this.users.findMutualFriendCounts(strangerIds, friendIds),
      this.resolveRoomTypes(onlineIds)
    ]);

    const profileMap = new Map(profiles.map((p) => [p._id.toString(), p]));

    const result: ActiveUser[] = [];
    for (const id of onlineIds) {
      const doc = profileMap.get(id);
      if (doc === undefined) continue;

      const fs: FriendshipStatus = friendIdSet.has(id)
        ? 'friend'
        : pendingSentIds.has(id)
        ? 'pending_sent'
        : 'none';

      const presence = this.presence.getUserPresence(id);
      const currentRoom =
        presence.currentRoomId !== undefined &&
        presence.currentRoomName !== undefined
          ? {
              roomId: presence.currentRoomId,
              roomName: presence.currentRoomName,
              roomType: roomTypes.get(presence.currentRoomId) ?? ('private' as const)
            }
          : null;

      result.push(
        docToActiveUser(doc, fs, fs === 'none' ? (mutualCounts.get(id) ?? 0) : 0, currentRoom)
      );
    }

    return result.sort((a, b) => {
      if (a.friendshipStatus === 'friend' && b.friendshipStatus !== 'friend') return -1;
      if (a.friendshipStatus !== 'friend' && b.friendshipStatus === 'friend') return 1;
      return 0;
    });
  }

  async searchUsers(viewerUserId: string, q: string): Promise<UserSearchResponse> {
    const [friendIds, pendingRequests, docs] = await Promise.all([
      this.users.findFriendIds(viewerUserId),
      this.friendRequests.findAllPendingForUser(viewerUserId),
      this.users.searchByUsername(viewerUserId, q, [])
    ]);

    const friendIdSet = new Set(friendIds);
    const pendingSentIds = new Set(
      pendingRequests
        .filter((r) => r.from.toString() === viewerUserId)
        .map((r) => r.to.toString())
    );

    const strangerDocIds = docs
      .map((d) => d._id.toString())
      .filter((id) => !friendIdSet.has(id) && !pendingSentIds.has(id));

    const mutualCounts = await this.users.findMutualFriendCounts(strangerDocIds, friendIds);

    return docs.map((doc) => {
      const id = doc._id.toString();
      const fs: FriendshipStatus = friendIdSet.has(id)
        ? 'friend'
        : pendingSentIds.has(id)
        ? 'pending_sent'
        : 'none';
      return docToActiveUser(
        doc,
        fs,
        fs === 'none' ? (mutualCounts.get(id) ?? 0) : 0,
        null
      );
    });
  }

  private async resolveRoomTypes(userIds: string[]): Promise<Map<string, 'public' | 'private'>> {
    const roomIds = [
      ...new Set(
        userIds
          .map((id) => this.presence.getUserPresence(id).currentRoomId)
          .filter((id): id is string => id !== undefined)
      )
    ];
    if (roomIds.length === 0) return new Map();
    return this.rooms.findTypesByIds(roomIds);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter backend test -- --testPathPattern=users.service.spec 2>&1 | tail -30
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/users/users.service.ts apps/backend/src/users/users.service.spec.ts
git commit -m "feat(backend): implement getActiveUsers and update searchUsers to return ActiveUser"
```

---

### Task 5: Backend controller route, DTOs, and module wiring

**Files:**
- Modify: `apps/backend/src/users/users.controller.ts`
- Modify: `apps/backend/src/users/users.dto.ts`
- Modify: `apps/backend/src/users/users.module.ts`

**Interfaces:**
- Consumes: `UsersService.getActiveUsers()`, `USERS_ACTIVE_ENDPOINT` from `@repo/consts/profile`, `activeUserSchema`, `getActiveUsersResponseSchema` from `@repo/schemas/profile`
- Produces: `GET /api/users/active` endpoint

- [ ] **Step 1: Add new types to `users.dto.ts`**

In `apps/backend/src/users/users.dto.ts`, add the new imports and DTO class:

```ts
import { createZodDto } from 'nestjs-zod';

import {
  activeUserSchema,
  getActiveUsersResponseSchema,
  getUserProfileResponseSchema,
  publicProfileSchema,
  updateProfileBodySchema,
  userNameParamsSchema,
  userProfileSchema,
  userSearchQuerySchema
} from '@repo/schemas/profile';

export type {
  ActiveUser,
  GetActiveUsersResponse,
  GetUserProfileResponse,
  PublicProfile,
  UpdateProfileBody,
  UserNameParams,
  UserProfile,
  UserSearchQuery,
  UserSearchResponse
} from '@repo/schemas/profile';

export {
  activeUserSchema,
  getUserProfileResponseSchema,
  updateProfileBodySchema,
  userNameParamsSchema,
  userProfileSchema
};

export class UpdateProfileDto extends createZodDto(updateProfileBodySchema) {}
export class UserProfileDto extends createZodDto(userProfileSchema) {}
export class UserNameParamsDto extends createZodDto(userNameParamsSchema) {}
export class GetUserProfileResponseDto extends createZodDto(getUserProfileResponseSchema) {}
export class PublicProfileDto extends createZodDto(publicProfileSchema) {}
export class UserSearchQueryDto extends createZodDto(userSearchQuerySchema) {}
export class ActiveUserDto extends createZodDto(activeUserSchema) {}
export class GetActiveUsersResponseDto extends createZodDto(getActiveUsersResponseSchema) {}
```

- [ ] **Step 2: Add the new route to `users.controller.ts`**

Replace the contents of `apps/backend/src/users/users.controller.ts`:

```ts
import { Controller, Get, Param, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Request } from 'express';

import { USERS_CONTROLLER_PATH } from '@repo/consts/profile';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import {
  ActiveUserDto,
  GetUserProfileResponseDto,
  PublicProfileDto,
  UserNameParamsDto,
  UserSearchQueryDto,
  type ActiveUser,
  type GetActiveUsersResponse,
  type GetUserProfileResponse,
  type UserSearchResponse
} from '@/users/users.dto';
import { UsersService } from '@/users/users.service';

@ApiTags('users')
@Controller(USERS_CONTROLLER_PATH)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ZodResponse({
    status: 200,
    description: 'All currently online platform users enriched with friendship status',
    type: [ActiveUserDto]
  })
  getActiveUsers(@Req() req: Request): Promise<GetActiveUsersResponse> {
    const payload = req.authPayload;
    if (payload === undefined) {
      throw new UnauthorizedException('Missing or invalid access token');
    }
    return this.usersService.getActiveUsers(payload.sub);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ZodResponse({
    status: 200,
    description: 'Search users by username (login required)',
    type: [ActiveUserDto]
  })
  searchUsers(
    @Req() req: Request,
    @Query() query: UserSearchQueryDto
  ): Promise<UserSearchResponse> {
    const payload = req.authPayload;
    if (payload === undefined) {
      throw new UnauthorizedException('Missing or invalid access token');
    }
    return this.usersService.searchUsers(payload.sub, query.q);
  }

  @Get(':userName')
  @UseGuards(JwtAuthGuard)
  @ZodResponse({
    status: 200,
    description: 'Public profile card for a username (login required)',
    type: GetUserProfileResponseDto
  })
  getByUserName(
    @Req() req: Request,
    @Param() params: UserNameParamsDto
  ): Promise<GetUserProfileResponse> {
    const payload = req.authPayload;
    if (payload === undefined) {
      throw new UnauthorizedException('Missing or invalid access token');
    }
    return this.usersService.getProfileByUserName(payload.sub, params.userName);
  }
}
```

- [ ] **Step 3: Update `users.module.ts` to inject `GlobalPresenceService` and `RoomRepository`**

Replace the contents of `apps/backend/src/users/users.module.ts`:

```ts
import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { FriendsModule } from '@/friends/friends.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { RoomsModule } from '@/rooms/rooms.module';
import { UsersController } from '@/users/users.controller';
import { UsersService } from '@/users/users.service';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => FriendsModule),
    forwardRef(() => RealtimeModule),
    forwardRef(() => RoomsModule)
  ],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
```

- [ ] **Step 4: Build and type-check backend**

```bash
pnpm --filter backend build 2>&1 | tail -20
```

Expected: exits 0.

- [ ] **Step 5: Run all backend tests**

```bash
pnpm --filter backend test 2>&1 | tail -20
```

Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/users/users.controller.ts \
        apps/backend/src/users/users.dto.ts \
        apps/backend/src/users/users.module.ts
git commit -m "feat(backend): expose GET /api/users/active endpoint"
```

---

### Task 6: Frontend API function and polling hook

**Files:**
- Modify: `apps/frontend/src/friends/friend-api.ts`
- Create: `apps/frontend/src/lobby/use-active-users.ts`

**Interfaces:**
- Consumes: `getActiveUsersContract` from `@repo/contracts/users`; `API_BASE_URL` from `@repo/consts/api`
- Produces:
  - `apiGetActiveUsers(): Promise<ActiveUser[]>`
  - `apiSearchUsers(q: string): Promise<ActiveUser[]>` (return type updated)
  - `useActiveUsers(): { users: ActiveUser[]; loading: boolean; error: string | null }`

- [ ] **Step 1: Update `friend-api.ts`**

In `apps/frontend/src/friends/friend-api.ts`:

1. Add `getActiveUsersContract` to the existing contracts import block:

```ts
import { getDmHistoryContract } from '@repo/contracts/dm';
import {
  listFriendRequestsContract,
  listFriendsContract,
  respondFriendRequestContract,
  sendFriendRequestContract,
  unfriendContract
} from '@repo/contracts/friends';
import { getActiveUsersContract, searchUsersContract } from '@repo/contracts/users';
```

2. Add import for `ActiveUser`:

```ts
import type { ActiveUser } from '@repo/schemas/profile';
```

3. Remove the existing `type { PublicProfile }` import from `@repo/schemas/profile` (it's no longer needed — `ActiveUser` replaces it in this file).

4. Update `apiSearchUsers` return type to `Promise<ActiveUser[]>`:

```ts
export async function apiSearchUsers(q: string): Promise<ActiveUser[]> {
  const query = searchUsersContract.querySchema.parse({ q });
  const qs = new URLSearchParams({ q: query.q }).toString();
  const res = await authedFetch(`${API_BASE_URL}${searchUsersContract.path}?${qs}`);
  return searchUsersContract.responseSchema.parse(await res.json());
}
```

5. Add `apiGetActiveUsers` at the end of the file:

```ts
export async function apiGetActiveUsers(): Promise<ActiveUser[]> {
  const res = await authedFetch(`${API_BASE_URL}${getActiveUsersContract.path}`);
  return getActiveUsersContract.responseSchema.parse(await res.json());
}
```

- [ ] **Step 2: Create `use-active-users.ts`**

Create `apps/frontend/src/lobby/use-active-users.ts`:

```ts
import { useEffect, useRef, useState } from 'react';

import type { ActiveUser } from '@repo/schemas/profile';

import { apiGetActiveUsers } from '@/friends/friend-api';

const POLL_INTERVAL_MS = 3_000;

export function useActiveUsers(): {
  users: ActiveUser[];
  loading: boolean;
  error: string | null;
} {
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    function poll(): void {
      apiGetActiveUsers()
        .then((data) => {
          if (mounted) {
            setUsers(data);
            setLoading(false);
            setError(null);
          }
        })
        .catch((e: unknown) => {
          if (mounted) {
            setError(e instanceof Error ? e.message : 'Failed to load active users');
            setLoading(false);
          }
        });
    }

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  return { users, loading, error };
}
```

- [ ] **Step 3: Type-check frontend**

```bash
pnpm --filter frontend check-types 2>&1 | tail -20
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/friends/friend-api.ts \
        apps/frontend/src/lobby/use-active-users.ts
git commit -m "feat(frontend): add apiGetActiveUsers and useActiveUsers polling hook"
```

---

### Task 7: `ActiveUserRow` component

**Files:**
- Create: `apps/frontend/src/lobby/active-user-row.tsx`

**Interfaces:**
- Consumes: `ActiveUser` from `@repo/schemas/profile`; `PresetAvatar` from `@/components/preset-avatar`; `useFriendContext` from `@/friends/use-friend-context`
- Produces: `ActiveUserRow` component

- [ ] **Step 1: Create `apps/frontend/src/lobby/active-user-row.tsx`**

```tsx
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ActiveUser } from '@repo/schemas/profile';

import { PresetAvatar } from '@/components/preset-avatar';
import { useFriendContext } from '@/friends/use-friend-context';

type Props = {
  user: ActiveUser;
};

export function ActiveUserRow({ user }: Props) {
  const navigate = useNavigate();
  const { openDm, sendFriendRequest } = useFriendContext();
  const [addState, setAddState] = useState<'idle' | 'sending' | 'error'>('idle');

  const handleAdd = useCallback(() => {
    if (addState !== 'idle') return;
    setAddState('sending');
    sendFriendRequest(user.userId).catch(() => {
      setAddState('error');
    });
  }, [addState, sendFriendRequest, user.userId]);

  const handleJoin = useCallback(() => {
    if (user.currentRoom !== null) {
      void navigate(`/room/${user.currentRoom.roomId}`);
    }
  }, [navigate, user.currentRoom]);

  const isPendingSent =
    user.friendshipStatus === 'pending_sent' || addState === 'sending';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid var(--border-subtle)'
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <PresetAvatar avatarId={user.avatarId} size={34} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {user.firstName}{' '}
          <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
            @{user.userName}
          </span>
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 2,
            flexWrap: 'wrap'
          }}
        >
          {user.friendshipStatus === 'none' && user.mutualFriendsCount > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {user.mutualFriendsCount} mutual
            </span>
          )}
          {user.currentRoom !== null && (
            <button
              type="button"
              onClick={() => { void navigate(`/room/${user.currentRoom?.roomId}`); }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: 11,
                color: 'var(--accent)',
                textAlign: 'left',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%'
              }}
            >
              🎬 {user.currentRoom.roomName}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {user.currentRoom?.roomType === 'public' && (
          <button
            type="button"
            onClick={handleJoin}
            style={{
              background: 'none',
              border: '1px solid var(--accent)',
              borderRadius: 6,
              padding: '3px 7px',
              color: 'var(--accent)',
              fontSize: 11,
              cursor: 'pointer'
            }}
          >
            Join
          </button>
        )}

        {user.friendshipStatus === 'friend' ? (
          <button
            type="button"
            title="Message"
            onClick={() => { openDm(user.userId); }}
            style={{
              background: 'none',
              border: '1px solid var(--border-medium)',
              borderRadius: 6,
              padding: '4px 8px',
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            💬
          </button>
        ) : isPendingSent ? (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              padding: '4px 8px'
            }}
          >
            Pending…
          </span>
        ) : addState === 'error' ? (
          <span style={{ fontSize: 11, color: 'var(--coral)', padding: '4px 8px' }}>
            Error
          </span>
        ) : (
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={handleAdd}
          >
            + Add
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check frontend**

```bash
pnpm --filter frontend check-types 2>&1 | tail -20
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/lobby/active-user-row.tsx
git commit -m "feat(frontend): add ActiveUserRow component"
```

---

### Task 8: `ActiveUsersSidebar`, lobby update, and old sidebar deletion

**Files:**
- Create: `apps/frontend/src/lobby/active-users-sidebar.tsx`
- Modify: `apps/frontend/src/pages/lobby.tsx`
- Delete: `apps/frontend/src/friends/lobby-friend-sidebar.tsx`

**Interfaces:**
- Consumes: `useActiveUsers`, `ActiveUserRow`, `useFriendContext` (for pending requests), `apiSearchUsers`

- [ ] **Step 1: Create `apps/frontend/src/lobby/active-users-sidebar.tsx`**

```tsx
import { useCallback, useRef, useState } from 'react';

import type { ActiveUser } from '@repo/schemas/profile';

import { PresetAvatar } from '@/components/preset-avatar';
import { apiSearchUsers } from '@/friends/friend-api';
import { useFriendContext } from '@/friends/use-friend-context';
import { ActiveUserRow } from '@/lobby/active-user-row';
import { useActiveUsers } from '@/lobby/use-active-users';

type FilterMode = 'all' | 'in-room';

function SectionHeader({ label }: { label: string }) {
  return (
    <h3
      style={{
        margin: '12px 0 4px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)'
      }}
    >
      {label}
    </h3>
  );
}

export function ActiveUsersSidebar() {
  const { pendingRequests, respondToRequest } = useFriendContext();
  const { users, loading } = useActiveUsers();

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<ActiveUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQ(q);
    if (searchTimeout.current !== null) clearTimeout(searchTimeout.current);
    if (q.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(() => {
      apiSearchUsers(q.trim())
        .then((results) => {
          setSearchResults(results);
        })
        .catch(() => {
          setSearchResults([]);
        })
        .finally(() => {
          setSearching(false);
        });
    }, 350);
  }, []);

  const friends = users.filter((u) => u.friendshipStatus === 'friend');
  const strangers = users.filter((u) => u.friendshipStatus !== 'friend');

  const applyFilter = (list: ActiveUser[]) =>
    filter === 'in-room' ? list.filter((u) => u.currentRoom !== null) : list;

  const visibleFriends = applyFilter(friends);
  const visibleStrangers = applyFilter(strangers);
  const totalOnline = users.length;

  const showList = searchQ.trim().length < 2;

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        borderLeft: '1px solid var(--border-subtle)',
        padding: '0 0 0 16px',
        maxHeight: 'calc(100dvh - 140px)',
        overflowY: 'auto'
      }}
      className="soft-scroll"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12
        }}
      >
        <span
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}
        >
          Active Users
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-muted)',
            borderRadius: 10,
            padding: '2px 8px',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {totalOnline} online
        </span>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          className="input w-full"
          style={{ padding: '8px 12px', fontSize: 13 }}
          type="search"
          placeholder="Find users…"
          value={searchQ}
          onChange={(e) => { handleSearchChange(e.target.value); }}
        />
        {searchQ.trim().length >= 2 && (
          <div style={{ marginTop: 8 }}>
            {searching && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Searching…
              </p>
            )}
            {!searching && searchResults.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                No users found
              </p>
            )}
            {searchResults.map((u) => (
              <ActiveUserRow key={u.userId} user={u} />
            ))}
          </div>
        )}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <SectionHeader label={`Requests (${String(pendingRequests.length)})`} />
          {pendingRequests.map((req) => (
            <div
              key={req.requestId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <PresetAvatar avatarId={req.fromAvatarId} size={30} />
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {req.fromUserName}
              </p>
              <button
                type="button"
                title="Accept"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16
                }}
                onClick={() => { void respondToRequest(req.requestId, 'accept'); }}
              >
                ✓
              </button>
              <button
                type="button"
                title="Decline"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16
                }}
                onClick={() => { void respondToRequest(req.requestId, 'reject'); }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filter chips */}
      {showList && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {(['all', 'in-room'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => { setFilter(mode); }}
              style={{
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 12,
                border: '1px solid var(--border-medium)',
                background: filter === mode ? 'var(--accent)' : 'transparent',
                color: filter === mode ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: filter === mode ? 700 : 400
              }}
            >
              {mode === 'all' ? 'All' : 'In a room'}
            </button>
          ))}
        </div>
      )}

      {/* Active users list */}
      {showList && (
        <>
          {loading && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Loading…
            </p>
          )}

          {!loading && visibleFriends.length > 0 && (
            <>
              <SectionHeader label="Friends" />
              {visibleFriends.map((u) => (
                <ActiveUserRow key={u.userId} user={u} />
              ))}
            </>
          )}

          {!loading && visibleStrangers.length > 0 && (
            <>
              <SectionHeader label="People" />
              {visibleStrangers.map((u) => (
                <ActiveUserRow key={u.userId} user={u} />
              ))}
            </>
          )}

          {!loading && visibleFriends.length === 0 && visibleStrangers.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0' }}>
              {filter === 'in-room'
                ? 'No one is in a room right now.'
                : 'No one else is online right now.'}
            </p>
          )}
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Update `lobby.tsx` to use `ActiveUsersSidebar`**

In `apps/frontend/src/pages/lobby.tsx`:

1. Replace the import:
   ```ts
   // Remove:
   import { LobbyFriendSidebar } from '@/friends/lobby-friend-sidebar';
   // Add:
   import { ActiveUsersSidebar } from '@/lobby/active-users-sidebar';
   ```

2. Replace the JSX usage:
   ```tsx
   // Remove:
   <LobbyFriendSidebar />
   // Add:
   <ActiveUsersSidebar />
   ```

- [ ] **Step 3: Delete the old sidebar file**

```bash
rm apps/frontend/src/friends/lobby-friend-sidebar.tsx
```

- [ ] **Step 4: Type-check and build frontend**

```bash
pnpm --filter frontend check-types 2>&1 | tail -20
```

Expected: 0 errors (no more references to the deleted file).

- [ ] **Step 5: Full workspace lint + type-check + build**

```bash
pnpm lint && pnpm check-types && pnpm build 2>&1 | tail -30
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/lobby/active-users-sidebar.tsx \
        apps/frontend/src/pages/lobby.tsx
git rm apps/frontend/src/friends/lobby-friend-sidebar.tsx
git commit -m "feat(frontend): replace LobbyFriendSidebar with ActiveUsersSidebar"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task covering it |
|---|---|
| Replace `LobbyFriendSidebar` | Task 8 |
| List all online users | Tasks 4 + 5 (getActiveUsers endpoint) |
| Friends appear before strangers | Task 4 (sort in service) |
| DM button for friends | Task 7 (ActiveUserRow) |
| Friend request button for strangers | Task 7 |
| "Pending…" if request already sent | Task 7 (optimistic state) |
| Room indicator with name | Task 7 |
| "Join" button for public rooms | Task 7 |
| Incoming friend requests section | Task 8 (from FriendContext) |
| User search (all users, online and offline) | Tasks 4 (searchUsers update) + 8 |
| Online count badge | Task 8 |
| Mutual friends count for strangers | Tasks 3 (findMutualFriendCounts) + 4 |
| "In a room" filter chip | Task 8 |
| `ActiveUser` Zod schema | Task 1 |
| `getActiveUsersContract` | Task 2 |
| `GET /api/users/active` endpoint | Task 5 |
| 3s polling hook | Task 6 |

All spec requirements are covered. No gaps.
