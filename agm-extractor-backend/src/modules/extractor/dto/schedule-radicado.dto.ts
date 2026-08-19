import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class ScheduleRadicadoDto {
  @IsString()
  @IsNotEmpty({ message: 'radicado es requerido' })
  @MaxLength(100, { message: 'radicado debe tener máximo 100 caracteres' })
  radicado!: string;

  @IsString()
  @IsNotEmpty({ message: 'juzgado es requerido' })
  juzgado!: string;

  @IsNotEmpty({ message: 'frecuencia es requerida' })
  @Matches(/^(3min|15min|30min|1h|12h|1d|2d|3d)$/, {
    message: 'frecuencia debe ser: 3min, 15min, 30min, 1h, 12h, 1d, 2d o 3d',
  })
  frecuencia!: string;
}
