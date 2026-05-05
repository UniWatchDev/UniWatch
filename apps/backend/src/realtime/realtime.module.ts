import { Module } from '@nestjs/common';

import { RealtimeGateway } from '@/realtime/realtime.gateway';

@Module({
  providers: [RealtimeGateway]
})
export class RealtimeModule {}
