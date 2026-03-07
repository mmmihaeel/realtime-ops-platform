import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEntryEntity } from '@app/core/entities';
import { AuditActorType, EntityType } from '@app/core/enums';
import type { PaginatedResult } from '@app/core/domain';

export interface CreateAuditEntryInput {
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  entityType: EntityType;
  entityId: string | null;
  metadata: Record<string, unknown>;
}

export interface AuditQuery {
  actorType?: AuditActorType;
  entityType?: EntityType;
  entityId?: string;
  page: number;
  limit: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEntryEntity)
    private readonly auditRepository: Repository<AuditEntryEntity>,
  ) {}

  async log(input: CreateAuditEntryInput): Promise<AuditEntryEntity> {
    const entity = this.auditRepository.create(input);
    return this.auditRepository.save(entity);
  }

  async list(query: AuditQuery): Promise<PaginatedResult<AuditEntryEntity>> {
    const qb = this.auditRepository.createQueryBuilder('audit').orderBy('audit.createdAt', 'DESC');

    if (query.actorType) {
      qb.andWhere('audit.actorType = :actorType', { actorType: query.actorType });
    }

    if (query.entityType) {
      qb.andWhere('audit.entityType = :entityType', { entityType: query.entityType });
    }

    if (query.entityId) {
      qb.andWhere('audit.entityId = :entityId', { entityId: query.entityId });
    }

    const page = query.page;
    const limit = query.limit;
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  }
}
