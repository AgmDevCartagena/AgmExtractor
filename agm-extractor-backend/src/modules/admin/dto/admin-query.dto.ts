import { IsIn, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditQueryDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsString()
  accion?: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;
}

export class ExecutionQueryDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsIn(['RUNNING', 'SUCCESS', 'FAILED'])
  status?: string;
}

export class TimeseriesQueryDto {
  @IsOptional()
  @IsIn(['signups', 'executions', 'procesos'])
  metric?: 'signups' | 'executions' | 'procesos' = 'signups';

  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  range?: '7d' | '30d' | '90d' = '30d';
}
