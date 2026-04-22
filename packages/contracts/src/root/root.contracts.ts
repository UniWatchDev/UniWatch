import { ROOT_ENDPOINT } from '@repo/consts/root';
import { rootResponseSchema, type RootResponse } from '@repo/schemas/root';
import type { EndpointContract } from '../shared/endpoint.js';

export const rootContract: EndpointContract<RootResponse> = {
  method: 'GET',
  path: ROOT_ENDPOINT,
  responseSchema: rootResponseSchema
};
