import { DM_ENDPOINT } from '@repo/consts/dm';
import {
  directMessageSchema,
  dmUserIdParamsSchema,
  type DirectMessage,
  type DmUserIdParams
} from '@repo/schemas/dm';
import type { EndpointContract } from '../shared/endpoint.js';

export const getDmHistoryContract: EndpointContract<DirectMessage[], void, DmUserIdParams> = {
  method: 'GET',
  path: DM_ENDPOINT,
  responseSchema: directMessageSchema.array(),
  paramsSchema: dmUserIdParamsSchema
};
