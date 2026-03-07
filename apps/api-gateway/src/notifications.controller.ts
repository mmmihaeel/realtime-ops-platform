import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationService } from '@app/application/notifications/notification.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  listNotifications(@Query() query: ListNotificationsQueryDto) {
    return this.notificationService.list({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      type: query.type,
      unreadOnly: query.unreadOnly,
    });
  }
}
