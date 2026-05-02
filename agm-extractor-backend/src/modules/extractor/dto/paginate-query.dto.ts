import { IsOptional, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
    @IsOptional()
    @IsPositive()
    @Type(() => Number)
    limit?: number = 10; 

    @IsOptional()
    @Min(0)
    @Type(() => Number)
    page?: number = 1; 

    @IsOptional()
    taskId?: string;
}
