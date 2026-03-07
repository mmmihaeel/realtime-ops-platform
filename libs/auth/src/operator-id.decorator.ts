import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export const OperatorId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ operatorId?: string }>();
  return request.operatorId ?? 'unknown';
});
