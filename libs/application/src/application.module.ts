import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AlertEntity,
  AuditEntryEntity,
  IncidentEntity,
  JobEntity,
  NotificationEntity,
  OperatorActionEntity,
  ProcessingAttemptEntity,
} from '@app/core/entities';
import { AlertService } from './alerts/alert.service';
import { AuditService } from './audit/audit.service';
import { RealtimeEventPublisher } from './events/realtime-event-publisher.service';
import { HealthService } from './health/health.service';
import { IncidentService } from './incidents/incident.service';
import { JobProcessorService } from './jobs/job-processor.service';
import { JobService } from './jobs/job.service';
import { ProcessingStatusService } from './jobs/processing-status.service';
import { NotificationService } from './notifications/notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobEntity,
      ProcessingAttemptEntity,
      AlertEntity,
      IncidentEntity,
      NotificationEntity,
      OperatorActionEntity,
      AuditEntryEntity,
    ]),
  ],
  providers: [
    JobService,
    JobProcessorService,
    ProcessingStatusService,
    AlertService,
    IncidentService,
    NotificationService,
    AuditService,
    RealtimeEventPublisher,
    HealthService,
  ],
  exports: [
    JobService,
    JobProcessorService,
    ProcessingStatusService,
    AlertService,
    IncidentService,
    NotificationService,
    AuditService,
    RealtimeEventPublisher,
    HealthService,
  ],
})
export class ApplicationModule {}
