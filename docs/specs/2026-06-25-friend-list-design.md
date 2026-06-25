# Friend List Feature — Design Spec

**Date:** 2026-06-25
**Branch:** feature/friend-list
**Status:** Approved, ready for implementation

---

## Context

UniWatch is a monorepo (NestJS backend, React/Vite frontend, Next.js web). The app lets users create rooms and watch movies together in real-time via Socket.IO. The friend list feature adds social infrastructure: friend requests, friend presence, DMs, and visual indicators for friends in rooms.

---

## Decisions Made

| Question | Decision |
|---|---|
| Architecture | Separate `FriendsModule` + `DirectMessagesModule`, matching how `rooms/` is split from `realtime/` |
| DM history | Persisted in MongoDB, API caps at last 50 per conversation |
| Room join notification | Banner + persistent "currently in room X" indicator on friend list |
| Mutual requests | Auto-accept (if Bob already sent Alice a request, Alice sending one back auto-friends them) |
| Banners in fullscreen | Suppressed — no banners during fullscreen/focus mode (client-side gate via `document.fullscreenElement`) |
| `isProfilePrivate` | Enforced for the first time here — private profiles excluded from username search |

---

## Data Model

### 1. `UserRecord` changes (`apps/backend/src/auth/user.schema.ts`)

Add one field:
```typescript
@Prop({ type: [{ type: Types.ObjectId, ref: 'UserRecord' }], default: [] })
friends!: Types.ObjectId[];
```

### 2. New: `FriendRequest` collection (`apps/backend/src/friends/friend-request.schema.ts`)

```typescript
{
  from:       ObjectId  // ref UserRecord
  to:         ObjectId  // ref UserRecord
  status:     'pending' | 'accepted' | 'rejected'
  createdAt:  Date
  updatedAt:  Date
}
```

Indexes:
- `{ from, to }` unique — prevents duplicate requests
- `{ to, status }` — fast inbox query (pending requests to me)

### 3. New: `DirectMessage` collection (`apps/backend/src/direct-messages/direct-message.schema.ts`)

```typescript
{
  conversationId: string  // canonical sorted pair: `${minId}_${maxId}`
  from:           ObjectId  // ref UserRecord
  content:        string  // max 500 chars
  createdAt:      Date
}
```

Index: `{ conversationId, createdAt: -1 }`. Store everything; API always returns last 50.

---

## HTTP API

All endpoints require authenticated session (HttpOnly JWT cookie).

### User search
```
GET /api/users/search?q=:username
```
- Partial match on `userName` (case-insensitive)
- Excludes: private profiles (`isProfilePrivate: true`), the requesting user, existing friends, users with a pending request in either direction
- Returns: `PublicProfile[]`
- Lives in the existing `UsersController` under `apps/backend/src/users/` (module already exists, gains a new route)

### Friends
```
GET    /api/friends                      → PublicProfile[] (friend list)
DELETE /api/friends/:userId              → 204 (bidirectional removal)
```

### Friend requests
```
GET   /api/friends/requests              → FriendRequestResponse[] (incoming pending)
POST  /api/friends/requests              → 201 { requestId } body: { targetUserId }
PATCH /api/friends/requests/:requestId   → 200 body: { action: 'accept' | 'reject' }
```

### DMs
```
GET /api/dm/:userId                      → DirectMessage[] (last 50, requires friendship)
```

---

## Real-time Events

### New constants in `@repo/consts/src/realtime/realtime.consts.ts`

**Client → Server (REALTIME_CLIENT_EVENTS additions):**
```typescript
friendRequestSend:    'friend:request-send'     // { targetUserId }
friendRequestRespond: 'friend:request-respond'  // { requestId, action: 'accept'|'reject' }
friendRemove:         'friend:remove'           // { targetUserId }
dmSend:               'dm:send'                 // { targetUserId, content }
```

**Server → Client (REALTIME_SERVER_EVENTS additions):**
```typescript
friendRequestReceived: 'friend:request-received'  // { requestId, requester: PublicProfile }
friendRequestAccepted: 'friend:request-accepted'  // { requestId, friend: PublicProfile }
friendOnline:          'friend:online'            // { userId, userName, avatarId, currentRoomId?, currentRoomName? }
friendOffline:         'friend:offline'           // { userId }
friendJoinedRoom:      'friend:joined-room'       // { userId, roomId, roomName }
friendLeftRoom:        'friend:left-room'         // { userId }
dmReceived:            'dm:received'              // { messageId, fromUserId, content, createdAt }
```

### Extended `connection:ack`

When a socket connects, the existing `connection:ack` payload is extended to include:
```typescript
friends: Array<{
  userId: string
  userName: string
  avatarId: string
  isOnline: boolean
  currentRoomId?: string
  currentRoomName?: string
}>
pendingRequests: Array<{ requestId: string, requester: PublicProfile }>
```

This hydrates the lobby friend panel on connect without an extra HTTP call.

---

## Backend Module Structure

### `apps/backend/src/friends/`
```
friend-request.schema.ts      - Mongoose schema + document type
friend-request.repository.ts  - DB queries
friends.service.ts             - business logic (send, respond, remove, get list)
friends.controller.ts          - REST handlers
friends.module.ts
```

