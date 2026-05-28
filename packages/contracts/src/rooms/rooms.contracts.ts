import { ROOMS_ENDPOINT, ROOM_ENDPOINT, ROOM_PREVIEW_ENDPOINT, ROOM_JOIN_ENDPOINT, ROOM_LEAVE_ENDPOINT } from '@repo/consts/rooms';
import {
  createRoomSchema,
  deleteRoomResponseSchema,
  joinRoomBodySchema,
  joinRoomResponseSchema,
  roomIdParamsSchema,
  roomPreviewSchema,
  roomResponseSchema,
  updateRoomSchema,
  type CreateRoomInput,
  type DeleteRoomResponse,
  type JoinRoomBody,
  type JoinRoomResponse,
  type RoomIdParams,
  type RoomPreview,
  type RoomResponse,
  type UpdateRoomInput
} from '@repo/schemas/rooms';
import type { EndpointContract } from '../shared/endpoint.js';

export const listRoomsContract: EndpointContract<RoomResponse[]> = {
  method: 'GET',
  path: ROOMS_ENDPOINT,
  responseSchema: roomResponseSchema.array()
};

export const getRoomContract: EndpointContract<RoomResponse, void, RoomIdParams> = {
  method: 'GET',
  path: ROOM_ENDPOINT,
  responseSchema: roomResponseSchema,
  paramsSchema: roomIdParamsSchema
};

export const createRoomContract: EndpointContract<RoomResponse, CreateRoomInput> = {
  method: 'POST',
  path: ROOMS_ENDPOINT,
  responseSchema: roomResponseSchema,
  bodySchema: createRoomSchema
};

export const updateRoomContract: EndpointContract<RoomResponse, UpdateRoomInput, RoomIdParams> = {
  method: 'PATCH',
  path: ROOM_ENDPOINT,
  responseSchema: roomResponseSchema,
  bodySchema: updateRoomSchema,
  paramsSchema: roomIdParamsSchema
};

export const deleteRoomContract: EndpointContract<DeleteRoomResponse, void, RoomIdParams> = {
  method: 'DELETE',
  path: ROOM_ENDPOINT,
  responseSchema: deleteRoomResponseSchema,
  paramsSchema: roomIdParamsSchema
};

export const previewRoomContract: EndpointContract<RoomPreview, void, RoomIdParams> = {
  method: 'GET',
  path: ROOM_PREVIEW_ENDPOINT,
  responseSchema: roomPreviewSchema,
  paramsSchema: roomIdParamsSchema
};

export const joinRoomContract: EndpointContract<JoinRoomResponse, JoinRoomBody, RoomIdParams> = {
  method: 'POST',
  path: ROOM_JOIN_ENDPOINT,
  responseSchema: joinRoomResponseSchema,
  bodySchema: joinRoomBodySchema,
  paramsSchema: roomIdParamsSchema
};

export const leaveRoomContract: EndpointContract<JoinRoomResponse, void, RoomIdParams> = {
  method: 'DELETE',
  path: ROOM_LEAVE_ENDPOINT,
  responseSchema: joinRoomResponseSchema,
  paramsSchema: roomIdParamsSchema
};
