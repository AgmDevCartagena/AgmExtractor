import { Injectable, Logger } from '@nestjs/common';
import {
  ProcesosJudiciales,
  TareaProgramada,
  TareaProgramadaRadicado,
} from '@prisma/client';

interface N8nRadicadoWebhookPayload {
  telefono: string;
  cantidad: number;
  radicado: string;
  juzgado: string;
  fecha: string;
  procesos: Array<{
    radicado: string;
    tipoProceso: string | null;
    demandante: string | null;
  }>;
}

interface N8nWebhookPayload {
  telefono: string;
  cantidad: number;
  juzgado: string;
  parteProcesal: string;
  fecha: string;
  procesos: Array<{
    radicado: string;
    tipoProceso: string | null;
    demandante: string | null;
  }>;
}

interface N8nActuacionWebhookPayload {
  telefono: string;
  radicado: string;
  juzgado: string;
  cantidad: number;
  fecha: string;
  actuaciones: Array<{
    fechaActuacion: string | null;
    actuacion: string | null;
    anotacion: string | null;
    estado: string | null;
  }>;
}
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly webhookUrl = process.env.N8N_WEBHOOK_URL as string;

  async sendNotification(
    newProcess: ProcesosJudiciales[],
    task: TareaProgramada,
    telefonoUsuario: string,
  ) {
    if (newProcess.length === 0 || !newProcess) {
      this.logger.log('No new processes to notify.');
      return;
    }

    const payload: N8nWebhookPayload = {
      telefono: telefonoUsuario,
      cantidad: newProcess.length,
      juzgado: task.juzgado,
      parteProcesal: Array.isArray(task.parteProcesal)
        ? task.parteProcesal.join(', ')
        : task.parteProcesal,
      fecha: new Date().toLocaleDateString('es-CO'),
      procesos: newProcess.map((proc) => ({
        radicado: proc.radicado,
        tipoProceso: proc.tipoProceso,
        demandante: proc.demandante,
      })),
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.error(
          `Failed to send notification. Status: ${response.status} - ${response.statusText}`,
        );
      }

      this.logger.log(
        `Notification sent successfully for ${newProcess.length} new processes.`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Falló la conexión con n8n: ${errorMessage}`);
    }
  }

  async sendRadicadoNotification(
    newProcess: any[],
    radicadoTask: TareaProgramadaRadicado,
    telefonoUsuario: string,
  ) {
    if (!newProcess || newProcess.length === 0) return;

    const payload: N8nRadicadoWebhookPayload = {
      telefono: telefonoUsuario,
      cantidad: newProcess.length,
      radicado: radicadoTask.radicado,
      juzgado: radicadoTask.juzgado,
      fecha: new Date().toLocaleDateString('es-CO'),
      procesos: newProcess.map((proc) => ({
        radicado: proc.radicado,
        tipoProceso: proc.tipoProceso,
        demandante: proc.demandante,
      })),
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.error(
          `Failed to send radicado notification. Status: ${response.status}`,
        );
      }

      this.logger.log(
        `Radicado notification sent for ${newProcess.length} processes.`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Falló la conexión con n8n (radicado): ${errorMessage}`,
      );
    }
  }

  async sendActuacionNotification(
    radicado: string,
    juzgado: string,
    nuevasActuaciones: any[],
    telefonoUsuario: string,
  ) {
    if (!nuevasActuaciones || nuevasActuaciones.length === 0) return;

    const payload: N8nActuacionWebhookPayload = {
      telefono: telefonoUsuario,
      radicado,
      juzgado,
      cantidad: nuevasActuaciones.length,
      fecha: new Date().toLocaleDateString('es-CO'),
      actuaciones: nuevasActuaciones.map((act) => ({
        fechaActuacion: act.fechaActuacion ?? null,
        actuacion: act.actuacion ?? null,
        anotacion: act.anotacion ?? null,
        estado: act.estado ?? null,
      })),
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.error(
          `Failed to send actuacion notification. Status: ${response.status}`,
        );
      }

      this.logger.log(
        `Actuacion notification sent for ${nuevasActuaciones.length} actuaciones (radicado ${radicado}).`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Falló la conexión con n8n (actuacion): ${errorMessage}`,
      );
    }
  }
}
