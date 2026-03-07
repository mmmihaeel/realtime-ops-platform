import {
  AlertEntity,
  AuditEntryEntity,
  IncidentEntity,
  JobEntity,
  NotificationEntity,
} from '@app/core/entities';
import {
  AlertSeverity,
  AlertStatus,
  AuditActorType,
  EntityType,
  IncidentStatus,
  JobStatus,
  NotificationType,
} from '@app/core/enums';
import { AppDataSource } from '@app/database/data-source';

export default async function seedRunner(): Promise<void> {
  const jobRepo = AppDataSource.getRepository(JobEntity);
  const alertRepo = AppDataSource.getRepository(AlertEntity);
  const incidentRepo = AppDataSource.getRepository(IncidentEntity);
  const notificationRepo = AppDataSource.getRepository(NotificationEntity);
  const auditRepo = AppDataSource.getRepository(AuditEntryEntity);

  const now = new Date();
  const seededJobs = await jobRepo.save([
    jobRepo.create({
      name: 'Daily payment reconciliation',
      type: 'financial-reconciliation',
      payload: { source: 'payments', failTimes: 0 },
      status: JobStatus.COMPLETED,
      priority: 3,
      attemptCount: 1,
      maxAttempts: 3,
      lastError: null,
      startedAt: new Date(now.getTime() - 1000 * 60 * 20),
      completedAt: new Date(now.getTime() - 1000 * 60 * 18),
    }),
    jobRepo.create({
      name: 'Warehouse sync',
      type: 'inventory-sync',
      payload: { source: 'warehouse', failTimes: 2 },
      status: JobStatus.FAILED,
      priority: 4,
      attemptCount: 2,
      maxAttempts: 4,
      lastError: 'Processing failed on attempt 2',
      startedAt: new Date(now.getTime() - 1000 * 60 * 10),
      completedAt: new Date(now.getTime() - 1000 * 60 * 9),
    }),
    jobRepo.create({
      name: 'Incident trend indexing',
      type: 'analytics-index',
      payload: { source: 'incident-events', failTimes: 1 },
      status: JobStatus.QUEUED,
      priority: 2,
      attemptCount: 0,
      maxAttempts: 3,
      lastError: null,
      startedAt: null,
      completedAt: null,
    }),
  ]);

  const primaryJob = seededJobs[0];
  const failingJob = seededJobs[1];
  if (!primaryJob || !failingJob) {
    throw new Error('Seed job creation failed');
  }

  const criticalAlert = await alertRepo.save(
    alertRepo.create({
      jobId: failingJob.id,
      source: 'processing-service',
      severity: AlertSeverity.CRITICAL,
      status: AlertStatus.OPEN,
      title: 'Warehouse sync failure threshold reached',
      description: 'Repeated failures exceeded expected retry behavior.',
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedBy: null,
      resolvedAt: null,
    }),
  );

  const incident = await incidentRepo.save(
    incidentRepo.create({
      alertId: criticalAlert.id,
      title: 'Warehouse data freshness incident',
      summary: 'Inventory feed has not updated for 30 minutes.',
      status: IncidentStatus.OPEN,
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedBy: null,
      resolvedAt: null,
    }),
  );

  const notification = await notificationRepo.save(
    notificationRepo.create({
      type: NotificationType.ALERT,
      message: 'Critical alert created for warehouse sync pipeline',
      metadata: {
        jobId: failingJob.id,
        alertId: criticalAlert.id,
        incidentId: incident.id,
      },
      channel: 'operator_feed',
      readAt: null,
    }),
  );

  await auditRepo.save([
    auditRepo.create({
      actorType: AuditActorType.SYSTEM,
      actorId: null,
      action: 'seed.job.created',
      entityType: EntityType.JOB,
      entityId: primaryJob.id,
      metadata: {},
    }),
    auditRepo.create({
      actorType: AuditActorType.SYSTEM,
      actorId: null,
      action: 'seed.alert.created',
      entityType: EntityType.ALERT,
      entityId: criticalAlert.id,
      metadata: {
        incidentId: incident.id,
      },
    }),
    auditRepo.create({
      actorType: AuditActorType.SYSTEM,
      actorId: null,
      action: 'seed.notification.created',
      entityType: EntityType.NOTIFICATION,
      entityId: notification.id,
      metadata: {
        type: notification.type,
      },
    }),
  ]);
}
