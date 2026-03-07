import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AlertSeverity } from '@app/core/enums';

export class CreateAlertDto {
  @IsOptional()
  @IsString()
  jobId?: string;

  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  createIncident?: boolean = false;
}
