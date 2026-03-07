import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProcessingStatusService } from '@app/application/jobs/processing-status.service';

@ApiTags('processing')
@Controller('processing')
export class ProcessingController {
  constructor(private readonly processingStatusService: ProcessingStatusService) {}

  @Get('status')
  getProcessingStatus() {
    return this.processingStatusService.getStatusSummary();
  }
}
