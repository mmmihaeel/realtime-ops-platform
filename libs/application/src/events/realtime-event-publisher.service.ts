import { Injectable } from '@nestjs/common';
import { RabbitMqService } from '@app/messaging';
import { ROUTING_KEYS } from '@app/messaging/messaging.constants';

@Injectable()
export class RealtimeEventPublisher {
  constructor(private readonly rabbitMqService: RabbitMqService) {}

  publishJobCreated(payload: Record<string, unknown>): Promise<void> {
    return this.rabbitMqService.publishEvent(ROUTING_KEYS.JOB_CREATED, payload);
  }

  publishJobProcessing(payload: Record<string, unknown>): Promise<void> {
    return this.rabbitMqService.publishEvent(ROUTING_KEYS.JOB_PROCESSING, payload);
  }

  publishJobCompleted(payload: Record<string, unknown>): Promise<void> {
    return this.rabbitMqService.publishEvent(ROUTING_KEYS.JOB_COMPLETED, payload);
  }

  publishJobFailed(payload: Record<string, unknown>): Promise<void> {
    return this.rabbitMqService.publishEvent(ROUTING_KEYS.JOB_FAILED, payload);
  }

  publishAlertRaised(payload: Record<string, unknown>): Promise<void> {
    return this.rabbitMqService.publishEvent(ROUTING_KEYS.ALERT_RAISED, payload);
  }

  publishAlertAcknowledged(payload: Record<string, unknown>): Promise<void> {
    return this.rabbitMqService.publishEvent(ROUTING_KEYS.ALERT_ACKNOWLEDGED, payload);
  }

  publishIncidentUpdated(payload: Record<string, unknown>): Promise<void> {
    return this.rabbitMqService.publishEvent(ROUTING_KEYS.INCIDENT_UPDATED, payload);
  }

  publishNotificationCreated(payload: Record<string, unknown>): Promise<void> {
    return this.rabbitMqService.publishEvent(ROUTING_KEYS.NOTIFICATION_CREATED, payload);
  }
}
