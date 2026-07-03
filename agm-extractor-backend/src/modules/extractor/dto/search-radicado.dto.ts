import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SearchRadicadoDto {
    @IsString()
    @IsNotEmpty({ message: 'radicado es requerido' })
    @MaxLength(100, { message: 'radicado debe tener máximo 100 caracteres' })
    radicado!: string;

    @IsString()
    @IsNotEmpty({ message: 'juzgado es requerido' })
    juzgado!: string;
}
