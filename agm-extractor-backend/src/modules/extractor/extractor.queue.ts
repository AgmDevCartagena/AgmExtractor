import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';

interface QueueTask {
    id: string;
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
}

@Injectable()
export class ExtractionQueue {
    private readonly logger = new Logger(ExtractionQueue.name);
    private readonly MAX_CONCURRENT: number;

    private queue: QueueTask[] = [];
    private running = 0;

    private readonly MIN_FREE_RAM_GB = 0.8;

    private readonly RAM_PER_CHROMIUM_MB = 400;

    constructor() {
        this.MAX_CONCURRENT = this.calculateConcurrency();
        this.logger.log(`Concurrencia máxima calculada: ${this.MAX_CONCURRENT}`);
    }

    private calculateConcurrency(): number {
        const totalRamGB = os.totalmem() / (1024 ** 3);
        const cpus = os.cpus().length;

        const ramDisponibleGB = totalRamGB - 1;
        const maxPorRam = Math.floor((ramDisponibleGB * 1024) / this.RAM_PER_CHROMIUM_MB);

        const maxPorCpu = Math.max(1, cpus - 1);

        const concurrencia = Math.min(maxPorRam, maxPorCpu, 6);

        this.logger.log(
            `RAM total: ${totalRamGB.toFixed(1)}GB | CPUs: ${cpus} | ` +
            `Límite por RAM: ${maxPorRam} | Límite por CPU: ${maxPorCpu} | ` +
            `Concurrencia final: ${concurrencia}`
        );

        return Math.max(1, concurrencia);
    }

    private async waitForAvailableMemory(): Promise<void> {
        const freeGB = () => os.freemem() / (1024 ** 3);

        if (freeGB() >= this.MIN_FREE_RAM_GB) return;

        this.logger.warn(
            `RAM libre insuficiente (${freeGB().toFixed(2)}GB). ` +
            `Esperando al menos ${this.MIN_FREE_RAM_GB}GB...`
        );

        await new Promise<void>((resolve) => {
            const interval = setInterval(() => {
                const free = freeGB();
                this.logger.log(`RAM libre actual: ${free.toFixed(2)}GB`);
                if (free >= this.MIN_FREE_RAM_GB) {
                    clearInterval(interval);
                    resolve();
                }
            }, 5000); 
        });

        this.logger.log('RAM disponible, continuando con la tarea.');
    }

    enqueue<T>(taskId: string, fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ id: taskId, fn, resolve, reject });
            this.logger.log(
                `Tarea [${taskId}] encolada. En cola: ${this.queue.length} | Ejecutando: ${this.running}/${this.MAX_CONCURRENT}`
            );
            this.processNext();
        });
    }

    private processNext() {
        while (this.running < this.MAX_CONCURRENT && this.queue.length > 0) {
            const task = this.queue.shift()!;
            this.running++;

            this.logger.log(
                `Iniciando tarea [${task.id}]. Ejecutando: ${this.running}/${this.MAX_CONCURRENT}`
            );

            (async () => {
                try {
                    await this.waitForAvailableMemory();
                    const result = await task.fn();
                    task.resolve(result);
                } catch (err: any) {
                    this.logger.error(`Tarea [${task.id}] falló: ${err?.message}`);
                    task.reject(err);
                } finally {
                    this.running--;
                    this.logger.log(
                        `Tarea [${task.id}] finalizada. Ejecutando: ${this.running}/${this.MAX_CONCURRENT}`
                    );
                    this.processNext();
                }
            })();
        }
    }

    getStatus() {
        return {
            running: this.running,
            queued: this.queue.length,
            maxConcurrent: this.MAX_CONCURRENT,
            system: {
                freeRamGB: (os.freemem() / (1024 ** 3)).toFixed(2),
                totalRamGB: (os.totalmem() / (1024 ** 3)).toFixed(2),
                cpus: os.cpus().length,
            },
        };
    }
}