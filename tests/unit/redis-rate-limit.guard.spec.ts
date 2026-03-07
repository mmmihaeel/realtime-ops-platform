import { HttpStatus, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { ConfigService } from '@nestjs/config';
import { RedisRateLimitGuard } from '@app/auth/redis-rate-limit.guard';
import type { RedisService } from '@app/redis/redis.service';

describe('RedisRateLimitGuard', () => {
  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as never;

  it('allows requests within the configured limit', async () => {
    const incr = jest.fn().mockResolvedValue(1);
    const expire = jest.fn().mockResolvedValue(1);

    const redisService = {
      getClient: () => ({ incr, expire }),
    } as unknown as RedisService;

    const configService = {
      get: (key: string) => {
        if (key === 'RATE_LIMIT_MAX_REQUESTS') {
          return '2';
        }

        if (key === 'RATE_LIMIT_WINDOW_SECONDS') {
          return '60';
        }

        return undefined;
      },
    } as unknown as ConfigService;

    const reflector = {
      getAllAndOverride: () => false,
    } as unknown as Reflector;

    const guard = new RedisRateLimitGuard(redisService, configService, reflector);

    const result = await guard.canActivate(
      createContext({
        ip: '127.0.0.1',
        method: 'GET',
        path: '/api/v1/jobs',
      }),
    );

    expect(result).toBe(true);
    expect(incr).toHaveBeenCalledTimes(1);
    expect(expire).toHaveBeenCalledTimes(1);
  });

  it('throws 429 when request count exceeds limit', async () => {
    const incr = jest.fn().mockResolvedValue(3);
    const expire = jest.fn().mockResolvedValue(1);

    const redisService = {
      getClient: () => ({ incr, expire }),
    } as unknown as RedisService;

    const configService = {
      get: (key: string) => {
        if (key === 'RATE_LIMIT_MAX_REQUESTS') {
          return '2';
        }

        if (key === 'RATE_LIMIT_WINDOW_SECONDS') {
          return '60';
        }

        return undefined;
      },
    } as unknown as ConfigService;

    const reflector = {
      getAllAndOverride: () => false,
    } as unknown as Reflector;

    const guard = new RedisRateLimitGuard(redisService, configService, reflector);

    await expect(
      guard.canActivate(
        createContext({
          ip: '127.0.0.1',
          method: 'GET',
          path: '/api/v1/jobs',
        }),
      ),
    ).rejects.toMatchObject({
      message: 'Rate limit exceeded',
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('skips rate limiting for public routes', async () => {
    const incr = jest.fn().mockResolvedValue(1);
    const expire = jest.fn().mockResolvedValue(1);

    const redisService = {
      getClient: () => ({ incr, expire }),
    } as unknown as RedisService;

    const configService = {
      get: () => '2',
    } as unknown as ConfigService;

    const reflector = {
      getAllAndOverride: () => true,
    } as unknown as Reflector;

    const guard = new RedisRateLimitGuard(redisService, configService, reflector);

    const result = await guard.canActivate(
      createContext({
        ip: '127.0.0.1',
        method: 'GET',
        path: '/api/v1/health',
      }),
    );

    expect(result).toBe(true);
    expect(incr).not.toHaveBeenCalled();
    expect(expire).not.toHaveBeenCalled();
  });
});
