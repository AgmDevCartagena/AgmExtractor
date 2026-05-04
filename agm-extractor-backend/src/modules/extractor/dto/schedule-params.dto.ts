import { IsString, IsNotEmpty, MaxLength, Matches, IsUUID, IsArray } from 'class-validator';

export class ScheduleParamsDto {
    @IsNotEmpty({ message: 'parteProcesal es requerido' })
    @IsArray({ message: 'parteProcesal debe ser un arreglo de strings' })
    @MaxLength(255, { each: true, message: 'cada elemento de parteProcesal debe tener máximo 255 caracteres' })
    parteProcesal!: string[];

    @IsString()
    @IsNotEmpty({ message: 'juzgado es requerido' })
    juzgado!: string;

    @IsNotEmpty({ message: 'frecuencia es requerida' })
    @Matches(/^(3min|15min|30min|1h|12h|1d|2d|3d)$/, {
        message: 'frecuencia debe ser: 3min, 15min, 30min, 1h, 12h, 1d, 2d o 3d'
    })
    frecuencia!: string;
}

