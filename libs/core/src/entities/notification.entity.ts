import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationType } from '@app/core/enums';

@Entity({ name: 'notifications' })
@Index(['type', 'createdAt'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 30, default: 'operator_feed' })
  channel!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'jsonb' })
  metadata!: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
