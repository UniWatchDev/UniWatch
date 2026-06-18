import { Catch, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import { REALTIME_SERVER_EVENTS } from '@repo/consts/realtime';

/**
 * Catches every error thrown by a gateway handler and emits it to the offending
 * client as `room:error`. Catch-all (`@Catch()`) so realtime errors never fall
 * through to the global HTTP exception filter, which expects an HTTP context.
 */
@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();
    client.emit(REALTIME_SERVER_EVENTS.error, { message: this.resolveMessage(exception) });
  }

  private resolveMessage(exception: unknown): string {
    if (exception instanceof WsException) {
      const error = exception.getError();
      if (typeof error === 'string') {
        return error;
      }
      if ('message' in error) {
        const { message } = error as { message?: unknown };
        if (typeof message === 'string') return message;
      }
      return 'Realtime error';
    }

    this.logger.error(
      'Unhandled realtime exception',
      exception instanceof Error ? exception.stack : undefined
    );
    return 'Internal error';
  }
}
