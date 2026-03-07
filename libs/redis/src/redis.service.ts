import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL', { infer: true });
    if (!redisUrl) {
      throw new Error('REDIS_URL is required');
    }

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: true,
    });

    await this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    return this.client;
  }
}
