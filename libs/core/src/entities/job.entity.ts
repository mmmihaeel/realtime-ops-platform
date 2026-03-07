import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobStatus } from '@app/core/enums';
import { ProcessingAttemptEntity } from './processing-attempt.entity';
import { AlertEntity } from './alert.entity';

@Entity({ name: 'jobs' })
@Index(['status', 'createdAt'])
@Index(['type', 'status'])
export class JobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 40 })
  type!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.QUEUED })
  status!: JobStatus;

  @Column({ type: 'integer', default: 3 })
  priority!: number;

  @Column({ type: 'integer', default: 0 })
  attemptCount!: number;

  @Column({ type: 'integer', default: 3 })
  maxAttempts!: number;

  @Column({ type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ProcessingAttemptEntity, (attempt) => attempt.job)
  attempts!: ProcessingAttemptEntity[];

  @OneToMany(() => AlertEntity, (alert) => alert.job)
  alerts!: AlertEntity[];
}
