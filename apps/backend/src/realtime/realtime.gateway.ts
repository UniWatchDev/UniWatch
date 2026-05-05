import { Logger } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  type WsResponse
} from '@nestjs/websockets';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true
  }
})
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);

  @SubscribeMessage('ping')
  handlePing(): WsResponse<string> {
    this.logger.debug('ping');
    return { event: 'pong', data: 'pong' };
  }
}
