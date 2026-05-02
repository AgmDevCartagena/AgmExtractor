import { IsString, IsNotEmpty, MaxLength, Matches, IsUUID } from 'class-validator';

export class ScheduleParamsDto {
    @IsString()
    @IsNotEmpty({ message: 'parteProcesal es requerido' })
    @MaxLength(100, { message: 'parteProcesal no puede tener más de 100 caracteres' })
    parteProcesal!: string;

    @IsString()
    @IsNotEmpty({ message: 'juzgado es requerido' })
    juzgado!: string;

    @IsNotEmpty({ message: 'frecuencia es requerida' })
    @Matches(/^(3min|15min|30min|1h|12h|1d|2d|3d)$/, {
        message: 'frecuencia debe ser: 3min, 15min, 30min, 1h, 12h, 1d, 2d o 3d'
    })
    frecuencia!: string;
}

