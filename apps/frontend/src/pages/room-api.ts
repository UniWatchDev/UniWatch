import { API_BASE_URL } from '@repo/consts/api';
import { ROOM_BANNED_MESSAGE } from '@repo/consts/realtime';
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

async function readErrorDetail(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return typeof data['detail'] === 'string' ? data['detail'] : `HTTP ${String(res.status)}`;
}

export function isRoomBanMessage(message: string): boolean {
  return message === ROOM_BANNED_MESSAGE || message.toLowerCase().includes('banned from this room');
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

export async function fetchBlockedUsers(roomId: string): Promise<BlockedUser[]> {
  const params = listBlockedUsersContract.paramsSchema.parse({ id: roomId });
  const path = listBlockedUsersContract.path.replace(':id', encodeURIComponent(params.id));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res));
  }
  return listBlockedUsersContract.responseSchema.parse(await res.json());
}

export async function unblockUser(roomId: string, userId: string): Promise<BlockedUser[]> {
  const params = unblockUserContract.paramsSchema.parse({ id: roomId, userId });
  const path = unblockUserContract.path
    .replace(':id', encodeURIComponent(params.id))
    .replace(':userId', encodeURIComponent(params.userId));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: unblockUserContract.method,
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res));
  }
  return unblockUserContract.responseSchema.parse(await res.json());
}
