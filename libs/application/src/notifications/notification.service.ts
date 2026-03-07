import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '@app/core/entities';
import { NotificationType } from '@app/core/enums';
import type { PaginatedResult } from '@app/core/domain';

export interface CreateNotificationInput {
  type: NotificationType;
  message: string;
  metadata: Record<string, unknown>;
}

export interface NotificationQuery {
  type?: NotificationType;
  unreadOnly?: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationEntity> {
    const entity = this.notificationRepository.create({
      ...input,
      channel: 'operator_feed',
      readAt: null,
    });
    return this.notificationRepository.save(entity);
  }

  async list(query: NotificationQuery): Promise<PaginatedResult<NotificationEntity>> {
    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .orderBy('notification.createdAt', 'DESC');

    if (query.type) {
      qb.andWhere('notification.type = :type', { type: query.type });
    }

    if (query.unreadOnly) {
      qb.andWhere('notification.readAt IS NULL');
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
