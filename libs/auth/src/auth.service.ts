import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly expectedToken: string;

  constructor(private readonly configService: ConfigService) {
    this.expectedToken =
      this.configService.get<string>('OPERATOR_API_TOKEN', { infer: true }) ?? 'ops-local-token';
  }

  validateToken(token: string | undefined): boolean {
    return typeof token === 'string' && token.length > 0 && token === this.expectedToken;
  }

  resolveOperatorId(rawValue: string | undefined): string {
    if (rawValue && rawValue.trim().length > 1) {
      return rawValue.trim().toLowerCase();
    }

    throw new UnauthorizedException('Operator identity is required');
  }
}
