import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RedisLockService {
  constructor(private readonly redisService: RedisService) {}

  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const response = await this.redisService.getClient().set(key, '1', 'EX', ttlSeconds, 'NX');
    return response === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    await this.redisService.getClient().del(key);
  }
}
