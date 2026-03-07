import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  priority?: number = 3;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxAttempts?: number = 3;
}
