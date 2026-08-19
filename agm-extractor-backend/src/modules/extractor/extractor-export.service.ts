import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ExtractorQueryService } from './extractor-query.service';

@Injectable()
export class ExtractorExportService {
  private readonly logger = new Logger(ExtractorExportService.name);

  constructor(private readonly query: ExtractorQueryService) {}

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
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al generar Excel de última actuación: ${errorMessage}`,
      );
      throw new HttpException(
        `Fallo al generar el archivo: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async exportProcesos(userId: string): Promise<Buffer> {
    try {
      const procesos = await this.query.getProcesosParaExportar(userId);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Procesos');

      worksheet.columns = [
        { header: 'Número del proceso', key: 'radicado', width: 30 },
        { header: 'Tipo de proceso', key: 'tipoProceso', width: 30 },
        { header: 'Demandante', key: 'demandante', width: 35 },
        { header: 'Demandado', key: 'demandado', width: 35 },
        { header: 'Ponente', key: 'ponente', width: 30 },
        { header: 'Corporación', key: 'corporacion', width: 30 },
        { header: 'Clase', key: 'clase', width: 25 },
        { header: 'Subclase', key: 'subclase', width: 25 },
        { header: 'Naturaleza', key: 'naturaleza', width: 25 },
        { header: 'Etapa', key: 'etapa', width: 25 },
        { header: 'Vigente', key: 'vigente', width: 12 },
        { header: 'Fecha radicado', key: 'fechaRadicado', width: 18 },
        { header: 'Fecha presentación', key: 'fechaPresentacion', width: 18 },
        {
          header: 'Fecha descubrimiento',
          key: 'fechaDescubrimiento',
          width: 20,
        },
      ];
      worksheet.getRow(1).font = { bold: true };

      for (const proceso of procesos) {
        worksheet.addRow({
          radicado: proceso.radicado,
          tipoProceso: proceso.tipoProceso ?? '',
          demandante: proceso.demandante ?? '',
          demandado: proceso.demandado ?? '',
          ponente: proceso.ponente ?? '',
          corporacion: proceso.corporacion ?? '',
          clase: proceso.clase ?? '',
          subclase: proceso.subclase ?? '',
          naturaleza: proceso.naturaleza ?? '',
          etapa: proceso.etapa ?? '',
          vigente: proceso.vigente == null ? '' : proceso.vigente ? 'Sí' : 'No',
          fechaRadicado: this.formatearFecha(proceso.fechaRadicado),
          fechaPresentacion: this.formatearFecha(proceso.fechaPresentacion),
          fechaDescubrimiento: this.formatearFecha(proceso.fechaDescubrimiento),
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al generar Excel de procesos: ${errorMessage}`);
      throw new HttpException(
        `Fallo al generar el archivo: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
