import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/auth/public.decorator';
import { HealthService } from '@app/application/health/health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }
}
