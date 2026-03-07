import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertEntity, IncidentEntity, OperatorActionEntity } from '@app/core/entities';
import {
  AlertSeverity,
  AlertStatus,
  AuditActorType,
  EntityType,
  IncidentStatus,
} from '@app/core/enums';
import { AuditService } from '@app/application/audit/audit.service';
import { RealtimeEventPublisher } from '@app/application/events/realtime-event-publisher.service';

export interface CreateAlertInput {
  jobId?: string;
  source: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  operatorId: string;
  createIncident: boolean;
}

export interface AlertQuery {
  status?: AlertStatus;
  severity?: AlertSeverity;
  page: number;
  limit: number;
}

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(AlertEntity)
    private readonly alertRepository: Repository<AlertEntity>,
    @InjectRepository(IncidentEntity)
    private readonly incidentRepository: Repository<IncidentEntity>,
    @InjectRepository(OperatorActionEntity)
    private readonly operatorActionRepository: Repository<OperatorActionEntity>,
    private readonly auditService: AuditService,
    private readonly realtimeEventPublisher: RealtimeEventPublisher,
  ) {}

  async create(
    input: CreateAlertInput,
  ): Promise<{ alert: AlertEntity; incident: IncidentEntity | null }> {
    const alert = await this.alertRepository.save(
      this.alertRepository.create({
        jobId: input.jobId ?? null,
        source: input.source,
        severity: input.severity,
        status: AlertStatus.OPEN,
        title: input.title,
        description: input.description,
      }),
    );

    let incident: IncidentEntity | null = null;
    if (input.createIncident || input.severity === AlertSeverity.CRITICAL) {
      incident = await this.incidentRepository.save(
        this.incidentRepository.create({
          alertId: alert.id,
          title: `Incident: ${alert.title}`,
          summary: alert.description,
          status: IncidentStatus.OPEN,
        }),
      );
    }

    await this.operatorActionRepository.save(
      this.operatorActionRepository.create({
        operatorId: input.operatorId,
        action: 'alert.create',
        targetType: EntityType.ALERT,
        targetId: alert.id,
        payload: {
          severity: alert.severity,
          source: alert.source,
        },
      }),
    );

    await this.auditService.log({
      actorType: AuditActorType.OPERATOR,
      actorId: input.operatorId,
      action: 'alert.created',
      entityType: EntityType.ALERT,
      entityId: alert.id,
      metadata: {
        severity: alert.severity,
        source: alert.source,
        incidentId: incident?.id ?? null,
      },
    });

    await this.realtimeEventPublisher.publishAlertRaised({
      alertId: alert.id,
      severity: alert.severity,
      title: alert.title,
      source: alert.source,
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

    return { alert, incident };
  }

  async list(query: AlertQuery) {
    const qb = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.incident', 'incident')
      .orderBy('alert.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('alert.status = :status', { status: query.status });
    }

    if (query.severity) {
      qb.andWhere('alert.severity = :severity', { severity: query.severity });
    }

    qb.skip((query.page - 1) * query.limit).take(query.limit);
    const [items, total] = await qb.getManyAndCount();

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

  async getById(alertId: string): Promise<AlertEntity> {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId },
      relations: { incident: true },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    return alert;
  }

  async acknowledge(alertId: string, operatorId: string): Promise<AlertEntity> {
    const alert = await this.getById(alertId);

    if (alert.status === AlertStatus.RESOLVED) {
      throw new BadRequestException('Resolved alert cannot be acknowledged');
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedBy = operatorId;
    alert.acknowledgedAt = new Date();

    const updated = await this.alertRepository.save(alert);

    await this.auditService.log({
      actorType: AuditActorType.OPERATOR,
      actorId: operatorId,
      action: 'alert.acknowledged',
      entityType: EntityType.ALERT,
      entityId: alert.id,
      metadata: {},
    });

    await this.realtimeEventPublisher.publishAlertAcknowledged({
      alertId: updated.id,
      acknowledgedBy: operatorId,
      acknowledgedAt: updated.acknowledgedAt?.toISOString(),
    });

    return updated;
  }
}
