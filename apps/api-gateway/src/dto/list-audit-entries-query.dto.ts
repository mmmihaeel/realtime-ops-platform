import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common/pagination-query.dto';
import { AuditActorType, EntityType } from '@app/core/enums';

export class ListAuditEntriesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(AuditActorType)
  actorType?: AuditActorType;

  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @IsOptional()
  @IsString()
  entityId?: string;
}