### `apps/backend/src/direct-messages/`
```
direct-message.schema.ts
direct-message.repository.ts
direct-messages.service.ts
direct-messages.controller.ts
direct-messages.module.ts
```

### `apps/backend/src/realtime/` additions
```
services/global-presence.service.ts   - Map<userId, Set<socketId>> server-wide registry
handlers/friend-gateway.handler.ts    - socket event handlers, delegates to FriendsService/DmService
```

`GlobalPresenceService` is separate from the existing `ConnectionRegistryService` (which is room-scoped). Public interface:
```typescript
registerSocket(userId: string, socketId: string): void
removeSocket(userId: string, socketId: string): boolean  // true if user now fully offline
isOnline(userId: string): boolean
getOnlineFriendIds(friendIds: string[]): string[]
getSocketsForUser(userId: string): string[]
```

### `apps/backend/src/users/` (existing, extended)
`UsersController` gains `GET /search` route. `UsersService` gains `searchByUsername(viewerUserId, q)` enforcing `isProfilePrivate`.

---

## Schemas Package Changes

New subpaths added to `packages/schemas/package.json`:
- `./friends` — `friendRequestSchema`, `friendRequestResponseSchema`, `publicFriendPresenceSchema`
- `./dm` — `directMessageSchema`, `dmConversationSchema`

Update `packages/schemas/src/realtime/realtime.schemas.ts` to extend the `connectionAckSchema` with `friends` and `pendingRequests` arrays.

Update `@repo/contracts` with new subpaths:
- `./friends` — contracts for all `/api/friends/*` endpoints
- `./dm` — contract for `GET /api/dm/:userId`
- `./users` — contract for `GET /api/users/search`

---

## Key Flows

### Friend Request
```
Alice sends request → FriendsService.sendRequest(alice, bob)
  ├─ Already friends? → 409
  ├─ Duplicate request from Alice? → 409
  ├─ Bob already sent Alice a request? → auto-accept (mutual)
  │    → push IDs into both friends arrays
  │    → emit friend:request-accepted to both parties
  └─ Otherwise: persist FriendRequest{status:'pending'}
       → if Bob online: emit friend:request-received to Bob's sockets
       → Bob accepts via banner or profile page
            → PATCH /api/friends/requests/:id { action: 'accept' }
            → mark accepted, push IDs into both friends arrays
            → emit friend:request-accepted to Alice's sockets
```

### Online Presence
```
Socket connect (OnGatewayConnection)
  → GlobalPresenceService.registerSocket(userId, socketId)
  → fetch user's friend list from DB
  → for each online friend: emit friend:online to their sockets
  → include enriched friends list + pendingRequests in connection:ack

Socket disconnect (OnGatewayDisconnect)
  → GlobalPresenceService.removeSocket(userId, socketId)
  → if fully offline (set empty): emit friend:offline to online friends' sockets
```

### Room Join Notifying Friends
```
Existing room:join handler (after user is added to room)
  → fetch joiner's friend list
  → for each online friend: emit friend:joined-room { userId, roomId, roomName }

Existing room:leave / disconnect path
  → emit friend:left-room to online friends
```

### DM
```
dm:send { targetUserId, content }
  → verify Alice and Bob are friends (reject if not)
  → conversationId = [alice, bob].sort().join('_')
  → persist DirectMessage { conversationId, from: alice, content }
  → if Bob online: emit dm:received to Bob's sockets
```

### Unfriend
```
DELETE /api/friends/:userId
  → $pull userId from requester's friends array
  → $pull requesterId from target's friends array
  → no real-time notification emitted
```

---

## Frontend Integration Points

| Feature | Location |
|---|---|
| Username search | Lobby — friend panel search bar |
| Send friend request | Room user list (action per user) + lobby search results |
| Friend request banner | Global overlay, suppressed when `document.fullscreenElement !== null` |
| Pending requests list | Profile / personal space page |
| Friend list with online status + room | Lobby friend panel + profile page |
| Remove friend | Profile / personal space page |
| DM window | Lobby — slide-out panel, one per conversation |
| Sparkling friend name in room chat | Room chat component — check sender `userId` against friend list in client state |
| Friend joined-room banner | Same global overlay as friend request banners |

---

## Verification Plan

1. **Friend request flow**: Two browser tabs (different users) — search username, send request, see banner on other tab, accept, both show as friends.
2. **Mutual auto-accept**: Both tabs send requests to each other before either accepts — should auto-friend.
3. **Online presence**: Friend connects → first tab sees `friend:online` banner. Friend closes tab → `friend:offline`.
4. **Room join notification**: Friend joins a room → banner appears + lobby friend list shows room name.
5. **DM**: Send message in both directions, verify real-time delivery. Reload page, verify last 50 messages load via `GET /api/dm/:userId`.
6. **Sparkling name**: In room chat, friend's message name has sparkle animation; non-friend does not.
7. **Focus mode suppress**: Enter fullscreen in player — confirm no banners fire for any friend events.
8. **Unfriend bidirectional**: Remove friend from profile — verify removed from both users' friend lists.
9. **Private profile search**: User with `isProfilePrivate: true` does not appear in search results.
10. `pnpm lint && pnpm check-types && pnpm build` passes clean.
