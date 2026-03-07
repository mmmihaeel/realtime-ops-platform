import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApplicationModule } from '@app/application';
import { DatabaseModule } from '@app/database';
import { MessagingModule } from '@app/messaging';
import { RedisModule } from '@app/redis';
import { JobProcessingConsumer } from './job-processing.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    MessagingModule,
    RedisModule,
    ApplicationModule,
  ],
  providers: [JobProcessingConsumer],
})
export class ProcessingServiceModule {}
