import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthService } from './auth.service';

@Injectable()
export class OperatorAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      operatorId?: string;
      method: string;
    }>();

    const token = this.extractHeader(request.headers['x-operator-token']);
    if (!this.authService.validateToken(token)) {
      throw new UnauthorizedException('Invalid operator token');
    }

    request.operatorId = this.authService.resolveOperatorId(
      this.extractHeader(request.headers['x-operator-id']),
    );

    return true;
  }

  private extractHeader(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
