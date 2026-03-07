import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IncidentStatus } from '@app/core/enums';
import { AlertEntity } from './alert.entity';

@Entity({ name: 'incidents' })
@Index(['status', 'createdAt'])
export class IncidentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true, unique: true })
  alertId!: string | null;

  @OneToOne(() => AlertEntity, (alert) => alert.incident, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'alertId' })
  alert!: AlertEntity | null;

  @Column({ type: 'varchar', length: 140 })
  title!: string;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.OPEN })
  status!: IncidentStatus;

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
}
