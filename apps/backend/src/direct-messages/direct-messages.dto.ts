import { createZodDto } from 'nestjs-zod';

import { directMessageSchema, dmUserIdParamsSchema } from '@repo/schemas/dm';

export type { DirectMessage, DmUserIdParams } from '@repo/schemas/dm';

export class DirectMessageDto extends createZodDto(directMessageSchema) {}
export class DmUserIdParamsDto extends createZodDto(dmUserIdParamsSchema) {}
