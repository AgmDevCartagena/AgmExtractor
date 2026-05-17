import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { ScheduleParamsDto } from './dto/schedule-params.dto';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from './dto/paginate-query.dto';
import { NotificationsService } from './notifications/notifications.service';
import { BrowserManager } from './browser.manager';
import { ExtractionQueue } from './extractor.queue';


@Injectable()
export class ExtractorService implements OnModuleInit {
    private readonly logger = new Logger(ExtractorService.name);
    private readonly dataDirectory = path.join(process.cwd(), 'data');

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
        private readonly browserManager: BrowserManager,
        private readonly extractionQueue: ExtractionQueue
    ) {
        if (!fs.existsSync(this.dataDirectory)) {
            fs.mkdirSync(this.dataDirectory, { recursive: true });
        }
    }

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
                        await this.extractData(task.id, task.parteProcesal, task.juzgado);
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
                this.extractData(newTask.id, partesProcesales, juzgado)
            ).catch(err =>
                this.logger.error(`Error en tarea [${newTask.id}]: ${err?.message}`)
            );
        });

        this.schedulerRegistry.addCronJob(newTask.id, job);
        job.start();

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

    async extractData(taskId: string, partesProcesales: string[], juzgado: string): Promise<any[]> {
        this.logger.log(`Iniciando extracción — tarea [${taskId}] | partes: ${partesProcesales.length} | juzgado: ${juzgado}`);

        const page = await this.browserManager.newPage();

        try {
            await page.goto('https://samai.consejodeestado.gov.co/Vistas/Casos/procesos.aspx', {
                waitUntil: 'networkidle2',
                timeout: 60000,
            });

            await page.waitForSelector('::-p-text(Parte procesal)');
            await page.click('::-p-text(Parte procesal)');

            await page.waitForSelector('::-p-text(Por corporación)');
            await page.click('::-p-text(Por corporación)');

            const selectorDropdown = '#FW_LstCorporacion';
            await page.waitForSelector(selectorDropdown);

            const valorNumerico = await page.evaluate((texto, selector) => {
                const select = document.querySelector<HTMLSelectElement>(selector);
                if (!select) return null;
                const opcion = Array.from(select.options).find(opt =>
                    opt.text.toUpperCase().includes(texto.toUpperCase())
                );
                return opcion?.value ?? null;
            }, juzgado, selectorDropdown);

            if (!valorNumerico) {
                this.logger.warn(`Juzgado "${juzgado}" no encontrado en el dropdown. Abortando tarea [${taskId}].`);
                return [];
            }

            await page.select(selectorDropdown, valorNumerico);
            await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => { });

            const inputBusqueda = 'input[placeholder="Ingrese el dato a buscar"]';
            const btnBuscar = '#FW_buscarnormal';
            await page.waitForSelector(inputBusqueda);

            let todosLosResultados: any[] = [];

            for (const parteProcesal of partesProcesales) {
                this.logger.log(`[${taskId}] Buscando: "${parteProcesal}"`);

                await page.evaluate((selector) => {
                    const input = document.querySelector<HTMLInputElement>(selector);
                    if (!input) return;
                    input.focus();
                    input.value = '';
                    ['input', 'change', 'keyup'].forEach(evt =>
                        input.dispatchEvent(new Event(evt, { bubbles: true }))
                    );
                }, inputBusqueda);

                await new Promise(r => setTimeout(r, 300));

                await page.type(inputBusqueda, parteProcesal.toUpperCase(), { delay: 50 });

                await page.evaluate((selector) => {
                    document.querySelector<HTMLInputElement>(selector)
                        ?.dispatchEvent(new Event('blur', { bubbles: true }));
                }, inputBusqueda);

                await new Promise(r => setTimeout(r, 200));

                await page.evaluate(() => {
                    document.querySelector('#DT_listadoprocs tbody')
                        ?.setAttribute('data-loading', 'true');
                });

                await page.click(btnBuscar);

                const waitForTable = async (timeoutMs: number) => {
                    await page.waitForFunction(() => {
                        const tbody = document.querySelector('#DT_listadoprocs tbody');
                        if (!tbody) return false;
                        if (tbody.getAttribute('data-loading') !== 'true') return true;

                        const rows = Array.from(tbody.querySelectorAll('tr'));
                        if (rows.length === 0) return false;

                        const text = rows.map(r => r.textContent || '').join(' ');
                        const isDone = !text.includes('Cargando') && !text.includes('Procesando');

                        if (isDone) tbody.removeAttribute('data-loading');
                        return isDone;
                    }, { timeout: timeoutMs, polling: 300 });
                };

                try {
                    await waitForTable(30000);
                    await new Promise(r => setTimeout(r, 500));
                } catch {
                    this.logger.warn(`[${taskId}] Timeout para "${parteProcesal}". Reintentando con Enter...`);
                    try {
                        await page.focus(inputBusqueda);
                        await page.keyboard.press('Enter');
                        await waitForTable(30000);
                        await new Promise(r => setTimeout(r, 500));
                    } catch {
                        this.logger.warn(`[${taskId}] Sin resultados para "${parteProcesal}" tras retry.`);
                        continue;
                    }
                }

                const resultados = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('#DT_listadoprocs tbody tr'))
                        .map(fila => {
                            const celdas = fila.querySelectorAll('td');
                            if (celdas.length < 3) return null;

                            const textoFila = celdas[0]?.innerText || '';
                            if (
                                textoFila.includes('Ningún') ||
                                textoFila.includes('No se encontraron')
                            ) return null;

                            let radicado = celdas[1]?.innerText.trim() || '';
                            if (radicado.startsWith("'")) radicado = radicado.substring(1);

                            const textoCompleto = celdas[2]?.innerText || '';
                            const lineas = textoCompleto.split('\n').map((l: string) => l.trim());

                            const info: any = {
                                radicado,
                                tipoProceso: lineas[0]?.split(' - ')[0] || '',
                                ponente: 'No registra',
                                demandante: 'No registra',
                                demandado: 'No registra',
                                textoCompleto,
                            };

                            lineas.forEach((linea: string) => {
                                if (linea.startsWith('Ponente:'))
                                    info.ponente = linea.replace('Ponente:', '').trim();
                                else if (linea.startsWith('Demandante:'))
                                    info.demandante = linea.replace('Demandante:', '').trim();
                                else if (linea.startsWith('Demandado:'))
                                    info.demandado = linea.replace('Demandado:', '').trim();
                            });

                            return info;
                        })
                        .filter(Boolean);
                });

                this.logger.log(`[${taskId}] "${parteProcesal}": ${resultados.length} resultados.`);
                todosLosResultados = todosLosResultados.concat(resultados);
            }

            this.logger.log(`[${taskId}] Extracción completada. Total: ${todosLosResultados.length} registros.`);

            if (todosLosResultados.length > 0) {
                await this.saveDataToDatabase(todosLosResultados, taskId);
            }

            return todosLosResultados;

        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            const stack = error instanceof Error ? error.stack : '';
            this.logger.error(`[${taskId}] Fallo en scraping: ${msg}`, stack);
            throw new Error(`Fallo en el scraping: ${msg}`);
        } finally {
            await page.close();
        }
    }

    private async guardarEnExcel(nuevosDatos: any[], nombreArchivo: string) {
        if (!nuevosDatos || nuevosDatos.length === 0) return;

        const rutaArchivo = path.join(this.dataDirectory, `${nombreArchivo}.xlsx`);
        const workbook = new ExcelJS.Workbook();
        let worksheet: ExcelJS.Worksheet;

        if (fs.existsSync(rutaArchivo)) {
            await workbook.xlsx.readFile(rutaArchivo);
            worksheet = workbook.getWorksheet('Procesos SAMAI') as ExcelJS.Worksheet;
            if (!worksheet) {
                worksheet = workbook.addWorksheet('Procesos SAMAI');
                worksheet.getRow(1).font = { bold: true };
            }
        } else {
            worksheet = workbook.addWorksheet('Procesos SAMAI');
            worksheet.getRow(1).font = { bold: true };
        }

        worksheet.columns = [
            { header: 'Radicado', key: 'radicado', width: 25 },
            { header: 'Tipo de Proceso', key: 'tipoProceso', width: 35 },
            { header: 'Ponente', key: 'ponente', width: 40 },
            { header: 'Demandante', key: 'demandante', width: 40 },
            { header: 'Demandado', key: 'demandado', width: 40 },
            {
                header: 'Texto Completo',
                key: 'textoCompleto',
                width: 100,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            }
        ];

        nuevosDatos.forEach(dato => {
            worksheet.addRow({
                radicado: dato.radicado,
                tipoProceso: dato.tipoProceso,
                ponente: dato.ponente,
                demandante: dato.demandante,
                demandado: dato.demandado,
                textoCompleto: dato.textoCompleto
            });
        });

        await workbook.xlsx.writeFile(rutaArchivo);
        this.logger.log(`Excel actualizado. Archivo en: ${rutaArchivo}`);
    }

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

    private async saveDataToDatabase(data: any[], taskId: string) {
        if (!data || data.length === 0) return;

        try {
            const tarea = await this.prisma.tareaProgramada.findUnique({
                where: { id: taskId },
                include: { user: true },
            });

            if (!tarea) {
                this.logger.warn(`No se encontró la tarea [${taskId}]`);
                return;
            }

            const radicadosExistentes = await this.prisma.procesosJudiciales.findMany({
                where: {
                    tareaProgramadaId: taskId,
                    radicado: { in: data.map(d => d.radicado) },
                },
                select: { radicado: true },
            });

            const existentes = new Set(radicadosExistentes.map(r => r.radicado));

            const nuevosDatos = data.filter(d => !existentes.has(d.radicado));

            this.logger.log(
                `[${taskId}] Scrapeados: ${data.length} | ` +
                `Ya existían: ${data.length - nuevosDatos.length} | ` +
                `Nuevos: ${nuevosDatos.length}`
            );

            if (nuevosDatos.length === 0) {
                this.logger.log(`[${taskId}] Sin procesos nuevos. No se inserta ni notifica.`);
                return;
            }

            const userPhone = tarea.user.telefono;
            if (userPhone) {
                this.notificationsService
                    .sendNotification(nuevosDatos as any, tarea, userPhone)
                    .catch(err => this.logger.error(`[${taskId}] Error al notificar: ${err?.message}`));
            } else {
                this.logger.warn(`[${taskId}] Usuario sin teléfono, no se notifica.`);
            }

            const dataInsert = nuevosDatos.map(d => ({
                radicado: d.radicado,
                tipoProceso: d.tipoProceso,
                ponente: d.ponente,
                demandante: d.demandante,
                textoCompleto: d.textoCompleto,
                tareaProgramadaId: taskId,
            }));

            const result = await this.prisma.procesosJudiciales.createMany({
                data: dataInsert,
                skipDuplicates: true,
            });

            this.logger.log(`[${taskId}] Insertados en BD: ${result.count}`);

        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`[${taskId}] Error procesando datos: ${msg}`);
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

    getQueueStatus() {
        return this.extractionQueue.getStatus();
    }
}
