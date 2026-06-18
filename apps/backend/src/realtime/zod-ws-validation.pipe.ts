import { Injectable } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { ZodType } from 'zod';

/**
 * Validates an inbound socket message body against a Zod schema, throwing a
 * {@link WsException} (mapped to `room:error` by the gateway filter) on failure.
 */
@Injectable()
export class ZodWsValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(
    private readonly schema: ZodType<T>,
    private readonly message = 'Invalid payload'
  ) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new WsException(this.message);
    }
    return result.data;
  }
}
