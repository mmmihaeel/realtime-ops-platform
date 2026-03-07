import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AttemptStatus } from '@app/core/enums';
import { JobEntity } from './job.entity';

@Entity({ name: 'processing_attempts' })
@Index(['jobId', 'attemptNumber'], { unique: true })
@Index(['status', 'createdAt'])
export class ProcessingAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  jobId!: string;

  @ManyToOne(() => JobEntity, (job) => job.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job!: JobEntity;

  @Column({ type: 'integer' })
  attemptNumber!: number;

  @Column({ type: 'enum', enum: AttemptStatus, default: AttemptStatus.STARTED })
  status!: AttemptStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'integer', nullable: true })
  durationMs!: number | null;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
