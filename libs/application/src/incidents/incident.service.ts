import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertEntity, IncidentEntity, OperatorActionEntity } from '@app/core/entities';
import { AlertStatus, AuditActorType, EntityType, IncidentStatus } from '@app/core/enums';
import { AuditService } from '@app/application/audit/audit.service';
import { RealtimeEventPublisher } from '@app/application/events/realtime-event-publisher.service';

@Injectable()
export class IncidentService {
  constructor(
    @InjectRepository(IncidentEntity)
    private readonly incidentRepository: Repository<IncidentEntity>,
    @InjectRepository(AlertEntity)
    private readonly alertRepository: Repository<AlertEntity>,
    @InjectRepository(OperatorActionEntity)
    private readonly operatorActionRepository: Repository<OperatorActionEntity>,
    private readonly auditService: AuditService,
    private readonly realtimeEventPublisher: RealtimeEventPublisher,
  ) {}

  async acknowledge(incidentId: string, operatorId: string): Promise<IncidentEntity> {
    const incident = await this.getIncident(incidentId);

    if (incident.status === IncidentStatus.RESOLVED) {
      throw new BadRequestException('Resolved incident cannot be acknowledged');
    }

    incident.status = IncidentStatus.ACKNOWLEDGED;
    incident.acknowledgedBy = operatorId;
    incident.acknowledgedAt = new Date();

    const updated = await this.incidentRepository.save(incident);

    if (incident.alertId) {
      await this.alertRepository.update(
        { id: incident.alertId },
        {
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedBy: operatorId,
          acknowledgedAt: new Date(),
        },
      );
    }

    await this.operatorActionRepository.save(
      this.operatorActionRepository.create({
        operatorId,
        action: 'incident.acknowledge',
        targetType: EntityType.INCIDENT,
        targetId: incident.id,
        payload: {},
      }),
    );

    await this.auditService.log({
      actorType: AuditActorType.OPERATOR,
      actorId: operatorId,
      action: 'incident.acknowledged',
      entityType: EntityType.INCIDENT,
      entityId: incident.id,
      metadata: {
        previousStatus: IncidentStatus.OPEN,
      },
    });

    await this.realtimeEventPublisher.publishIncidentUpdated({
      incidentId: updated.id,
      status: updated.status,
      acknowledgedBy: updated.acknowledgedBy,
      alertId: updated.alertId,
    });

    return updated;
  }

  async resolve(incidentId: string, operatorId: string): Promise<IncidentEntity> {
    const incident = await this.getIncident(incidentId);

    if (incident.status === IncidentStatus.RESOLVED) {
      throw new BadRequestException('Incident is already resolved');
    }

    if (incident.status === IncidentStatus.OPEN) {
      incident.acknowledgedAt = new Date();
      incident.acknowledgedBy = operatorId;
    }

    incident.status = IncidentStatus.RESOLVED;
    incident.resolvedBy = operatorId;
    incident.resolvedAt = new Date();

    const updated = await this.incidentRepository.save(incident);

    if (incident.alertId) {
      await this.alertRepository.update(
        { id: incident.alertId },
        {
          status: AlertStatus.RESOLVED,
          resolvedBy: operatorId,
          resolvedAt: new Date(),
        },
      );
    }

    await this.operatorActionRepository.save(
      this.operatorActionRepository.create({
        operatorId,
        action: 'incident.resolve',
        targetType: EntityType.INCIDENT,
        targetId: incident.id,
        payload: {},
      }),
    );

    await this.auditService.log({
      actorType: AuditActorType.OPERATOR,
      actorId: operatorId,
      action: 'incident.resolved',
      entityType: EntityType.INCIDENT,
      entityId: incident.id,
      metadata: {
        alertId: incident.alertId,
      },
    });

    await this.realtimeEventPublisher.publishIncidentUpdated({
      incidentId: updated.id,
      status: updated.status,
      resolvedBy: updated.resolvedBy,
      alertId: updated.alertId,
    });

    return updated;
  }

  private async getIncident(incidentId: string): Promise<IncidentEntity> {
    const incident = await this.incidentRepository.findOne({ where: { id: incidentId } });
    if (!incident) {
      throw new NotFoundException(`Incident ${incidentId} not found`);
    }

    return incident;
  }
}
