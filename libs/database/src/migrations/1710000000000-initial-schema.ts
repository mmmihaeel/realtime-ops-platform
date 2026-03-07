import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."jobs_status_enum" AS ENUM('queued', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(`CREATE TABLE "jobs" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "name" character varying(80) NOT NULL,
      "type" character varying(40) NOT NULL,
      "payload" jsonb NOT NULL,
      "status" "public"."jobs_status_enum" NOT NULL DEFAULT 'queued',
      "priority" integer NOT NULL DEFAULT '3',
      "attemptCount" integer NOT NULL DEFAULT '0',
      "maxAttempts" integer NOT NULL DEFAULT '3',
      "lastError" text,
      "startedAt" TIMESTAMP WITH TIME ZONE,
      "completedAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_jobs_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_jobs_status_createdAt" ON "jobs" ("status", "createdAt")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_jobs_type_status" ON "jobs" ("type", "status")`);

    await queryRunner.query(
      `CREATE TYPE "public"."processing_attempts_status_enum" AS ENUM('started', 'succeeded', 'failed')`,
    );
    await queryRunner.query(`CREATE TABLE "processing_attempts" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "jobId" uuid NOT NULL,
      "attemptNumber" integer NOT NULL,
      "status" "public"."processing_attempts_status_enum" NOT NULL DEFAULT 'started',
      "errorMessage" text,
      "durationMs" integer,
      "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "finishedAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_processing_attempts_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_processing_attempts_job_attempt" UNIQUE ("jobId", "attemptNumber")
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_processing_attempts_status_createdAt" ON "processing_attempts" ("status", "createdAt")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."alerts_severity_enum" AS ENUM('low', 'medium', 'high', 'critical')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."alerts_status_enum" AS ENUM('open', 'acknowledged', 'resolved')`,
    );
    await queryRunner.query(`CREATE TABLE "alerts" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "jobId" uuid,
      "source" character varying(30) NOT NULL DEFAULT 'system',
      "severity" "public"."alerts_severity_enum" NOT NULL,
      "status" "public"."alerts_status_enum" NOT NULL DEFAULT 'open',
      "title" character varying(120) NOT NULL,
      "description" text NOT NULL,
      "acknowledgedBy" character varying(80),
      "acknowledgedAt" TIMESTAMP WITH TIME ZONE,
      "resolvedBy" character varying(80),
      "resolvedAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_alerts_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_alerts_status_severity_createdAt" ON "alerts" ("status", "severity", "createdAt")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."incidents_status_enum" AS ENUM('open', 'acknowledged', 'resolved')`,
    );
    await queryRunner.query(`CREATE TABLE "incidents" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "alertId" uuid,
      "title" character varying(140) NOT NULL,
      "summary" text NOT NULL,
      "status" "public"."incidents_status_enum" NOT NULL DEFAULT 'open',
      "acknowledgedBy" character varying(80),
      "acknowledgedAt" TIMESTAMP WITH TIME ZONE,
      "resolvedBy" character varying(80),
      "resolvedAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_incidents_alert_id" UNIQUE ("alertId"),
      CONSTRAINT "PK_incidents_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_incidents_status_createdAt" ON "incidents" ("status", "createdAt")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('job_status', 'alert', 'incident', 'system')`,
    );
    await queryRunner.query(`CREATE TABLE "notifications" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "type" "public"."notifications_type_enum" NOT NULL,
      "channel" character varying(30) NOT NULL DEFAULT 'operator_feed',
      "message" text NOT NULL,
      "metadata" jsonb NOT NULL,
      "readAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_type_createdAt" ON "notifications" ("type", "createdAt")`,
    );

    await queryRunner.query(`CREATE TABLE "operator_actions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "operatorId" character varying(80) NOT NULL,
      "action" character varying(80) NOT NULL,
      "targetType" character varying(40) NOT NULL,
      "targetId" uuid,
      "payload" jsonb NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_operator_actions_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_operator_actions_operatorId_createdAt" ON "operator_actions" ("operatorId", "createdAt")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."audit_entries_actorType_enum" AS ENUM('system', 'operator')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_entries_entityType_enum" AS ENUM('job', 'alert', 'incident', 'notification', 'processing_attempt', 'operator_action')`,
    );
    await queryRunner.query(`CREATE TABLE "audit_entries" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "actorType" "public"."audit_entries_actorType_enum" NOT NULL,
      "actorId" character varying(80),
      "action" character varying(100) NOT NULL,
      "entityType" "public"."audit_entries_entityType_enum" NOT NULL,
      "entityId" uuid,
      "metadata" jsonb NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_audit_entries_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_entries_entityType_entityId_createdAt" ON "audit_entries" ("entityType", "entityId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_entries_actorType_createdAt" ON "audit_entries" ("actorType", "createdAt")`,
    );

    await queryRunner.query(
      `ALTER TABLE "processing_attempts" ADD CONSTRAINT "FK_processing_attempts_jobId" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_alerts_jobId" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "FK_incidents_alertId" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "incidents" DROP CONSTRAINT "FK_incidents_alertId"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_alerts_jobId"`);
    await queryRunner.query(
      `ALTER TABLE "processing_attempts" DROP CONSTRAINT "FK_processing_attempts_jobId"`,
    );

    await queryRunner.query(`DROP INDEX "public"."IDX_audit_entries_actorType_createdAt"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_entries_entityType_entityId_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE "audit_entries"`);
    await queryRunner.query(`DROP TYPE "public"."audit_entries_entityType_enum"`);
    await queryRunner.query(`DROP TYPE "public"."audit_entries_actorType_enum"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_operator_actions_operatorId_createdAt"`);
    await queryRunner.query(`DROP TABLE "operator_actions"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_type_createdAt"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_incidents_status_createdAt"`);
    await queryRunner.query(`DROP TABLE "incidents"`);
    await queryRunner.query(`DROP TYPE "public"."incidents_status_enum"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_alerts_status_severity_createdAt"`);
    await queryRunner.query(`DROP TABLE "alerts"`);
    await queryRunner.query(`DROP TYPE "public"."alerts_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."alerts_severity_enum"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_processing_attempts_status_createdAt"`);
    await queryRunner.query(`DROP TABLE "processing_attempts"`);
    await queryRunner.query(`DROP TYPE "public"."processing_attempts_status_enum"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_jobs_type_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_jobs_status_createdAt"`);
    await queryRunner.query(`DROP TABLE "jobs"`);
    await queryRunner.query(`DROP TYPE "public"."jobs_status_enum"`);
  }
}
