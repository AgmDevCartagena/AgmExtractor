import { IsBoolean } from 'class-validator';

export class UpdateEstadoDto {
    @IsBoolean()
    estado!: boolean;
}
