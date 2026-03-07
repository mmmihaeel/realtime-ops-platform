import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule, OperatorAuthGuard } from '@app/auth';
import { MessagingModule } from '@app/messaging';
import { RedisModule } from '@app/redis';
import { RealtimeEventConsumer } from './realtime-event.consumer';
import { RealtimeEventsGateway } from './realtime-events.gateway';
import { RealtimeHealthController } from './realtime-health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    MessagingModule,
    RedisModule,
    AuthModule,
  ],
  controllers: [RealtimeHealthController],
  providers: [
    RealtimeEventsGateway,
    RealtimeEventConsumer,
    {
      provide: APP_GUARD,
      useClass: OperatorAuthGuard,
    },
  ],
})
export class RealtimeGatewayModule {}
