import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AlertEntity,
  IncidentEntity,
  JobEntity,
  ProcessingAttemptEntity,
} from '@app/core/entities';
import { AlertStatus, IncidentStatus, JobStatus } from '@app/core/enums';

@Injectable()
export class ProcessingStatusService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(AlertEntity)
    private readonly alertRepository: Repository<AlertEntity>,
    @InjectRepository(IncidentEntity)
    private readonly incidentRepository: Repository<IncidentEntity>,
    @InjectRepository(ProcessingAttemptEntity)
    private readonly attemptRepository: Repository<ProcessingAttemptEntity>,
  ) {}

  async getStatusSummary(): Promise<Record<string, unknown>> {
    const [queued, processing, completed, failed, openAlerts, openIncidents, avgDuration] =
      await Promise.all([
        this.jobRepository.count({ where: { status: JobStatus.QUEUED } }),
        this.jobRepository.count({ where: { status: JobStatus.PROCESSING } }),
        this.jobRepository.count({ where: { status: JobStatus.COMPLETED } }),
        this.jobRepository.count({ where: { status: JobStatus.FAILED } }),
        this.alertRepository.count({ where: { status: AlertStatus.OPEN } }),
        this.incidentRepository.count({ where: { status: IncidentStatus.OPEN } }),
        this.attemptRepository
          .createQueryBuilder('attempt')
          .select('AVG(attempt.durationMs)', 'avg')
          .where('attempt.durationMs IS NOT NULL')
          .getRawOne<{ avg: string | null }>(),
      ]);

    return {
      jobs: {
        queued,
        processing,
        completed,
        failed,
      },
      alerts: {
        open: openAlerts,
      },
      incidents: {
        open: openIncidents,
      },
      performance: {
        averageAttemptDurationMs: avgDuration?.avg ? Number(avgDuration.avg) : null,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
