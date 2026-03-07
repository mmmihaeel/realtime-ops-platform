import { Controller, Get } from '@nestjs/common';
import { Public } from '@app/auth/public.decorator';

@Controller('health')
export class RealtimeHealthController {
  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
