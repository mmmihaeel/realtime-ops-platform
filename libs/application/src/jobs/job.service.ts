import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { JobEntity, OperatorActionEntity, ProcessingAttemptEntity } from '@app/core/entities';
import { AuditActorType, EntityType, JobStatus, NotificationType } from '@app/core/enums';
import type { PaginatedResult, SortOrder } from '@app/core/domain';
import { RabbitMqService } from '@app/messaging/rabbitmq.service';
import { QUEUES } from '@app/messaging/messaging.constants';
import { AuditService } from '@app/application/audit/audit.service';
import { NotificationService } from '@app/application/notifications/notification.service';
import { RealtimeEventPublisher } from '@app/application/events/realtime-event-publisher.service';

export interface CreateJobInput {
  name: string;
  type: string;
  payload: Record<string, unknown>;
  priority: number;
  maxAttempts: number;
  operatorId: string;
}

export interface JobQuery {
  page: number;
  limit: number;
  status?: JobStatus;
  type?: string;
  search?: string;
  sortBy?: 'createdAt' | 'priority' | 'updatedAt';
  sortOrder: SortOrder;
}

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(ProcessingAttemptEntity)
    private readonly attemptRepository: Repository<ProcessingAttemptEntity>,
    @InjectRepository(OperatorActionEntity)
    private readonly operatorActionRepository: Repository<OperatorActionEntity>,
    private readonly rabbitMqService: RabbitMqService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly realtimeEventPublisher: RealtimeEventPublisher,
  ) {}

  async create(input: CreateJobInput): Promise<JobEntity> {
    const job = await this.jobRepository.save(
      this.jobRepository.create({
        name: input.name,
        type: input.type,
        payload: input.payload,
        priority: input.priority,
        maxAttempts: input.maxAttempts,
        status: JobStatus.QUEUED,
        attemptCount: 0,
        lastError: null,
        startedAt: null,
        completedAt: null,
      }),
    );

    await this.operatorActionRepository.save(
      this.operatorActionRepository.create({
        operatorId: input.operatorId,
        action: 'job.create',
        targetType: EntityType.JOB,
        targetId: job.id,
        payload: {
          type: job.type,
          priority: job.priority,
        },
      }),
    );

    await this.auditService.log({
      actorType: AuditActorType.OPERATOR,
      actorId: input.operatorId,
      action: 'job.created',
      entityType: EntityType.JOB,
      entityId: job.id,
      metadata: {
        type: job.type,
        priority: job.priority,
        maxAttempts: job.maxAttempts,
      },
    });

    const notification = await this.notificationService.create({
      type: NotificationType.JOB_STATUS,
      message: `Job ${job.name} queued`,
      metadata: {
        jobId: job.id,
        status: job.status,
      },
    });

    await this.rabbitMqService.publishToQueue(QUEUES.JOB_PROCESSING, {
      jobId: job.id,
      reason: 'created',
      requestedBy: input.operatorId,
    });

    await this.realtimeEventPublisher.publishJobCreated({
      jobId: job.id,
      name: job.name,
      type: job.type,
      status: job.status,
      priority: job.priority,
      createdAt: job.createdAt.toISOString(),
    });

    await this.realtimeEventPublisher.publishNotificationCreated({
      notificationId: notification.id,
      type: notification.type,
      message: notification.message,
      createdAt: notification.createdAt.toISOString(),
    });

    return job;
  }

  async list(query: JobQuery): Promise<PaginatedResult<JobEntity>> {
    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.name = ILike(`%${query.search}%`);
    }

    const [items, total] = await this.jobRepository.findAndCount({
      where,
      order: {
        [query.sortBy ?? 'createdAt']: query.sortOrder.toUpperCase() as 'ASC' | 'DESC',
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(Math.ceil(total / query.limit), 1),
      },
    };
  }

  async getById(jobId: string): Promise<JobEntity> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return job;
  }

  async getStatus(jobId: string): Promise<Record<string, unknown>> {
    const job = await this.getById(jobId);
    const attempts = await this.attemptRepository.find({
      where: { jobId },
      order: { attemptNumber: 'DESC' },
    });

    return {
      jobId: job.id,
      status: job.status,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      lastError: job.lastError,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      attempts,
    };
  }

  async retry(jobId: string, operatorId: string): Promise<JobEntity> {
    const job = await this.getById(jobId);

    if (job.status !== JobStatus.FAILED) {
      throw new BadRequestException('Only failed jobs can be retried');
    }

    if (job.attemptCount >= job.maxAttempts) {
      throw new BadRequestException('Job reached maximum retry attempts');
    }

    job.status = JobStatus.QUEUED;
    job.lastError = null;
    job.startedAt = null;
    job.completedAt = null;

    const updated = await this.jobRepository.save(job);

    await this.operatorActionRepository.save(
      this.operatorActionRepository.create({
        operatorId,
        action: 'job.retry',
        targetType: EntityType.JOB,
        targetId: updated.id,
        payload: {
          currentAttemptCount: updated.attemptCount,
          maxAttempts: updated.maxAttempts,
        },
      }),
    );

    await this.auditService.log({
      actorType: AuditActorType.OPERATOR,
      actorId: operatorId,
      action: 'job.retried',
      entityType: EntityType.JOB,
      entityId: updated.id,
      metadata: {
        attemptCount: updated.attemptCount,
        maxAttempts: updated.maxAttempts,
      },
    });

    const notification = await this.notificationService.create({
      type: NotificationType.JOB_STATUS,
      message: `Job ${updated.name} queued for retry`,
      metadata: {
        jobId: updated.id,
        status: updated.status,
      },
    });

    await this.rabbitMqService.publishToQueue(QUEUES.JOB_PROCESSING, {
      jobId: updated.id,
      reason: 'retry',
      requestedBy: operatorId,
    });

    await this.realtimeEventPublisher.publishJobCreated({
      jobId: updated.id,
      name: updated.name,
      type: updated.type,
      status: updated.status,
      priority: updated.priority,
      retried: true,
    });

    await this.realtimeEventPublisher.publishNotificationCreated({
      notificationId: notification.id,
      type: notification.type,
      message: notification.message,
      createdAt: notification.createdAt.toISOString(),
    });

    return updated;
  }
}
