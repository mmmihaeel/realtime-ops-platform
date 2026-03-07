import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RedisService } from '@app/redis/redis.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  private readonly maxRequests: number;
  private readonly windowSeconds: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.maxRequests = Number(
      this.configService.get<string>('RATE_LIMIT_MAX_REQUESTS', { infer: true }) ?? '60',
    );
    this.windowSeconds = Number(
      this.configService.get<string>('RATE_LIMIT_WINDOW_SECONDS', { infer: true }) ?? '60',
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const identifier = request.ip ?? 'unknown-ip';
    const routePath = (request as { route?: { path?: string } }).route?.path;
    const path = routePath ?? request.path;
    const key = `rate-limit:${identifier}:${request.method}:${path}`;

    const redis = this.redisService.getClient();
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, this.windowSeconds);
    }

    if (count > this.maxRequests) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
