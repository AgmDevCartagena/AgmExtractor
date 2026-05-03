import { Injectable, Logger } from '@nestjs/common';
import { ProcesosJudiciales, TareaProgramada } from '@prisma/client';


interface N8nWebhookPayload {
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
@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private readonly webhookUrl = process.env.N8N_WEBHOOK_URL as string;

    async sendNotification(newProcess: ProcesosJudiciales[], task: TareaProgramada) {
        if (newProcess.length === 0 || !newProcess) {
            this.logger.log('No new processes to notify.');
            return;
        }

        const payload: N8nWebhookPayload = {
            cantidad: newProcess.length,
            juzgado: task.juzgado,
            parteProcesal: task.parteProcesal,
            fecha: new Date().toLocaleDateString('es-CO'),
            procesos: newProcess.map(proc => ({
                radicado: proc.radicado,
                tipoProceso: proc.tipoProceso,
                demandante: proc.demandante,
            })),
        }

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                this.logger.error(`Failed to send notification. Status: ${response.status} - ${response.statusText}`);
            }

            this.logger.log(`Notification sent successfully for ${newProcess.length} new processes.`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Falló la conexión con n8n: ${errorMessage}`);
        }
    }
}
