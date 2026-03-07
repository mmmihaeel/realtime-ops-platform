import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ApplicationModule } from '@app/application';
import { AuthModule, OperatorAuthGuard, RedisRateLimitGuard } from '@app/auth';
import { DatabaseModule } from '@app/database';
import { MessagingModule } from '@app/messaging';
import { RedisModule } from '@app/redis';
import { HealthController } from './health.controller';
import { JobsController } from './jobs.controller';
import { AlertsController } from './alerts.controller';
import { IncidentsController } from './incidents.controller';
import { NotificationsController } from './notifications.controller';
import { AuditEntriesController } from './audit-entries.controller';
import { ProcessingController } from './processing.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    MessagingModule,
    RedisModule,
    AuthModule,
    ApplicationModule,
  ],
  controllers: [
    HealthController,
    JobsController,
    AlertsController,
    IncidentsController,
    NotificationsController,
    AuditEntriesController,
    ProcessingController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: OperatorAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RedisRateLimitGuard,
    },
  ],
})
export class ApiGatewayModule {}
