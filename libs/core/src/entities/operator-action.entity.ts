import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'operator_actions' })
@Index(['operatorId', 'createdAt'])
export class OperatorActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  operatorId!: string;

  @Column({ type: 'varchar', length: 80 })
  action!: string;

  @Column({ type: 'varchar', length: 40 })
  targetType!: string;

  @Column({ type: 'uuid', nullable: true })
  targetId!: string | null;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
