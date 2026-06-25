import {
  FRIENDS_ENDPOINT,
  FRIEND_ENDPOINT,
  FRIENDS_REQUESTS_ENDPOINT,
  FRIEND_REQUEST_ENDPOINT
} from '@repo/consts/friends';
import {
  friendActionSuccessSchema,
  friendRequestIdParamsSchema,
  friendRequestResponseSchema,
  friendUserIdParamsSchema,
  respondFriendRequestBodySchema,
  sendFriendRequestBodySchema,
  sendFriendRequestResponseSchema,
  type FriendActionSuccess,
  type FriendRequestIdParams,
  type FriendRequestResponse,
  type FriendUserIdParams,
  type RespondFriendRequestBody,
  type SendFriendRequestBody,
  type SendFriendRequestResponse
} from '@repo/schemas/friends';
import { publicProfileSchema, type PublicProfile } from '@repo/schemas/profile';
import type { EndpointContract } from '../shared/endpoint.js';

export const listFriendsContract: EndpointContract<PublicProfile[]> = {
  method: 'GET',
  path: FRIENDS_ENDPOINT,
  responseSchema: publicProfileSchema.array()
};

export const unfriendContract: EndpointContract<FriendActionSuccess, void, FriendUserIdParams> = {
  method: 'DELETE',
  path: FRIEND_ENDPOINT,
  responseSchema: friendActionSuccessSchema,
  paramsSchema: friendUserIdParamsSchema
};

export const listFriendRequestsContract: EndpointContract<FriendRequestResponse[]> = {
  method: 'GET',
  path: FRIENDS_REQUESTS_ENDPOINT,
  responseSchema: friendRequestResponseSchema.array()
};

export const sendFriendRequestContract: EndpointContract<SendFriendRequestResponse, SendFriendRequestBody> = {
  method: 'POST',
  path: FRIENDS_REQUESTS_ENDPOINT,
  responseSchema: sendFriendRequestResponseSchema,
  bodySchema: sendFriendRequestBodySchema
};

export const respondFriendRequestContract: EndpointContract<
  FriendActionSuccess,
  RespondFriendRequestBody,
  FriendRequestIdParams
> = {
  method: 'PATCH',
  path: FRIEND_REQUEST_ENDPOINT,
  responseSchema: friendActionSuccessSchema,
  bodySchema: respondFriendRequestBodySchema,
  paramsSchema: friendRequestIdParamsSchema
};
