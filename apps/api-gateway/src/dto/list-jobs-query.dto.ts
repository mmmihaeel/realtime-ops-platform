import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common/pagination-query.dto';
import { JobStatus } from '@app/core/enums';

export class ListJobsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'priority', 'updatedAt'])
  sortBy?: 'createdAt' | 'priority' | 'updatedAt';
}
