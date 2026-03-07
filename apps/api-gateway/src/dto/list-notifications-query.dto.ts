import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@app/common/pagination-query.dto';
import { NotificationType } from '@app/core/enums';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}
