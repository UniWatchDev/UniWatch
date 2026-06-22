import { API_BASE_URL } from '@repo/consts/api';
import { getAuthMeContract } from '@repo/contracts/auth';
import {
  getRoomContract,
  joinRoomContract,
  leaveRoomContract,
  listBlockedUsersContract,
  previewRoomContract,
  unblockUserContract
} from '@repo/contracts/rooms';
import type { BlockedUser, RoomPreview, RoomResponse } from '@repo/schemas/rooms';

function roomPath(template: string, id: string): string {
  return `${API_BASE_URL}${template.replace(':id', encodeURIComponent(id))}`;
}

function blockedUserPath(template: string, id: string, userId: string): string {
  return `${API_BASE_URL}${template
    .replace(':id', encodeURIComponent(id))
    .replace(':userId', encodeURIComponent(userId))}`;
}

async function readErrorDetail(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return typeof data['detail'] === 'string' ? data['detail'] : `HTTP ${String(res.status)}`;
}

export async function fetchRoom(id: string): Promise<RoomResponse> {
  const res = await fetch(roomPath(getRoomContract.path, id), {
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
  return getRoomContract.responseSchema.parse(await res.json());
}

export async function fetchRoomPreview(id: string): Promise<RoomPreview> {
  const res = await fetch(roomPath(previewRoomContract.path, id), {
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
  return previewRoomContract.responseSchema.parse(await res.json());
}

export async function joinRoom(id: string, password: string | undefined): Promise<void> {
  const body = joinRoomContract.bodySchema.parse(password !== undefined ? { password } : {});
  const res = await fetch(roomPath(joinRoomContract.path, id), {
    method: joinRoomContract.method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res));
  }
}

export async function leaveRoom(id: string): Promise<void> {
  const res = await fetch(roomPath(leaveRoomContract.path, id), {
    method: leaveRoomContract.method,
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res));
  }
}

export async function fetchBlockedUsers(id: string): Promise<BlockedUser[]> {
  const res = await fetch(roomPath(listBlockedUsersContract.path, id), {
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res));
  }
  return listBlockedUsersContract.responseSchema.parse(await res.json());
}

export async function unblockUser(id: string, userId: string): Promise<BlockedUser[]> {
  const res = await fetch(blockedUserPath(unblockUserContract.path, id, userId), {
    method: unblockUserContract.method,
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res));
  }
  return unblockUserContract.responseSchema.parse(await res.json());
}

export async function fetchCurrentUserId(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${getAuthMeContract.path}`, {
      headers: { Accept: 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) return null;
    const me = getAuthMeContract.responseSchema.parse(await res.json());
    return me.userId;
  } catch {
    return null;
  }
}
