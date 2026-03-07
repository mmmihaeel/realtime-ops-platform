import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditActorType, EntityType } from '@app/core/enums';

@Entity({ name: 'audit_entries' })
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['actorType', 'createdAt'])
export class AuditEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: AuditActorType })
  actorType!: AuditActorType;

  @Column({ type: 'varchar', length: 80, nullable: true })
  actorId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'enum', enum: EntityType })
  entityType!: EntityType;

  @Column({ type: 'uuid', nullable: true })
  entityId!: string | null;

  @Column({ type: 'jsonb' })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
