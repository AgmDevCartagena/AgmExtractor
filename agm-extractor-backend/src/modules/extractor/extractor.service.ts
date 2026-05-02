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


@Injectable()
export class ExtractorService implements OnModuleInit {
    private readonly logger = new Logger(ExtractorService.name);
    private readonly dataDirectory = path.join(process.cwd(), 'data');

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private readonly prisma: PrismaService
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
        const { frecuencia, parteProcesal, juzgado } = params;
        const cronExpression = this.translateFrecuency(frecuencia);
        if (!cronExpression) {
            throw new HttpException('Frecuencia no válida', HttpStatus.BAD_REQUEST);
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);

        const newTask = await this.prisma.tareaProgramada.create({
            data: {
                userId,
                frecuencia,
                parteProcesal,
                juzgado
            }
        })

        const nameJob = newTask.id;
        const job = new CronJob(cronExpression, async () => {
            this.logger.log(`Ejecutando tarea programada para el usuario ${userId} con frecuencia ${frecuencia}`);
            try {
                await this.extractData(newTask.id, parteProcesal, juzgado);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                this.logger.error(`Error en tarea programada para el usuario ${userId}: ${errorMessage}`);
            }
        });
        this.schedulerRegistry.addCronJob(nameJob, job);
        job.start();
        this.logger.log(`Tarea programada creada para el usuario ${userId} con frecuencia ${frecuencia}`);

        return {
            message: `Tarea programada creada con éxito para el usuario ${userId} con frecuencia ${frecuencia}`,
            jobName: nameJob,
            frecuencia
        }
    }

    async stopScheduledExtraction(jobId: string, userId: string) {
        try {
            const userTask = await this.prisma.tareaProgramada.findFirst({
                where: { id: jobId, userId }
            })
            if (!userTask) {
                throw new HttpException('Tarea programada no encontrada para este usuario', HttpStatus.NOT_FOUND);
            }
            const job = this.schedulerRegistry.getCronJob(jobId);
            job.stop();
            this.schedulerRegistry.deleteCronJob(jobId);
            this.logger.log(`Tarea programada con ID ${jobId} detenida y eliminada`);
            await this.prisma.tareaProgramada.update({
                where: { id: jobId },
                data: { activa: false, deletedAt: new Date() }
            })
            this.logger.log(`Tarea [${job}] detenida y desactivada en BD.`);
            return { message: `Tarea cancelada exitosamente` };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al detener tarea programada con ID ${jobId}: ${errorMessage}`);
            throw new HttpException(`Error al detener tarea programada: ${errorMessage}`, HttpStatus.BAD_REQUEST);
        }
    }

    async extractData(taskId: string, parteProcesal: string, juzgado: string): Promise<any[]> {
        this.logger.log(`Iniciando extraccion para: ${parteProcesal} en ${juzgado}`);

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.CHROMIUM_PATH || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });

        try {
            const page = await browser.newPage();

            await page.goto('https://samai.consejodeestado.gov.co/Vistas/Casos/procesos.aspx', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            await page.waitForSelector('::-p-text(Parte procesal)');
            await page.click('::-p-text(Parte procesal)');

            const inputBusqueda = 'input[placeholder="Ingrese el dato a buscar"]';
            await page.waitForSelector(inputBusqueda);
            await page.type(inputBusqueda, parteProcesal, { delay: 30 });

            await page.waitForSelector('::-p-text(Por corporación)');
            await page.click('::-p-text(Por corporación)');

            const selectorDropdown = '#FW_LstCorporacion';
            await page.waitForSelector(selectorDropdown);

            const valorNumerico = await page.evaluate((textoUsuario, selector) => {
                const select = document.querySelector<HTMLSelectElement>(selector);
                if (!select) return null;
                const opciones = Array.from(select.options);
                const opcionCorrecta = opciones.find(opt =>
                    opt.text.toUpperCase().includes(textoUsuario.toUpperCase())
                );
                return opcionCorrecta ? opcionCorrecta.value : null;
            }, juzgado, selectorDropdown);

            if (valorNumerico) {
                await page.select(selectorDropdown, valorNumerico);
                await new Promise(r => setTimeout(r, 1500));
            } else {
                throw new Error(`El juzgado "${juzgado}" no se encontro en la lista.`);
            }

            const btnBuscar = '#FW_buscarnormal';
            await page.waitForSelector(btnBuscar);
            await page.click(btnBuscar);

            const selectorTabla = '#DT_listadoprocs tbody tr';
            await page.waitForSelector(selectorTabla, { timeout: 30000 });

            const resultados = await page.evaluate(() => {
                const filas = Array.from(document.querySelectorAll('#DT_listadoprocs tbody tr'));

                return filas.map(fila => {
                    const celdas = fila.querySelectorAll('td');

                    if (celdas.length < 3 || celdas[0].innerText.includes('Ningún')) {
                        return null;
                    }

                    let radicado = celdas[1]?.innerText.trim() || '';
                    if (radicado.startsWith("'")) radicado = radicado.substring(1);

                    const detallesBrutos = celdas[2]?.innerText || '';
                    const lineasDetalles = detallesBrutos.split('\n').map(l => l.trim());

                    let infoEstructurada = {
                        radicado: radicado,
                        tipoProceso: lineasDetalles[0] ? lineasDetalles[0].split(' - ')[0] : '',
                        ponente: 'No registra',
                        demandante: 'No registra',
                        demandado: 'No registra',
                        textoCompleto: detallesBrutos
                    };

                    lineasDetalles.forEach(linea => {
                        if (linea.startsWith('Ponente:')) {
                            infoEstructurada.ponente = linea.replace('Ponente:', '').trim();
                        } else if (linea.startsWith('Demandante:')) {
                            infoEstructurada.demandante = linea.replace('Demandante:', '').trim();
                        } else if (linea.startsWith('Demandado:')) {
                            infoEstructurada.demandado = linea.replace('Demandado:', '').trim();
                        }
                    });

                    return infoEstructurada;
                }).filter(item => item !== null);
            });

            this.logger.log(`Extraccion completada. Se encontraron ${resultados.length} registros.`);

            //await this.guardarEnExcel(resultados, 'Base_Datos_SAMAI');

            if (resultados.length > 0) {
                await this.saveDataToDatabase(resultados, taskId);
            }

            return resultados;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            const errorStack = error instanceof Error ? error.stack : '';

            this.logger.error('Error durante la automatizacion', errorStack);
            throw new Error(`Fallo en el scraping: ${errorMessage}`);
        } finally {
            await browser.close();
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
        const dataInsert = data.map(d => ({
            radicado: d.radicado,
            tipoProceso: d.tipoProceso,
            ponente: d.ponente,
            demandante: d.demandante,
            textoCompleto: d.textoCompleto,
            tareaProgramadaId: taskId
        }))

        try {
            const result = await this.prisma.procesosJudiciales.createMany({
                data: dataInsert,
                skipDuplicates: true
            })
            this.logger.log(`Datos guardados en la base de datos. Registros insertados: ${result.count}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error al guardar datos en la base de datos: ${errorMessage}`);
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
}
