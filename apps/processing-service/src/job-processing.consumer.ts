import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JobProcessorService } from '@app/application/jobs/job-processor.service';
import { QUEUES } from '@app/messaging/messaging.constants';
import { RabbitMqService } from '@app/messaging/rabbitmq.service';

@Injectable()
export class JobProcessingConsumer implements OnModuleInit {
  private readonly logger = new Logger(JobProcessingConsumer.name);

  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly jobProcessorService: JobProcessorService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMqService.consume(QUEUES.JOB_PROCESSING, async (payload) => {
      const jobId = typeof payload.jobId === 'string' ? payload.jobId : undefined;
      const reason = typeof payload.reason === 'string' ? payload.reason : 'created';
      const requestedBy = typeof payload.requestedBy === 'string' ? payload.requestedBy : 'system';

      if (!jobId) {
        this.logger.warn('Dropped message without jobId');
        return;
      }

      await this.jobProcessorService.process({
        jobId,
        reason,
        requestedBy,
      });
    });

    this.logger.log('Job processing consumer attached');
  }
}
