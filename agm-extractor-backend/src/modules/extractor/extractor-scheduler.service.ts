import {
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScheduleParamsDto } from './dto/schedule-params.dto';
import { ScheduleRadicadoDto } from './dto/schedule-radicado.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
    EXTRACTION_QUEUE,
    JOB_EXTRACT_PARTE,
    JOB_EXTRACT_RADICADO,
    FRECUENCIA_MS,
} from './extraction-queue.constants';

@Injectable()
export class ExtractorSchedulerService implements OnModuleInit {
    private readonly logger = new Logger(ExtractorSchedulerService.name);

    constructor(
        @InjectQueue(EXTRACTION_QUEUE) private readonly queue: Queue,
        private readonly prisma: PrismaService,
    ) { }

    async onModuleInit() {
        try {
            const [parteTasks, radicadoTasks, schedulers] = await Promise.all([
                this.prisma.tareaProgramada.findMany({ where: { activa: true } }),
                this.prisma.tareaProgramadaRadicado.findMany({
                    where: { activa: true },
                }),
                this.queue.getJobSchedulers(0, -1, true),
            ]);

            const existingIds = new Set(schedulers.map((s) => s.id));
            const expected = new Map<string, () => Promise<unknown>>();

            for (const task of parteTasks) {
                const everyMs = FRECUENCIA_MS[task.frecuencia];
                if (!everyMs) {
                    this.logger.warn(
                        `Frecuencia no válida para la tarea ${task.id}, omitiendo restauración.`,
                    );
                    continue;
                }
                expected.set(task.id, () =>
                    this.queue.upsertJobScheduler(
                        task.id,
                        { every: everyMs },
                        {
                            name: JOB_EXTRACT_PARTE,
                            data: {
                                taskId: task.id,
                                parteProcesal: task.parteProcesal,
                                juzgado: task.juzgado,
                            },
                        },
                    ),
                );
            }

            for (const task of radicadoTasks) {
                const everyMs = FRECUENCIA_MS[task.frecuencia];
                if (!everyMs) {
                    this.logger.warn(
                        `Frecuencia no válida para radicado tarea ${task.id}, omitiendo.`,
                    );
                    continue;
                }
                expected.set(`radicado_${task.id}`, () =>
                    this.queue.upsertJobScheduler(
                        `radicado_${task.id}`,
                        { every: everyMs },
                        {
                            name: JOB_EXTRACT_RADICADO,
                            data: {
                                taskId: task.id,
                                radicado: task.radicado,
                                juzgado: task.juzgado,
                            },
                        },
                    ),
                );
            }

            let created = 0;
            for (const [id, create] of expected) {
                if (!existingIds.has(id)) {
                    await create();
                    created++;
                }
            }

            let removed = 0;
            for (const s of schedulers) {
                if (!expected.has(s.id as string)) {
                    await this.queue.removeJobScheduler(s.id as string);
                    removed++;
                }
            }

            this.logger.log(
                `Reconciliación de schedulers completa. Creados: ${created}, eliminados (huérfanos): ${removed}, activos: ${expected.size}`,
            );
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(
                `Error al reconciliar tareas programadas: ${errorMessage}`,
            );
        }
    }

    async scheduleExtraction(params: ScheduleParamsDto, userId: string) {
        const { frecuencia, parteProcesal: partesProcesales, juzgado } = params;

        const everyMs = FRECUENCIA_MS[frecuencia];
        if (!everyMs) {
            throw new HttpException('Frecuencia no válida', HttpStatus.BAD_REQUEST);
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);

        const newTask = await this.prisma.tareaProgramada.create({
            data: { userId, frecuencia, parteProcesal: partesProcesales, juzgado },
        });

        await this.queue.upsertJobScheduler(
            newTask.id,
            { every: everyMs },
            {
                name: JOB_EXTRACT_PARTE,
                data: { taskId: newTask.id, parteProcesal: partesProcesales, juzgado },
            },
        );

        this.logger.log(
            `Tarea [${newTask.id}] creada para usuario ${userId} con frecuencia ${frecuencia}`,
        );

        return {
            message: `Tarea programada creada con éxito`,
            jobName: newTask.id,
            frecuencia,
        };
    }

