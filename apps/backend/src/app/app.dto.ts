import { createZodDto } from 'nestjs-zod';
import { rootResponseSchema } from '@repo/schemas/root';

export class RootResponseDto extends createZodDto(rootResponseSchema) {}
