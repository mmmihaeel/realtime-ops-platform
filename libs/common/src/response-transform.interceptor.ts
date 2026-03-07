import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '@app/common/api-response';

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<unknown>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data) => {
        if (typeof data === 'object' && data !== null && 'items' in data && 'meta' in data) {
          return {
            success: true,
            data: (data as { items: unknown[] }).items,
            meta: (data as { meta: Record<string, unknown> }).meta,
          };
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