    async updateScheduledExtraction(
        jobId: string,
        params: ScheduleParamsDto,
        userId: string,
    ) {
        const { frecuencia, parteProcesal: partesProcesales, juzgado } = params;

        const everyMs = FRECUENCIA_MS[frecuencia];
        if (!everyMs) {
            throw new HttpException('Frecuencia no válida', HttpStatus.BAD_REQUEST);
        }

        const userTask = await this.prisma.tareaProgramada.findFirst({
            where: { id: jobId, userId },
        });
        if (!userTask) {
            throw new HttpException(
                'Radar no encontrado para este usuario',
                HttpStatus.NOT_FOUND,
            );
        }

        await this.prisma.tareaProgramada.update({
            where: { id: jobId },
            data: {
                frecuencia,
                parteProcesal: partesProcesales,
                juzgado,
                activa: true,
                deletedAt: null,
            },
        });

        // Recrear el scheduler para forzar corrida inmediata con los nuevos parámetros
        await this.queue.removeJobScheduler(jobId);
        await this.queue.upsertJobScheduler(
            jobId,
            { every: everyMs },
            {
                name: JOB_EXTRACT_PARTE,
                data: { taskId: jobId, parteProcesal: partesProcesales, juzgado },
            },
        );

        this.logger.log(
            `Tarea [${jobId}] actualizada para usuario ${userId} con frecuencia ${frecuencia}`,
        );

        return {
            message: 'Radar actualizado con éxito',
            jobName: jobId,
            frecuencia,
        };
    }

    async stopScheduledExtraction(jobId: string, userId: string) {
        try {
            const userTask = await this.prisma.tareaProgramada.findFirst({
                where: { id: jobId, userId },
            });

            if (!userTask) {
                throw new HttpException(
                    'Tarea no encontrada para este usuario',
                    HttpStatus.NOT_FOUND,
                );
            }

            await this.queue.removeJobScheduler(jobId);

            await this.prisma.tareaProgramada.update({
                where: { id: jobId },
                data: { activa: false, deletedAt: new Date() },
            });

            this.logger.log(`Tarea [${jobId}] detenida y desactivada.`);
            return { message: 'Tarea cancelada exitosamente' };
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al detener tarea [${jobId}]: ${msg}`);
            throw new HttpException(
                `Error al detener tarea: ${msg}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    async getQueueStatus() {
        const counts = await this.queue.getJobCounts(
            'active',
            'waiting',
            'delayed',
            'failed',
            'completed',
        );
        return {
            running: counts.active,
            queued: counts.waiting,
            maxConcurrent: parseInt(process.env.EXTRACTION_CONCURRENCY ?? '3', 10),
            counts,
        };
    }

    async scheduleRadicadoExtraction(
        params: ScheduleRadicadoDto,
        userId: string,
    ) {
        const { frecuencia, radicado, juzgado } = params;

        const everyMs = FRECUENCIA_MS[frecuencia];
        if (!everyMs) {
            throw new HttpException('Frecuencia no válida', HttpStatus.BAD_REQUEST);
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);

        const existente = await this.prisma.tareaProgramadaRadicado.findUnique({
            where: { userId_radicado: { userId, radicado } },
        });

        if (existente && existente.activa) {
            throw new HttpException(
                'Ya existe un radar activo para este radicado',
                HttpStatus.CONFLICT,
            );
        }

        const newTask = existente
            ? await this.prisma.tareaProgramadaRadicado.update({
                where: { id: existente.id },
                data: { juzgado, frecuencia, activa: true, deletedAt: null },
            })
            : await this.prisma.tareaProgramadaRadicado.create({
                data: { userId, radicado, juzgado, frecuencia },
            });

        await this.queue.removeJobScheduler(`radicado_${newTask.id}`);
        await this.queue.upsertJobScheduler(
            `radicado_${newTask.id}`,
            { every: everyMs },
            {
                name: JOB_EXTRACT_RADICADO,
                data: { taskId: newTask.id, radicado, juzgado },
            },
        );

        this.logger.log(
            `Tarea radicado [${newTask.id}] creada para usuario ${userId}`,
        );

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
                throw new HttpException(
                    'Tarea de radicado no encontrada',
                    HttpStatus.NOT_FOUND,
                );
            }

            await this.queue.removeJobScheduler(`radicado_${jobId}`);

            await this.prisma.tareaProgramadaRadicado.update({
                where: { id: jobId },
                data: { activa: false, deletedAt: new Date() },
            });

            this.logger.log(`Tarea radicado [${jobId}] detenida y desactivada.`);
            return { message: 'Radar de radicado cancelado exitosamente' };
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al detener tarea radicado [${jobId}]: ${msg}`);
            throw new HttpException(
                `Error al detener tarea: ${msg}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
