# Active Users Sidebar - Design Spec

**Date:** 2026-06-27
**Branch:** feature/active-users-list
**Replaces:** `LobbyFriendSidebar`

---

## Overview

Replace the existing `LobbyFriendSidebar` (240px right panel in the lobby) with an `ActiveUsersSidebar` that shows all currently online platform users, with friends listed first. Includes user search, incoming friend request management, and contextual actions per user (DM, add friend, join room).

---

## Architecture & Data Flow

### Primary data source: REST poll

A new `GET /api/users/active` endpoint is the single source of truth for the active users list. The frontend polls it every 3s - consistent with the existing room list polling pattern (`REFRESH_INTERVAL_MS = 2_000` in `lobby.tsx`).

The endpoint returns only online users (excludes the caller), enriched with friendship status and room context. The existing `FriendContext` socket events are untouched - they continue to power DM alerts and friend banners independently of this panel.

### User search

The existing `GET /api/users/search?q=` endpoint is extended to include `friendshipStatus` per result. Search results show online and offline users alike, so you can find and add friends who aren't currently active.

### Pending requests

Sourced from `FriendContext` (already real-time via socket), same as the current sidebar.

---

## Backend

### New schema: `ActiveUser`

New subpath `@repo/schemas/users`:

```ts
ActiveUser {
  userId: string                        // 24-hex Mongo ObjectId
  userName: string
  firstName: string
  avatarId: AvatarPresetId
  friendshipStatus: 'friend' | 'pending_sent' | 'none'
  mutualFriendsCount: number            // always 0 for friends; computed for strangers
  currentRoom: {
    roomId: string
    roomName: string
    roomType: 'public' | 'private'
  } | null
}
```

### New contract

`@repo/contracts/users`: `GET /api/users/active` → `ActiveUser[]`

### New endpoint

`GET /api/users/active` (JwtAuthGuard) in `UsersController`.

**`UsersService.getActiveUsers(currentUserId: string): Promise<ActiveUser[]>`**

1. Get all online user IDs from `GlobalPresenceService` (excludes self)
2. Batch-fetch public profiles from MongoDB for those IDs
3. Query `FriendRequest` collection to classify each user as `friend | pending_sent | none` relative to the caller
4. For strangers only: compute mutual friends count via a single MongoDB aggregation - count users who appear in both the caller's friend list and the stranger's friend list
5. Attach room presence from `GlobalPresenceService.getUserPresence()` per user; fetch `roomType` from the `Room` collection for the public/private join button logic

### Extended search response

`GET /api/users/search` response changes from `PublicProfile[]` to `ActiveUser[]` (same fields, adds `friendshipStatus`, `mutualFriendsCount`, `currentRoom`). This is a breaking change to the response type - update `@repo/schemas`, `@repo/contracts`, and all call sites in frontend and web apps.

---

## Frontend

### Files changed / added

| File | Change |
|---|---|
| `apps/frontend/src/pages/lobby.tsx` | Replace `LobbyFriendSidebar` import/usage with `ActiveUsersSidebar` |
| `apps/frontend/src/lobby/active-users-sidebar.tsx` | **New** - top-level panel |
| `apps/frontend/src/lobby/active-user-row.tsx` | **New** - shared row for list + search results |
| `apps/frontend/src/lobby/use-active-users.ts` | **New** - polling hook |
| `apps/frontend/src/friends/lobby-friend-sidebar.tsx` | **Delete** |

### Component tree

```
ActiveUsersSidebar (240px right panel)
├── Header
│   └── "Active Users" title + online count badge ("12 online")
├── SearchBar (debounced 350ms)
│   └── SearchResults (visible when query is non-empty)
│       └── ActiveUserRow × N  (search results, any online/offline user)
├── PendingRequests section (hidden when 0 pending)
│   └── PendingRequestRow × N  (accept / reject buttons, from FriendContext)
├── FilterChip bar: [ All | In a room ]
└── ActiveUsersList (polled every 3s)
    ├── "Friends" section header
    │   └── ActiveUserRow × N  (online friends only)
    └── "People" section header
        └── ActiveUserRow × N  (online strangers only)
```

### `use-active-users.ts`

Polls `GET /api/users/active` every 3s using `setInterval`. Returns `{ users: ActiveUser[], loading, error }`. Clears interval on unmount.

### `ActiveUserRow` - layout

```
[ Avatar ]  [ firstName @userName     ]  [ Action button ]
            [ 2 mutual · 🎬 Room Name ]  [ Join ]
```

- **Avatar**: existing avatar rendering by `avatarId`
- **Room badge**: `🎬 Room Name`, clickable - navigates to `/rooms/:roomId/preview`
- **Mutual friends**: shown below name for strangers only, hidden when 0
- **Join button**: shown only when `currentRoom.roomType === 'public'`, calls `POST /api/rooms/:roomId/join`

### Action button states

| `friendshipStatus` | Button label | Enabled | Action |
|---|---|---|---|
| `friend` | DM | yes | `openDm(userId)` from `FriendContext` |
| `pending_sent` | Pending... | no | - |
| `none` | + Add | yes | emit `friend:request-send` via socket |

Action button updates optimistically on click (e.g. `none` → `pending_sent`) without waiting for the next poll.

### Filter chip

"In a room" filters the active list client-side (`users.filter(u => u.currentRoom !== null)`). No re-fetch. Online count badge always reflects the unfiltered count.

---

## What is NOT changing

- `FriendContext` and its socket event listeners - untouched
- DM system - untouched
- Friend alert banners - untouched
- Room join flow - reuses existing implementation
- `LobbyFriendSidebar` user search logic is replicated in `ActiveUsersSidebar` (same debounce pattern, same endpoint)

---

## Edge cases

- **Self excluded**: backend excludes `currentUserId` from `GET /api/users/active` results
- **Friend request already sent**: `friendshipStatus: 'pending_sent'` disables the add button
- **Private room**: Join button hidden; room badge still shows room name
- **0 online users**: empty state per section ("No friends online" / "No one else online")
- **Search while active list is loading**: search results render independently, no loading conflict
- **Optimistic add-friend click**: immediately flip button to "Pending..." in local state; revert on socket error
