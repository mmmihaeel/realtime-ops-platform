import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@app/common/pagination-query.dto';
import { AlertSeverity, AlertStatus } from '@app/core/enums';

export class ListAlertsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;
}
