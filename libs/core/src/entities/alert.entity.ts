import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AlertSeverity, AlertStatus } from '@app/core/enums';
import { JobEntity } from './job.entity';
import { IncidentEntity } from './incident.entity';

@Entity({ name: 'alerts' })
@Index(['status', 'severity', 'createdAt'])
export class AlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  jobId!: string | null;

  @ManyToOne(() => JobEntity, (job) => job.alerts, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'jobId' })
  job!: JobEntity | null;

  @Column({ type: 'varchar', length: 30, default: 'system' })
  source!: string;

  @Column({ type: 'enum', enum: AlertSeverity })
  severity!: AlertSeverity;

  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.OPEN })
  status!: AlertStatus;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  acknowledgedBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  resolvedBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => IncidentEntity, (incident) => incident.alert)
  incident!: IncidentEntity | null;
}
