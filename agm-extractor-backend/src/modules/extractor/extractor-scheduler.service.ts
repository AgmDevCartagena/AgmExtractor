import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ScheduleParamsDto } from './dto/schedule-params.dto';
import { ScheduleRadicadoDto } from './dto/schedule-radicado.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ExtractionQueue } from './extractor.queue';
import { SamaiScraperService } from './samai-scraper.service';

@Injectable()
export class ExtractorSchedulerService implements OnModuleInit {
    private readonly logger = new Logger(ExtractorSchedulerService.name);

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private readonly prisma: PrismaService,
        private readonly extractionQueue: ExtractionQueue,
        private readonly scraper: SamaiScraperService,
    ) { }

    async onModuleInit() {
        try {
            const tasks = await this.prisma.tareaProgramada.findMany({
                where: { activa: true }
            })

            if (tasks.length === 0) {
                this.logger.log(`No hay tareas para restaurar`);
                return
            }

            for (const task of tasks) {
                const cronExpression = this.translateFrecuency(task.frecuencia);
                if (!cronExpression) {
                    this.logger.warn(`Frecuencia no válida para la tarea ${task.id}, omitiendo restauración.`);
                    continue;
                }

                const nameJob = task.id;

                const job = new CronJob(cronExpression, async () => {
                    this.logger.log(`Ejecutando tarea programadas`);
                    try {
                        await this.scraper.extractData(task.id, task.parteProcesal, task.juzgado);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                        this.logger.error(`Error en tarea programada para el usuario ${task.userId}: ${errorMessage}`);
                    }
                })

                this.schedulerRegistry.addCronJob(nameJob, job);
                job.start();
            }

            this.logger.log(`Tareas programadas restauradas: ${tasks.length}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al restaurar tareas programadas: ${errorMessage}`);
        }

        try {
            const radicadoTasks = await this.prisma.tareaProgramadaRadicado.findMany({
                where: { activa: true }
            });

            for (const task of radicadoTasks) {
                const cronExpression = this.translateFrecuency(task.frecuencia);
                if (!cronExpression) {
                    this.logger.warn(`Frecuencia no válida para radicado tarea ${task.id}, omitiendo.`);
                    continue;
                }

                const job = new CronJob(cronExpression, async () => {
                    try {
                        await this.scraper.extractDataByRadicado(task.id, task.radicado, task.juzgado, true);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                        this.logger.error(`Error en tarea radicado [${task.id}]: ${errorMessage}`);
                    }
                });

                this.schedulerRegistry.addCronJob(`radicado_${task.id}`, job);
                job.start();
            }

            this.logger.log(`Tareas de radicado restauradas: ${radicadoTasks.length}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al restaurar tareas de radicado: ${errorMessage}`);
        }
    }

    private translateFrecuency(frecuency: string): string {
        const mapaCron: Record<string, string> = {
            '3min': '*/3 * * * *',
            '15min': '*/15 * * * *',
            '30min': '*/30 * * * *',
            '1h': '0 * * * *',
            '12h': '0 */12 * * *',
            '1d': '0 0 * * *',
            '2d': '0 0 */2 * *',
            '3d': '0 0 */3 * *',
        };
        return mapaCron[frecuency];
    }

    async scheduleExtraction(params: ScheduleParamsDto, userId: string) {
        const { frecuencia, parteProcesal: partesProcesales, juzgado } = params;

        const cronExpression = this.translateFrecuency(frecuencia);
        if (!cronExpression) {
            throw new HttpException('Frecuencia no válida', HttpStatus.BAD_REQUEST);
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);

        const newTask = await this.prisma.tareaProgramada.create({
            data: { userId, frecuencia, parteProcesal: partesProcesales, juzgado },
        });

        const job = new CronJob(cronExpression, () => {
            this.extractionQueue.enqueue(newTask.id, () =>
                this.scraper.extractData(newTask.id, partesProcesales, juzgado)
            ).catch(err =>
                this.logger.error(`Error en tarea [${newTask.id}]: ${err?.message}`)
            );
        });

        this.schedulerRegistry.addCronJob(newTask.id, job);
        job.start();

        // Primera corrida inmediata en background
        this.extractionQueue.enqueue(newTask.id, () =>
            this.scraper.extractData(newTask.id, partesProcesales, juzgado)
        ).catch(err => this.logger.error(`Error en primera corrida [${newTask.id}]: ${err?.message}`));

        this.logger.log(`Tarea [${newTask.id}] creada para usuario ${userId} con frecuencia ${frecuencia}`);

        return {
            message: `Tarea programada creada con éxito`,
            jobName: newTask.id,
            frecuencia,
        };
    }

    async stopScheduledExtraction(jobId: string, userId: string) {
        try {
            const userTask = await this.prisma.tareaProgramada.findFirst({
                where: { id: jobId, userId },
            });

            if (!userTask) {
                throw new HttpException('Tarea no encontrada para este usuario', HttpStatus.NOT_FOUND);
            }

            const job = this.schedulerRegistry.getCronJob(jobId);
            job.stop();
            this.schedulerRegistry.deleteCronJob(jobId);

            await this.prisma.tareaProgramada.update({
                where: { id: jobId },
                data: { activa: false, deletedAt: new Date() },
            });

            this.logger.log(`Tarea [${jobId}] detenida y desactivada.`);
            return { message: 'Tarea cancelada exitosamente' };

        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al detener tarea [${jobId}]: ${msg}`);
            throw new HttpException(`Error al detener tarea: ${msg}`, HttpStatus.BAD_REQUEST);
        }
    }

    getQueueStatus() {
        return this.extractionQueue.getStatus();
    }

    async scheduleRadicadoExtraction(params: ScheduleRadicadoDto, userId: string) {
        const { frecuencia, radicado, juzgado } = params;

        const cronExpression = this.translateFrecuency(frecuencia);
        if (!cronExpression) {
            throw new HttpException('Frecuencia no válida', HttpStatus.BAD_REQUEST);
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);

        const existente = await this.prisma.tareaProgramadaRadicado.findUnique({
            where: { userId_radicado: { userId, radicado } },
        });

        if (existente && existente.activa) {
            throw new HttpException('Ya existe un radar activo para este radicado', HttpStatus.CONFLICT);
        }

        const newTask = existente 
            ? await this.prisma.tareaProgramadaRadicado.update({
                where: { id: existente.id},
                data: { juzgado, frecuencia, activa: true, deletedAt: null },
            })
            : await this.prisma.tareaProgramadaRadicado.create({
                data: { userId, radicado, juzgado, frecuencia },
            });

        const job = new CronJob(cronExpression, () => {
            this.extractionQueue.enqueue(`radicado_${newTask.id}`, () =>
                this.scraper.extractDataByRadicado(newTask.id, radicado, juzgado, true)
            ).catch(err =>
                this.logger.error(`Error en tarea radicado [${newTask.id}]: ${err?.message}`)
            );
        });

        this.schedulerRegistry.addCronJob(`radicado_${newTask.id}`, job);
        job.start();

        // Primera corrida inmediata en background
        this.extractionQueue.enqueue(`radicado_${newTask.id}`, () =>
            this.scraper.extractDataByRadicado(newTask.id, radicado, juzgado, true)
        ).catch(err => this.logger.error(`Error en primera corrida radicado [${newTask.id}]: ${err?.message}`));

        this.logger.log(`Tarea radicado [${newTask.id}] creada para usuario ${userId}`);

        return {
            message: 'Radar de radicado creado exitosamente',
            jobName: newTask.id,
            frecuencia,
        };
    }

    async stopRadicadoExtraction(jobId: string, userId: string) {
        try {
            const userTask = await this.prisma.tareaProgramadaRadicado.findFirst({
                where: { id: jobId, userId },
            });

            if (!userTask) {
                throw new HttpException('Tarea de radicado no encontrada', HttpStatus.NOT_FOUND);
            }

            const job = this.schedulerRegistry.getCronJob(`radicado_${jobId}`);
            job.stop();
            this.schedulerRegistry.deleteCronJob(`radicado_${jobId}`);

            await this.prisma.tareaProgramadaRadicado.update({
                where: { id: jobId },
                data: { activa: false, deletedAt: new Date() },
            });

            this.logger.log(`Tarea radicado [${jobId}] detenida y desactivada.`);
            return { message: 'Radar de radicado cancelado exitosamente' };

        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al detener tarea radicado [${jobId}]: ${msg}`);
            throw new HttpException(`Error al detener tarea: ${msg}`, HttpStatus.BAD_REQUEST);
        }
    }
}
