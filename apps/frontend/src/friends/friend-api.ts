import { API_BASE_URL } from '@repo/consts/api';
import { getDmHistoryContract } from '@repo/contracts/dm';
import {
  listFriendRequestsContract,
  listFriendsContract,
  respondFriendRequestContract,
  sendFriendRequestContract,
  unfriendContract
} from '@repo/contracts/friends';
import { getActiveUsersContract, searchUsersContract } from '@repo/contracts/users';
import type { DirectMessage } from '@repo/schemas/dm';
import type { FriendRequestResponse, SendFriendRequestResponse } from '@repo/schemas/friends';
import type { ActiveUser } from '@repo/schemas/profile';

async function authedFetch(
  url: string,
  init?: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> }
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...init?.headers }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((body['detail'] as string | undefined) ?? `HTTP ${String(res.status)}`);
  }
  return res;
}

export async function apiFetchFriends() {
  const res = await authedFetch(`${API_BASE_URL}${listFriendsContract.path}`);
  return listFriendsContract.responseSchema.parse(await res.json());
}

export async function apiFetchPendingRequests(): Promise<FriendRequestResponse[]> {
  const res = await authedFetch(`${API_BASE_URL}${listFriendRequestsContract.path}`);
  return listFriendRequestsContract.responseSchema.parse(await res.json());
}

export async function apiSendFriendRequest(targetUserId: string): Promise<SendFriendRequestResponse> {
  const body = sendFriendRequestContract.bodySchema.parse({ targetUserId });
  const res = await authedFetch(`${API_BASE_URL}${sendFriendRequestContract.path}`, {
    method: sendFriendRequestContract.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return sendFriendRequestContract.responseSchema.parse(await res.json());
}

export async function apiRespondFriendRequest(
  requestId: string,
  action: 'accept' | 'reject'
): Promise<void> {
  const params = respondFriendRequestContract.paramsSchema.parse({ requestId });
  const body = respondFriendRequestContract.bodySchema.parse({ action });
  const path = respondFriendRequestContract.path.replace(
    ':requestId',
    encodeURIComponent(params.requestId)
  );
  await authedFetch(`${API_BASE_URL}${path}`, {
    method: respondFriendRequestContract.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function apiUnfriend(targetUserId: string): Promise<void> {
  const params = unfriendContract.paramsSchema.parse({ userId: targetUserId });
  const path = unfriendContract.path.replace(':userId', encodeURIComponent(params.userId));
  await authedFetch(`${API_BASE_URL}${path}`, { method: unfriendContract.method });
}

export async function apiSearchUsers(q: string): Promise<ActiveUser[]> {
  const query = searchUsersContract.querySchema.parse({ q });
  const qs = new URLSearchParams({ q: query.q }).toString();
  const res = await authedFetch(`${API_BASE_URL}${searchUsersContract.path}?${qs}`);
  return searchUsersContract.responseSchema.parse(await res.json());
}

export async function apiFetchDmHistory(targetUserId: string): Promise<DirectMessage[]> {
  const params = getDmHistoryContract.paramsSchema.parse({ userId: targetUserId });
  const path = getDmHistoryContract.path.replace(':userId', encodeURIComponent(params.userId));
  const res = await authedFetch(`${API_BASE_URL}${path}`);
  return getDmHistoryContract.responseSchema.parse(await res.json());
}

export async function apiGetActiveUsers(): Promise<ActiveUser[]> {
  const res = await authedFetch(`${API_BASE_URL}${getActiveUsersContract.path}`);
  return getActiveUsersContract.responseSchema.parse(await res.json());
}
