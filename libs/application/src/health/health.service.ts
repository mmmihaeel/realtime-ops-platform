import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '@app/redis/redis.service';
import { RabbitMqService } from '@app/messaging/rabbitmq.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  async getHealth(): Promise<Record<string, unknown>> {
    const [dbHealthy, redisHealthy, rabbitHealthy] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkRabbit(),
    ]);

    return {
      status: dbHealthy && redisHealthy && rabbitHealthy ? 'ok' : 'degraded',
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
        rabbitmq: rabbitHealthy ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const response = await this.redisService.getClient().ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  }

  private async checkRabbit(): Promise<boolean> {
    try {
      await this.rabbitMqService.publishEvent('system.health', {
        source: 'health-check',
      });
      return true;
    } catch {
      return false;
    }
  }
}
