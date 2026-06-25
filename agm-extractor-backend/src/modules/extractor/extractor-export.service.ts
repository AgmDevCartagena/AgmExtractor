import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ExtractorQueryService } from './extractor-query.service';

@Injectable()
export class ExtractorExportService {
    private readonly logger = new Logger(ExtractorExportService.name);

    constructor(
        private readonly query: ExtractorQueryService,
    ) { }

    private formatearFecha(fecha: Date | null): string {
        if (!fecha) return '';
        return new Date(fecha).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }

    async exportUltimaActuacion(userId: string): Promise<Buffer> {
        try {
            const procesos = await this.query.getProcesosUltimaActuacion(userId);

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Última Actuación');

            worksheet.columns = [
                { header: 'Número del proceso', key: 'radicado', width: 30 },
                { header: 'Tipo de proceso', key: 'tipoProceso', width: 30 },
                { header: 'Demandante', key: 'demandante', width: 35 },
                { header: 'Fecha última actuación', key: 'fechaActuacion', width: 22 },
                { header: 'Nombre última actuación', key: 'actuacion', width: 50 },
            ];
            worksheet.getRow(1).font = { bold: true };

            for (const proceso of procesos) {
                const ultima = proceso.actuaciones[0];
                worksheet.addRow({
                    radicado: proceso.radicado,
                    tipoProceso: proceso.tipoProceso,
                    demandante: proceso.demandante,
                    fechaActuacion: this.formatearFecha(ultima?.fechaActuacion ?? null),
                    actuacion: ultima?.actuacion ?? '',
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al generar Excel de última actuación: ${errorMessage}`);
            throw new HttpException(`Fallo al generar el archivo: ${errorMessage}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
