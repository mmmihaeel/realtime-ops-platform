import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common/interfaces';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { ApiGatewayModule } from '../../apps/api-gateway/src/api-gateway.module';
import { GlobalExceptionFilter, ResponseTransformInterceptor } from '@app/common';
import { buildTypeOrmOptions } from '@app/database/typeorm.config';
import { JobEntity } from '@app/core/entities';
import { JobStatus } from '@app/core/enums';
import { JobProcessorService } from '@app/application/jobs/job-processor.service';

const AUTH_HEADERS = {
  'x-operator-token': 'ops-local-token',
  'x-operator-id': 'ops-tester',
};

describe('API Gateway E2E', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let jobProcessorService: JobProcessorService;

  beforeAll(async () => {
    const migrationDataSource = new DataSource(buildTypeOrmOptions(process.env.DATABASE_URL!));
    await migrationDataSource.initialize();
    await migrationDataSource.runMigrations();
    await migrationDataSource.destroy();

    moduleRef = await Test.createTestingModule({
      imports: [ApiGatewayModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    await app.init();

    dataSource = app.get(DataSource);
    jobProcessorService = app.get(JobProcessorService);
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE processing_attempts, incidents, alerts, notifications, operator_actions, audit_entries, jobs RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated management requests', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/jobs');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects requests with invalid operator token', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/jobs').set({
      'x-operator-token': 'invalid-token',
      'x-operator-id': 'ops-tester',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects requests with missing operator identity', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/jobs')
      .set({ 'x-operator-token': 'ops-local-token' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('validates job creation payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set(AUTH_HEADERS)
      .send({
        name: 'invalid-job',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('creates jobs and stores audit entries', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set(AUTH_HEADERS)
      .send({
        name: 'Reindex customer records',
        type: 'indexing',
        payload: {
          source: 'crm',
          failTimes: 0,
        },
        priority: 4,
        maxAttempts: 3,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.status).toBe(JobStatus.QUEUED);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/jobs?page=1&limit=10&status=queued')
      .set(AUTH_HEADERS);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.meta.total).toBe(1);

    const auditResponse = await request(app.getHttpServer())
      .get('/api/v1/audit-entries?entityType=job')
      .set(AUTH_HEADERS);

    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.data[0].action).toBe('job.created');
  });

  it('processes jobs and exposes processing status', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set(AUTH_HEADERS)
      .send({
        name: 'Generate operations digest',
        type: 'report',
        payload: {
          failTimes: 0,
        },
      });

    const jobId = createResponse.body.data.id as string;
    await jobProcessorService.process({
      jobId,
      reason: 'created',
      requestedBy: 'ops-tester',
    });

    let statusResponse = await request(app.getHttpServer())
      .get(`/api/v1/jobs/${jobId}/status`)
      .set(AUTH_HEADERS);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (statusResponse.body.data.status === JobStatus.COMPLETED) {
        break;
      }

      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 500);
      });

      statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/status`)
        .set(AUTH_HEADERS);
    }

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.data.status).toBe(JobStatus.COMPLETED);
    expect(statusResponse.body.data.attempts).toHaveLength(1);

    const processingSummary = await request(app.getHttpServer())
      .get('/api/v1/processing/status')
      .set(AUTH_HEADERS);

    expect(processingSummary.status).toBe(200);
    expect(processingSummary.body.data.jobs.completed).toBe(1);
  });

  it('retries failed jobs', async () => {
    const jobRepo = dataSource.getRepository(JobEntity);
    const failedJob = await jobRepo.save(
      jobRepo.create({
        name: 'Retry candidate',
        type: 'sync',
        payload: { failTimes: 1 },
        status: JobStatus.FAILED,
        priority: 3,
        maxAttempts: 3,
        attemptCount: 1,
        lastError: 'Processing failed on attempt 1',
        startedAt: new Date(),
        completedAt: new Date(),
      }),
    );

    const retryResponse = await request(app.getHttpServer())
      .post(`/api/v1/jobs/${failedJob.id}/retry`)
      .set(AUTH_HEADERS)
      .send();

    expect(retryResponse.status).toBe(201);
    expect(retryResponse.body.data.status).toBe(JobStatus.QUEUED);
  });

  it('rejects retry for non-failed jobs', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set(AUTH_HEADERS)
      .send({
        name: 'Queued retry reject',
        type: 'sync',
        payload: { failTimes: 0 },
      });

    const retryResponse = await request(app.getHttpServer())
      .post(`/api/v1/jobs/${createResponse.body.data.id as string}/retry`)
      .set(AUTH_HEADERS)
      .send();

    expect(retryResponse.status).toBe(400);
    expect(retryResponse.body.success).toBe(false);
  });

  it('rejects retry when max attempts are already reached', async () => {
    const jobRepo = dataSource.getRepository(JobEntity);
    const exhaustedJob = await jobRepo.save(
      jobRepo.create({
        name: 'Exhausted retry job',
        type: 'sync',
        payload: { failTimes: 5 },
        status: JobStatus.FAILED,
        priority: 3,
        maxAttempts: 2,
        attemptCount: 2,
        lastError: 'Processing failed on attempt 2',
        startedAt: new Date(),
        completedAt: new Date(),
      }),
    );

    const retryResponse = await request(app.getHttpServer())
      .post(`/api/v1/jobs/${exhaustedJob.id}/retry`)
      .set(AUTH_HEADERS)
      .send();

    expect(retryResponse.status).toBe(400);
    expect(retryResponse.body.success).toBe(false);
  });

  it('supports critical alert to incident acknowledge/resolve flow', async () => {
    const createAlertResponse = await request(app.getHttpServer())
      .post('/api/v1/alerts')
      .set(AUTH_HEADERS)
      .send({
        severity: 'critical',
        title: 'High error rate detected',
        description: 'Error rate exceeded threshold for five minutes.',
        createIncident: true,
      });

    expect(createAlertResponse.status).toBe(201);
    const incidentId = createAlertResponse.body.data.incident.id as string;

    const acknowledgeResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/acknowledge`)
      .set(AUTH_HEADERS)
      .send();

    expect(acknowledgeResponse.status).toBe(201);
    expect(acknowledgeResponse.body.data.status).toBe('acknowledged');

    const resolveResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/resolve`)
      .set(AUTH_HEADERS)
      .send();

    expect(resolveResponse.status).toBe(201);
    expect(resolveResponse.body.data.status).toBe('resolved');
  });

  it('rejects invalid incident transitions after resolution', async () => {
    const createAlertResponse = await request(app.getHttpServer())
      .post('/api/v1/alerts')
      .set(AUTH_HEADERS)
      .send({
        severity: 'critical',
        title: 'Transition guard test',
        description: 'Validates invalid transition behavior.',
        createIncident: true,
      });

    const incidentId = createAlertResponse.body.data.incident.id as string;

    const resolveResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/resolve`)
      .set(AUTH_HEADERS)
      .send();

    expect(resolveResponse.status).toBe(201);
    expect(resolveResponse.body.data.status).toBe('resolved');

    const acknowledgeAfterResolve = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/acknowledge`)
      .set(AUTH_HEADERS)
      .send();

    expect(acknowledgeAfterResolve.status).toBe(400);
    expect(acknowledgeAfterResolve.body.success).toBe(false);

    const secondResolve = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/resolve`)
      .set(AUTH_HEADERS)
      .send();

    expect(secondResolve.status).toBe(400);
    expect(secondResolve.body.success).toBe(false);
  });

  it('creates alert notifications and audit entries for failed processing flows', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set(AUTH_HEADERS)
      .send({
        name: 'Failure audit linkage',
        type: 'failure-check',
        payload: {
          failTimes: 5,
        },
        maxAttempts: 3,
      });

    const jobId = createResponse.body.data.id as string;

    await jobProcessorService.process({
      jobId,
      reason: 'created',
      requestedBy: 'ops-tester',
    });

    const statusResponse = await request(app.getHttpServer())
      .get(`/api/v1/jobs/${jobId}/status`)
      .set(AUTH_HEADERS);

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.data.status).toBe(JobStatus.FAILED);

    const notificationsResponse = await request(app.getHttpServer())
      .get('/api/v1/notifications?type=alert&page=1&limit=20')
      .set(AUTH_HEADERS);

    expect(notificationsResponse.status).toBe(200);
    expect(notificationsResponse.body.meta.total).toBeGreaterThanOrEqual(1);
    const alertNotification = notificationsResponse.body.data.find(
      (entry: { metadata?: { jobId?: string } }) => entry.metadata?.jobId === jobId,
    );
    expect(alertNotification).toBeDefined();

    const jobAuditResponse = await request(app.getHttpServer())
      .get(`/api/v1/audit-entries?entityType=job&entityId=${jobId}&page=1&limit=20`)
      .set(AUTH_HEADERS);

    expect(jobAuditResponse.status).toBe(200);
    expect(
      jobAuditResponse.body.data.some((entry: { action: string }) => entry.action === 'job.failed'),
    ).toBe(true);

    const alertAuditResponse = await request(app.getHttpServer())
      .get('/api/v1/audit-entries?entityType=alert&page=1&limit=20')
      .set(AUTH_HEADERS);

    expect(alertAuditResponse.status).toBe(200);
    expect(
      alertAuditResponse.body.data.some(
        (entry: { action: string }) => entry.action === 'alert.raised',
      ),
    ).toBe(true);
  });

  it('lists notifications with pagination', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set(AUTH_HEADERS)
      .send({
        name: 'Paginated notifications seed job',
        type: 'report',
        payload: { failTimes: 0 },
      });

    const response = await request(app.getHttpServer())
      .get('/api/v1/notifications?page=1&limit=5')
      .set(AUTH_HEADERS);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta.page).toBe(1);
  });

  it('supports sorted and filtered job lists', async () => {
    const jobRepo = dataSource.getRepository(JobEntity);
    await jobRepo.save([
      jobRepo.create({
        name: 'A-queued',
        type: 'sync',
        payload: {},
        status: JobStatus.QUEUED,
        priority: 1,
        maxAttempts: 3,
        attemptCount: 0,
        lastError: null,
        startedAt: null,
        completedAt: null,
      }),
      jobRepo.create({
        name: 'B-processing',
        type: 'sync',
        payload: {},
        status: JobStatus.PROCESSING,
        priority: 5,
        maxAttempts: 3,
        attemptCount: 1,
        lastError: null,
        startedAt: new Date(),
        completedAt: null,
      }),
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/jobs?status=processing&sortBy=priority&sortOrder=desc')
      .set(AUTH_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('B-processing');
  });
});
