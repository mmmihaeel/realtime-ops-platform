import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  type ValidationError,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (isHttp) {
      const exceptionResponse = exception.getResponse() as
        | string
        | { message?: string | string[] | ValidationError[]; error?: string };

      const message = this.normalizeMessage(exceptionResponse);
      response.status(status).json({
        success: false,
        error: {
          code: status,
          message,
          path: request.url,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    response.status(status).json({
      success: false,
      error: {
        code: status,
        message: 'Unexpected server error',
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private normalizeMessage(
    payload: string | { message?: string | string[] | ValidationError[]; error?: string },
  ): string {
    if (typeof payload === 'string') {
      return payload;
    }

    if (Array.isArray(payload.message)) {
      return payload.message
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry;
          }

          return Object.values(entry.constraints ?? {}).join(', ');
        })
        .filter(Boolean)
        .join('; ');
    }

    if (typeof payload.message === 'string') {
      return payload.message;
    }

    return payload.error ?? 'Request failed';
  }
}
