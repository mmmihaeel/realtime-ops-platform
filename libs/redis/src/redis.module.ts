import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { RedisLockService } from './redis-lock.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService, RedisLockService],
  exports: [RedisService, RedisLockService],
})
export class RedisModule {}
