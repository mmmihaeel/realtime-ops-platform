import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AlertEntity,
  IncidentEntity,
  JobEntity,
  ProcessingAttemptEntity,
} from '@app/core/entities';
import {
  AlertSeverity,
  AlertStatus,
  AttemptStatus,
  AuditActorType,
  EntityType,
  IncidentStatus,
  JobStatus,
  NotificationType,
} from '@app/core/enums';
import { AuditService } from '@app/application/audit/audit.service';
import { NotificationService } from '@app/application/notifications/notification.service';
import { RealtimeEventPublisher } from '@app/application/events/realtime-event-publisher.service';
import { RedisLockService } from '@app/redis/redis-lock.service';

interface ProcessJobInput {
  jobId: string;
  reason: string;
  requestedBy: string;
}

@Injectable()
export class JobProcessorService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(ProcessingAttemptEntity)
    private readonly attemptRepository: Repository<ProcessingAttemptEntity>,
    @InjectRepository(AlertEntity)
    private readonly alertRepository: Repository<AlertEntity>,
    @InjectRepository(IncidentEntity)
    private readonly incidentRepository: Repository<IncidentEntity>,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly realtimeEventPublisher: RealtimeEventPublisher,
    private readonly redisLockService: RedisLockService,
  ) {}

  async process(input: ProcessJobInput): Promise<void> {
    const lockKey = `job-processing-lock:${input.jobId}`;
    const acquired = await this.redisLockService.acquireLock(lockKey, 60);
    if (!acquired) {
      return;
    }

    let attempt: ProcessingAttemptEntity | null = null;

    try {
      const job = await this.jobRepository.findOne({ where: { id: input.jobId } });
      if (!job) {
        return;
      }

      const attemptNumber = job.attemptCount + 1;
      const startedAt = new Date();
      job.status = JobStatus.PROCESSING;
      job.startedAt = startedAt;
      job.completedAt = null;
      job.lastError = null;
      job.attemptCount = attemptNumber;
      await this.jobRepository.save(job);

      await this.realtimeEventPublisher.publishJobProcessing({
        jobId: job.id,
        attemptNumber,
        startedAt: startedAt.toISOString(),
      });

      await this.auditService.log({
        actorType: AuditActorType.SYSTEM,
        actorId: null,
        action: 'job.processing',
        entityType: EntityType.JOB,
        entityId: job.id,
        metadata: {
          attemptNumber,
          reason: input.reason,
          requestedBy: input.requestedBy,
        },
      });

      attempt = await this.attemptRepository.save(
        this.attemptRepository.create({
          jobId: job.id,
          attemptNumber,
          status: AttemptStatus.STARTED,
          startedAt,
          finishedAt: null,
          durationMs: null,
          errorMessage: null,
        }),
      );

      await this.simulateProcessingLatency();
      const { failed, errorMessage } = this.evaluateFailure(job, attemptNumber);

      if (failed) {
        await this.markFailed(job, attempt, errorMessage);
        return;
      }

      await this.markCompleted(job, attempt);
    } finally {
      await this.redisLockService.releaseLock(lockKey);
    }
  }

  private async markCompleted(job: JobEntity, attempt: ProcessingAttemptEntity): Promise<void> {
    const finishedAt = new Date();
    attempt.status = AttemptStatus.SUCCEEDED;
    attempt.finishedAt = finishedAt;
    attempt.durationMs = finishedAt.getTime() - attempt.startedAt.getTime();
    await this.attemptRepository.save(attempt);

    job.status = JobStatus.COMPLETED;
    job.completedAt = finishedAt;
    job.lastError = null;
    await this.jobRepository.save(job);

    const notification = await this.notificationService.create({
      type: NotificationType.JOB_STATUS,
      message: `Job ${job.name} completed successfully`,
      metadata: {
        jobId: job.id,
        attemptNumber: attempt.attemptNumber,
      },
    });

    await this.auditService.log({
      actorType: AuditActorType.SYSTEM,
      actorId: null,
      action: 'job.completed',
      entityType: EntityType.JOB,
      entityId: job.id,
      metadata: {
        attemptNumber: attempt.attemptNumber,
      },
    });

    await this.realtimeEventPublisher.publishJobCompleted({
      jobId: job.id,
      attemptNumber: attempt.attemptNumber,
      completedAt: finishedAt.toISOString(),
    });

    await this.realtimeEventPublisher.publishNotificationCreated({
      notificationId: notification.id,
      type: notification.type,
      message: notification.message,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  private async markFailed(
    job: JobEntity,
    attempt: ProcessingAttemptEntity,
    errorMessage: string,
  ): Promise<void> {
    const finishedAt = new Date();

    attempt.status = AttemptStatus.FAILED;
    attempt.errorMessage = errorMessage;
    attempt.finishedAt = finishedAt;
    attempt.durationMs = finishedAt.getTime() - attempt.startedAt.getTime();
    await this.attemptRepository.save(attempt);

    job.status = JobStatus.FAILED;
    job.completedAt = finishedAt;
    job.lastError = errorMessage;
    await this.jobRepository.save(job);

    const severity =
      job.attemptCount >= job.maxAttempts ? AlertSeverity.CRITICAL : AlertSeverity.HIGH;

    const alert = await this.alertRepository.save(
      this.alertRepository.create({
        jobId: job.id,
        source: 'processing-service',
        severity,
        status: AlertStatus.OPEN,
        title: `Job processing failed: ${job.name}`,
        description: errorMessage,
      }),
    );

    let incident: IncidentEntity | null = null;
    if (severity === AlertSeverity.CRITICAL) {
      incident = await this.incidentRepository.save(
        this.incidentRepository.create({
          alertId: alert.id,
          title: `Critical incident for job ${job.name}`,
          summary: errorMessage,
          status: IncidentStatus.OPEN,
        }),
      );
    }

    const notification = await this.notificationService.create({
      type: NotificationType.ALERT,
      message: `Alert raised for failed job ${job.name}`,
      metadata: {
        jobId: job.id,
        alertId: alert.id,
        incidentId: incident?.id ?? null,
        severity,
      },
    });

    await this.auditService.log({
      actorType: AuditActorType.SYSTEM,
      actorId: null,
      action: 'job.failed',
      entityType: EntityType.JOB,
      entityId: job.id,
      metadata: {
        errorMessage,
        attemptNumber: attempt.attemptNumber,
      },
    });

    await this.auditService.log({
      actorType: AuditActorType.SYSTEM,
      actorId: null,
      action: 'alert.raised',
      entityType: EntityType.ALERT,
      entityId: alert.id,
      metadata: {
        severity,
        jobId: job.id,
      },
    });

    if (incident) {
      await this.auditService.log({
        actorType: AuditActorType.SYSTEM,
        actorId: null,
        action: 'incident.created',
        entityType: EntityType.INCIDENT,
        entityId: incident.id,
        metadata: {
          alertId: alert.id,
        },
      });
    }

    await this.realtimeEventPublisher.publishJobFailed({
      jobId: job.id,
      attemptNumber: attempt.attemptNumber,
      errorMessage,
      failedAt: finishedAt.toISOString(),
    });

    await this.realtimeEventPublisher.publishAlertRaised({
      alertId: alert.id,
      jobId: job.id,
      severity: alert.severity,
      status: alert.status,
      incidentId: incident?.id ?? null,
    });

    if (incident) {
      await this.realtimeEventPublisher.publishIncidentUpdated({
        incidentId: incident.id,
        status: incident.status,
        alertId: incident.alertId,
      });
    }

    await this.realtimeEventPublisher.publishNotificationCreated({
      notificationId: notification.id,
      type: notification.type,
      message: notification.message,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  private evaluateFailure(
    job: JobEntity,
    attemptNumber: number,
  ): { failed: boolean; errorMessage: string } {
    const shouldFail = job.payload.shouldFail === true;
    const failTimesRaw = job.payload.failTimes;
    const failTimes = typeof failTimesRaw === 'number' ? failTimesRaw : 0;

    const failed = shouldFail || attemptNumber <= failTimes;

    if (!failed) {
      return {
        failed: false,
        errorMessage: '',
      };
    }

    return {
      failed: true,
      errorMessage: `Processing failed on attempt ${attemptNumber}`,
    };
  }

  private async simulateProcessingLatency(): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 120);
    });
  }
}
