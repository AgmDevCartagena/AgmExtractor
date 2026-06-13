import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from './dto/paginate-query.dto';

@Injectable()
export class ExtractorQueryService {
    private readonly logger = new Logger(ExtractorQueryService.name);

    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async getDataForScheduledTask(pagination: PaginationQueryDto, userId: string) {
        const { limit, page, taskId } = pagination;
        const effectiveLimit = (limit && limit > 0) ? limit : 10;
        const skip = ((page ?? 1) - 1) * effectiveLimit;
        try {
            const whereClause: any = {
                tareaProgramada: {
                    userId
                }
            }

            if (taskId) {
                whereClause.tareaProgramada.id = taskId;
            }
            const [data, total] = await this.prisma.$transaction([
                this.prisma.procesosJudiciales.findMany({
                    where: whereClause,
                    skip,
                    take: effectiveLimit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.procesosJudiciales.count({
                    where: { tareaProgramada: { userId } }
                })

            ])

            if (!data || data.length === 0) {
                return {
                    data: [],
                    meta: {
                        total: 0,
                        page,
                        last_page: 0
                    }
                }
            }
            return {
                data,
                meta: {
                    total,
                    page,
                    last_page: Math.ceil(total / effectiveLimit)
                }
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al obtener datos para la tarea programada: ${errorMessage}`);
            throw new HttpException(`Fallo al obtener datos: ${errorMessage}`, HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    async getScheduledTasks(pagination: PaginationQueryDto, userId: string) {
        if (!userId) {
            throw new HttpException('ID de usuario es requerido', HttpStatus.BAD_REQUEST);
        }
        const { limit, page } = pagination;
        const effectiveLimit = (limit && limit > 0) ? limit : 10;
        const skip = ((page ?? 1) - 1) * effectiveLimit;
        try {
            const [tasks, total] = await this.prisma.$transaction([
                this.prisma.tareaProgramada.findMany({
                    where: { userId, activa: true },
                    skip,
                    take: effectiveLimit,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        frecuencia: true,
                        parteProcesal: true,
                        juzgado: true,
                        createdAt: true,
                        ultimaEjecucion: true,
                    }
                }),
                this.prisma.tareaProgramada.count({
                    where: { userId, activa: true }
                })
            ]);
            return {
                data: tasks,
                meta: {
                    total,
                    page,
                    last_page: Math.ceil(total / effectiveLimit)
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al obtener tareas programadas: ${errorMessage}`);
        }
    }

    async getRadicadoTasks(pagination: PaginationQueryDto, userId: string) {
        const { limit, page } = pagination;
        const effectiveLimit = (limit && limit > 0) ? limit : 10;
        const skip = ((page ?? 1) - 1) * effectiveLimit;

        try {
            const [tasks, total] = await this.prisma.$transaction([
                this.prisma.tareaProgramadaRadicado.findMany({
                    where: { userId, activa: true },
                    skip,
                    take: effectiveLimit,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        radicado: true,
                        juzgado: true,
                        frecuencia: true,
                        createdAt: true,
                        ultimaEjecucion: true,
                    }
                }),
                this.prisma.tareaProgramadaRadicado.count({
                    where: { userId, activa: true }
                })
            ]);

            return {
                data: tasks,
                meta: {
                    total,
                    page,
                    last_page: Math.ceil(total / effectiveLimit)
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al obtener tareas de radicado: ${errorMessage}`);
            throw new HttpException(`Fallo al obtener tareas: ${errorMessage}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getDataForRadicadoTask(pagination: PaginationQueryDto, userId: string) {
        const { limit, page, radicadoTaskId } = pagination;
        const effectiveLimit = (limit && limit > 0) ? limit : 10;
        const skip = ((page ?? 1) - 1) * effectiveLimit;

        try {
            const whereClause: any = {
                tareaProgramadaRadicado: { userId }
            };

            if (radicadoTaskId) {
                whereClause.tareaProgramadaRadicadoId = radicadoTaskId;
            }

            const [data, total] = await this.prisma.$transaction([
                this.prisma.procesosJudiciales.findMany({
                    where: whereClause,
                    skip,
                    take: effectiveLimit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.procesosJudiciales.count({
                    where: whereClause
                })
            ]);

            if (!data || data.length === 0) {
                return {
                    data: [],
                    meta: { total: 0, page, last_page: 0 }
                };
            }

            return {
                data,
                meta: {
                    total,
                    page,
                    last_page: Math.ceil(total / effectiveLimit)
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al obtener datos de tarea radicado: ${errorMessage}`);
            throw new HttpException(`Fallo al obtener datos: ${errorMessage}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getProcesoDetalle(procesoId: string, userId: string) {
        try {
            const proceso = await this.prisma.procesosJudiciales.findFirst({
                where: {
                    id: procesoId,
                    OR: [
                        { tareaProgramada: { userId } },
                        { tareaProgramadaRadicado: { userId } },
                    ],
                },
                include: {
                    actuaciones: {
                        orderBy: { fechaActuacion: 'desc' },
                    },
                },
            });
            if (!proceso) throw new HttpException('Proceso no encontrado', HttpStatus.NOT_FOUND);
            return proceso;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al obtener detalle del proceso [${procesoId}]: ${msg}`);
            throw new HttpException(`Fallo al obtener detalle: ${msg}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
