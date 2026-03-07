import type { ConfigService } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';
import {
  AlertEntity,
  AuditEntryEntity,
  IncidentEntity,
  JobEntity,
  NotificationEntity,
  OperatorActionEntity,
  ProcessingAttemptEntity,
} from '@app/core/entities';
import { InitialSchema1710000000000 } from './migrations/1710000000000-initial-schema';

const entities = [
  JobEntity,
  ProcessingAttemptEntity,
  AlertEntity,
  IncidentEntity,
  NotificationEntity,
  OperatorActionEntity,
  AuditEntryEntity,
];

export const buildTypeOrmOptions = (databaseUrl: string): DataSourceOptions => ({
  type: 'postgres',
  url: databaseUrl,
  entities,
  migrations: [InitialSchema1710000000000],
  synchronize: false,
  logging: false,
});

export const getTypeOrmOptionsFromConfig = (configService: ConfigService): DataSourceOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL', { infer: true });
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  return buildTypeOrmOptions(databaseUrl);
};
