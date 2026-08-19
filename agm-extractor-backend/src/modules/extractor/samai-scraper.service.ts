import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { SearchRadicadoDto } from './dto/search-radicado.dto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications/notifications.service';
import { BrowserManager } from './browser.manager';
import { ExecutionLogService } from '../tracking/execution-log.service';

@Injectable()
export class SamaiScraperService {
  private readonly logger = new Logger(SamaiScraperService.name);
  private readonly dataDirectory = path.join(process.cwd(), 'data');
  private readonly samaiBaseUrl = 'https://samai.consejodeestado.gov.co';
  private corporacionesCache: { value: string; text: string }[] | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly browserManager: BrowserManager,
    private readonly executionLog: ExecutionLogService,
  ) {
    if (!fs.existsSync(this.dataDirectory)) {
      fs.mkdirSync(this.dataDirectory, { recursive: true });
    }
  }

  /**
   * SAMAI expone un API JSON interno (Jprocesos.ashx) desde el rediseño de
   * la página de búsqueda. Se usa directo en vez de manipular el DOM: es
   * inmune a cambios de maquetación y ya no depende de selectores frágiles
   * como los radios/dropdowns/tabla que rompieron con el rediseño.
   */

  /**
   * fetch dentro de page.evaluate con reintento y backoff exponencial
   * (2s, 4s, 8s). Cubre tanto 429/503 (rate limit) como fallos de red o
   * respuestas `ok:false` del API, para no saturar a SAMAI con reintentos
   * inmediatos si empieza a limitar por volumen de requests.
   */
  private async fetchSamaiJson(
    page: puppeteer.Page,
    path: string,
    init: Record<string, unknown>,
  ): Promise<any> {
    const MAX_INTENTOS = 3;
    let ultimoError = 'Error desconocido';

    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      const resultado = await page.evaluate(
        async (baseUrl: string, path: string, init: Record<string, unknown>) => {
          try {
            const res = await fetch(`${baseUrl}${path}`, init as RequestInit);
            const body = await res.json().catch(() => null);
            return { status: res.status, body };
          } catch (err) {
            return { status: 0, body: null, networkError: String(err) };
          }
        },
        this.samaiBaseUrl,
        path,
        init,
      );

      if (resultado.body?.ok) {
        return resultado.body;
      }

      const esRateLimit = resultado.status === 429 || resultado.status === 503;
      ultimoError = esRateLimit
        ? `SAMAI respondió ${resultado.status} (rate limit)`
        : resultado.body?.error?.message ||
          resultado.networkError ||
          `SAMAI respondió status ${resultado.status}`;

      if (intento < MAX_INTENTOS) {
        const espera = 2000 * Math.pow(2, intento - 1);
        this.logger.warn(
          `Fallo llamando a SAMAI (${path}, intento ${intento}/${MAX_INTENTOS}): ${ultimoError}. Reintentando en ${espera}ms...`,
        );
        await new Promise((r) => setTimeout(r, espera));
      }
    }

    throw new Error(ultimoError);
  }

  private async getCorporaciones(
    page: puppeteer.Page,
  ): Promise<{ value: string; text: string }[]> {
    if (this.corporacionesCache) return this.corporacionesCache;

    const respuesta = await this.fetchSamaiJson(
      page,
      '/Vistas/Casos/Jprocesos.ashx/corporaciones',
      { credentials: 'same-origin', headers: { Accept: 'application/json' } },
    );

    this.corporacionesCache = respuesta.data;
    return this.corporacionesCache as { value: string; text: string }[];
  }

  private async resolverCodigoJuzgado(
    page: puppeteer.Page,
    juzgado: string,
  ): Promise<string | null> {
    const corporaciones = await this.getCorporaciones(page);
    const match = corporaciones.find((c) =>
      c.text.toUpperCase().includes(juzgado.toUpperCase()),
    );
    return match?.value ?? null;
  }

  /**
   * Llama a Jprocesos.ashx/buscar paginando (el API limita a 10 resultados
   * por página sin importar lo que se pida en tamanoPagina) y normaliza la
   * respuesta al shape que ya consume el resto del servicio. Guarda
   * urlDetalle en cada item para poder navegar directo al detalle sin tener
   * que volver a buscar y hacer click en el botón "Ver".
   */
  private async buscarSamai(
    page: puppeteer.Page,
    tipoBusqueda: 'radicado' | 'parte',
    criterio: string,
    corporacion: string,
  ): Promise<any[]> {
    const resultados: any[] = [];
    let pagina = 1;
    let totalPages = 1;

    do {
      const respuesta = await this.fetchSamaiJson(
        page,
        '/Vistas/Casos/Jprocesos.ashx/buscar',
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            tipoBusqueda,
            criterio,
            fraseExacta: false,
            ambito: 'corporacion',
            corporacion,
            seccion: '',
            ponente: '',
            fechaDesde: '',
            fechaHasta: '',
            estado: '',
            tipoParte: '',
            pagina,
            tamanoPagina: 10,
          }),
        },
      );

      totalPages = respuesta.data.totalPages || 1;

      for (const item of respuesta.data.items ?? []) {
        resultados.push({
          radicado: item.radicado,
          tipoProceso: item.clase || '',
          ponente: item.ponente || 'No registra',
          demandante: item.demandante || 'No registra',
          demandado: item.demandado || 'No registra',
          textoCompleto: [
            item.clase,
            item.ponente ? `Ponente: ${item.ponente}` : '',
            item.demandante ? `Demandante: ${item.demandante}` : '',
            item.demandado ? `Demandado: ${item.demandado}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          _urlDetalle: item.urlDetalle,
        });
      }

      pagina++;
    } while (pagina <= totalPages);

    return resultados;
  }

  async extractData(
    taskId: string,
    partesProcesales: string[],
    juzgado: string,
  ): Promise<any[]> {
    this.logger.log(
      `Iniciando extracción — tarea [${taskId}] | partes: ${partesProcesales.length} | juzgado: ${juzgado}`,
    );

    const execId = await this.executionLog.start({
      tipo: 'programada',
      refId: taskId,
    });
    let execStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let execError: string | null = null;
    let procesosCount = 0;

    const page = await this.browserManager.newPage();

    try {
      await page.goto(`${this.samaiBaseUrl}/Vistas/Casos/procesos.aspx`, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      const codigoJuzgado = await this.resolverCodigoJuzgado(page, juzgado);
      if (!codigoJuzgado) {
        this.logger.warn(
          `Juzgado "${juzgado}" no encontrado. Abortando tarea [${taskId}].`,
        );
        return [];
      }

      let todosLosResultados: any[] = [];

      for (const parteProcesal of partesProcesales) {
        this.logger.log(`[${taskId}] Buscando: "${parteProcesal}"`);

        const resultados = await this.buscarSamai(
          page,
          'parte',
          parteProcesal.toUpperCase(),
          codigoJuzgado,
        );

        this.logger.log(
          `[${taskId}] "${parteProcesal}": ${resultados.length} resultados.`,
        );
        todosLosResultados = todosLosResultados.concat(resultados);
      }

      this.logger.log(
        `[${taskId}] Extracción completada. Total: ${todosLosResultados.length} registros.`,
      );

      if (todosLosResultados.length > 0) {
        await this.saveDataToDatabase(todosLosResultados, taskId);
        await this.extractDetailsProcess(
          page,
          todosLosResultados,
          taskId,
          'parteProcesal',
        );
      }

      if (taskId) {
        await this.prisma.tareaProgramada
          .update({
            where: { id: taskId },
            data: { ultimaEjecucion: new Date() },
          })
          .catch((err) =>
            this.logger.error(
              `[${taskId}] Error actualizando ultimaEjecucion: ${err?.message}`,
            ),
          );
      }

      procesosCount = todosLosResultados.length;
      return todosLosResultados;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      const stack = error instanceof Error ? error.stack : '';
      this.logger.error(`[${taskId}] Fallo en scraping: ${msg}`, stack);
      execStatus = 'FAILED';
      execError = msg;
      throw new Error(`Fallo en el scraping: ${msg}`);
    } finally {
      await this.browserManager.releasePage(page);
      await this.executionLog.finish(execId, {
        status: execStatus,
        procesosEncontrados: procesosCount,
        error: execError,
      });
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
        style: { alignment: { wrapText: true, vertical: 'top' } },
      },
    ];

    nuevosDatos.forEach((dato) => {
      worksheet.addRow({
        radicado: dato.radicado,
        tipoProceso: dato.tipoProceso,
        ponente: dato.ponente,
        demandante: dato.demandante,
        demandado: dato.demandado,
        textoCompleto: dato.textoCompleto,
      });
    });

    await workbook.xlsx.writeFile(rutaArchivo);
    this.logger.log(`Excel actualizado. Archivo en: ${rutaArchivo}`);
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

      const radicadosExistentes = await this.prisma.procesosJudiciales.findMany(
        {
          where: {
            tareaProgramadaId: taskId,
            radicado: { in: data.map((d) => d.radicado) },
          },
          select: { radicado: true },
        },
      );

      const existentes = new Set(radicadosExistentes.map((r) => r.radicado));

      const nuevosDatos = data.filter((d) => !existentes.has(d.radicado));

      this.logger.log(
        `[${taskId}] Scrapeados: ${data.length} | ` +
          `Ya existían: ${data.length - nuevosDatos.length} | ` +
          `Nuevos: ${nuevosDatos.length}`,
      );

      if (nuevosDatos.length === 0) {
        this.logger.log(
          `[${taskId}] Sin procesos nuevos. No se inserta ni notifica.`,
        );
        return;
      }

      const userPhone = tarea.user.telefono;
      if (userPhone) {
        this.notificationsService
          .sendNotification(nuevosDatos as any, tarea, userPhone)
          .catch((err) =>
            this.logger.error(
              `[${taskId}] Error al notificar: ${err?.message}`,
            ),
          );
      } else {
        this.logger.warn(`[${taskId}] Usuario sin teléfono, no se notifica.`);
      }

      const dataInsert = nuevosDatos.map((d) => ({
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

  async searchRadicado(dto: SearchRadicadoDto): Promise<any[]> {
    return this.extractDataByRadicado(null, dto.radicado, dto.juzgado, false);
  }

  /**
   * Busca un radicado puntual vía Jprocesos.ashx/buscar. Navega siempre con
   * page.goto para arrancar con sesión/cookies limpias, así cada llamada es
   * independiente.
   */
  private async buscarPorRadicado(
    page: puppeteer.Page,
    radicado: string,
    juzgado: string,
  ): Promise<any[]> {
    await page.goto(`${this.samaiBaseUrl}/Vistas/Casos/procesos.aspx`, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    const codigoJuzgado = await this.resolverCodigoJuzgado(page, juzgado);
    if (!codigoJuzgado) {
      this.logger.warn(`Juzgado "${juzgado}" no encontrado en SAMAI.`);
      return [];
    }

    return this.buscarSamai(page, 'radicado', radicado, codigoJuzgado);
  }

  async extractDataByRadicado(
    taskId: string | null,
    radicado: string,
    juzgado: string,
    persist: boolean,
  ): Promise<any[]> {
    this.logger.log(
      `Iniciando extracción por radicado — radicado: ${radicado} | juzgado: ${juzgado}`,
    );

    const execId = await this.executionLog.start({
      tipo: 'radicado',
      refId: taskId ?? radicado,
    });
    let execStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let execError: string | null = null;
    let procesosCount = 0;

    const page = await this.browserManager.newPage();

    try {
      const resultados = await this.buscarPorRadicado(page, radicado, juzgado);

      this.logger.log(
        `Radicado "${radicado}": ${resultados.length} resultados.`,
      );

      if (persist && taskId && resultados.length > 0) {
        await this.saveRadicadoDataToDatabase(resultados, taskId);
        await this.extractDetailsProcess(
          page,
          resultados,
          taskId,
          'radicado',
        );
      }

      if (persist && taskId) {
        await this.prisma.tareaProgramadaRadicado
          .update({
            where: { id: taskId },
            data: { ultimaEjecucion: new Date() },
          })
          .catch((err) =>
            this.logger.error(
              `[radicado:${taskId}] Error actualizando ultimaEjecucion: ${err?.message}`,
            ),
          );
      }

      procesosCount = resultados.length;
      return resultados;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Fallo en scraping por radicado: ${msg}`);
      execStatus = 'FAILED';
      execError = msg;
      throw new Error(`Fallo en el scraping: ${msg}`);
    } finally {
      await this.browserManager.releasePage(page);
      await this.executionLog.finish(execId, {
        status: execStatus,
        procesosEncontrados: procesosCount,
        error: execError,
      });
    }
  }

  private async saveRadicadoDataToDatabase(
    data: any[],
    radicadoTaskId: string,
  ) {
    if (!data || data.length === 0) return;

    try {
      const tarea = await this.prisma.tareaProgramadaRadicado.findUnique({
        where: { id: radicadoTaskId },
        include: { user: true },
      });

      if (!tarea) {
        this.logger.warn(
          `No se encontró la tarea de radicado [${radicadoTaskId}]`,
        );
        return;
      }

      const radicadosExistentes = await this.prisma.procesosJudiciales.findMany(
        {
          where: {
            tareaProgramadaRadicadoId: radicadoTaskId,
            radicado: { in: data.map((d) => d.radicado) },
          },
          select: { radicado: true },
        },
      );

      const existentes = new Set(radicadosExistentes.map((r) => r.radicado));
      const nuevosDatos = data.filter((d) => !existentes.has(d.radicado));

      this.logger.log(
        `[radicado:${radicadoTaskId}] Scrapeados: ${data.length} | ` +
          `Ya existían: ${data.length - nuevosDatos.length} | ` +
          `Nuevos: ${nuevosDatos.length}`,
      );

      if (nuevosDatos.length === 0) {
        this.logger.log(`[radicado:${radicadoTaskId}] Sin procesos nuevos.`);
        return;
      }

      const userPhone = tarea.user.telefono;
      if (userPhone) {
        this.notificationsService
          .sendRadicadoNotification(nuevosDatos, tarea, userPhone)
          .catch((err) =>
            this.logger.error(
              `[radicado:${radicadoTaskId}] Error al notificar: ${err?.message}`,
            ),
          );
      } else {
        this.logger.warn(
          `[radicado:${radicadoTaskId}] Usuario sin teléfono, no se notifica.`,
        );
      }

      const dataInsert = nuevosDatos.map((d) => ({
        radicado: d.radicado,
        tipoProceso: d.tipoProceso,
        ponente: d.ponente,
        demandante: d.demandante,
        textoCompleto: d.textoCompleto,
        tareaProgramadaRadicadoId: radicadoTaskId,
      }));

      const result = await this.prisma.procesosJudiciales.createMany({
        data: dataInsert,
        skipDuplicates: true,
      });

      this.logger.log(
        `[radicado:${radicadoTaskId}] Insertados en BD: ${result.count}`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `[radicado:${radicadoTaskId}] Error procesando datos: ${msg}`,
      );
    }
  }

  /**
   * Resuelve el acceso al detalle de un proceso: espera lo que aparezca
   * primero (captcha o detalle directo) y resuelve el captcha si aparece.
   * Al terminar, la página queda en la vista de detalle del proceso.
   */
  private async resolverAccesoDetalle(page: puppeteer.Page): Promise<number> {
    // Espera captcha O detalle directo (SAMAI solo pide captcha una vez por sesión)
    await page.waitForFunction(
      () =>
        document.querySelector('#MainContent_TxtCaptcha2') ||
        document.querySelector('#MainContent_lblradicacion'),
      { timeout: 30000, polling: 300 },
    );

    const detalleDirecto = await page.$('#MainContent_lblradicacion');
    if (detalleDirecto) {
      // Sin captcha: se llegó directo al detalle (1 sola navegación desde la tabla)
      return 1;
    }

    // Leer captcha tolerando variantes de ID (Lbldato1 con mayúscula y lbldato1 con minúscula)
    const captchaValue = await page.evaluate(() => {
      const pick = (n: number) =>
        document.querySelector(`#MainContent_Lbldato${n}`) ??
        document.querySelector(`#MainContent_lbldato${n}`);
      return [1, 2, 3]
        .map((n) => pick(n)?.textContent?.replace(/\s/g, '') ?? '')
        .join('');
    });

    if (!captchaValue || captchaValue.length !== 6) {
      throw new Error('No se pudo leer el captcha de SAMAI');
    }

    await page.type('#MainContent_TxtCaptcha2', captchaValue);
    await page.keyboard.press('Enter');
    await page.waitForSelector('#MainContent_lblradicacion', {
      timeout: 30000,
    });

    // Con captcha: captcha page + detalle = 2 navegaciones desde la tabla
    return 2;
  }

  private async scrapeDetalle(page: puppeteer.Page): Promise<{
    detalle: Record<string, any>;
    actuaciones: Record<string, any>[];
  }> {
    const detalle = await page.evaluate(() => {
      const text = (sel: string) =>
        document.querySelector(sel)?.textContent?.trim() || null;
      const inputVal = (sel: string) =>
        (document.querySelector(sel) as HTMLInputElement)?.value?.trim() ||
        null;
      const selectText = (sel: string) => {
        const el = document.querySelector(sel) as HTMLSelectElement;
        return el?.selectedOptions?.[0]?.textContent?.trim() || null;
      };

      return {
        radicado: text('#MainContent_lblradicacion'),
        corporacion: text('#MainContent_LblNombreCorporacion'),
        ponente: text('#MainContent_LblPonente'),
        clase: text('#MainContent_lblclase1'),
        marcoLegal: text('#MainContent_LblMarcoLey'),
        salaConoce: inputVal('#MainContent_TBSalaConoce'),
        salaDecide: inputVal('#MainContent_TBSalaDecide'),
        vigente: !document
          .querySelector('#FW_LTR_vigente')
          ?.textContent?.includes('(NO)'),

        // Asunto
        fechaRadicado: text('#MainContent_Lblfecharad'),
        fechaPresentacion: inputVal('#MainContent_Txtfechapres'),
        sentencia: text('#MainContent_Lblsentencia'),
        asunto:
          (
            document.querySelector(
              '#MainContent_lblasunto',
            ) as HTMLTextAreaElement
          )?.value?.trim() || null,
        origen: text('#MainContent_LblorigenNombre'),

        tipoProceso: selectText('#MainContent_LstTipoProc'),
        claseDetalle: selectText('#MainContent_LstClasProc'),
        subclase: selectText('#MainContent_LstSubcProc'),
        recurso: selectText('#MainContent_LstRecuProc'),
        naturaleza: selectText('#MainContent_LstTipoNatu'),
        ubicacion: selectText('#MainContent_lstUbicaproceso'),
        etapa: selectText('#MainContent_LstEtapaProceso'),
        formatoExpediente: (() => {
          const radios = [
            { sel: '#MainContent_RbtFEscrito', label: 'Físico' },
            {
              sel: '#MainContent_RbtFHibridoSinEsc',
              label: 'Híbrido por digitalizar',
            },
            { sel: '#MainContent_RbtFHibrido', label: 'Híbrido escaneado' },
            { sel: '#MainContent_RbtFElectronico', label: 'Electrónico' },
          ];
          return (
            radios.find(
              (r) =>
                (document.querySelector(r.sel) as HTMLInputElement)?.checked,
            )?.label || null
          );
        })(),
      };
    });

    // Actuaciones
    const actuaciones = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll(
          '#MainContent_GridViewHistoricoActuaciones tr',
        ),
      ).slice(1); // skip header

      return rows
        .map((row) => {
          const celdas = row.querySelectorAll('td');
          if (celdas.length < 8) return null;
          return {
            fechaRegistro: celdas[1]?.textContent?.trim() || null,
            fechaActuacion: celdas[2]?.textContent?.trim() || null,
            actuacion: celdas[3]?.textContent?.trim() || null,
            anotacion: celdas[4]?.textContent?.trim() || null,
            estado: celdas[5]?.textContent?.trim() || null,
            anexos: parseInt(celdas[6]?.textContent?.trim() || '0', 10),
            indice: celdas[7]?.textContent?.trim() || null,
          };
        })
        .filter(Boolean) as Record<string, any>[];
    });

    return { detalle, actuaciones };
  }

  private async extractDetailsProcess(
    page: puppeteer.Page,
    results: any[],
    taskId: string,
    taskType: 'parteProcesal' | 'radicado',
  ) {
    const MAX_INTENTOS = 2;

    for (let i = 0; i < results.length; i++) {
      const radicado = results[i].radicado;
      const urlDetalle = results[i]._urlDetalle;
      this.logger.log(
        `[${taskId}] Extrayendo detalle ${i + 1}/${results.length} — radicado: ${radicado}`,
      );

      if (!urlDetalle) {
        this.logger.warn(
          `[${taskId}] Sin urlDetalle para ${radicado}; se omite el detalle.`,
        );
        continue;
      }

      // Un cuelgue de SAMAI (postback lento que bloquea la página y dispara
      // el protocolTimeout) es transitorio: se reintenta una vez con una
      // navegación limpia antes de darse por vencido con este proceso.
      for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
        try {
          await this.extraerDetalleProceso(
            page,
            urlDetalle,
            radicado,
            taskId,
            taskType,
          );
          break;
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : 'Error desconocido';
          const url = page.url();
          const title = await page.title().catch(() => '?');
          this.logger.error(
            `[${taskId}] Error extrayendo detalle de "${radicado}" (intento ${intento}/${MAX_INTENTOS}): ${msg} | URL: ${url} | Título: ${title}`,
          );

          if (intento < MAX_INTENTOS) {
            this.logger.warn(
              `[${taskId}] Reintentando detalle de ${radicado}...`,
            );
            await new Promise((r) => setTimeout(r, 1500));
          }
          // Si era el último intento, se abandona este proceso; la
          // siguiente iteración re-navega y no queda contaminada.
        }
      }

      // Pausa entre procesos para no saturar a SAMAI.
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  /**
   * Extrae el detalle de un único proceso: navega directo a la urlDetalle
   * que ya devolvió Jprocesos.ashx/buscar (evita rebuscar y hacer click en
   * el botón "Ver"), resuelve captcha si aplica, scrapea y guarda.
   * Lanza si ocurre un error recuperable (timeout/cuelgue) para que el
   * caller pueda reintentar.
   */
  private async extraerDetalleProceso(
    page: puppeteer.Page,
    urlDetalle: string,
    radicado: string,
    taskId: string,
    taskType: 'parteProcesal' | 'radicado',
  ): Promise<void> {
    await page.goto(`${this.samaiBaseUrl}${urlDetalle}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Resolver acceso (captcha si aplica, o detalle directo)
    await this.resolverAccesoDetalle(page);

    // Scrape detalle + actuaciones
    const { detalle, actuaciones } = await this.scrapeDetalle(page);

    // Guardar en BD
    await this.saveDetalle(radicado, detalle, actuaciones, taskId, taskType);
  }

  private async saveDetalle(
    radicado: string,
    detalle: Record<string, any>,
    actuaciones: Record<string, any>[],
    taskId: string,
    taskType: 'parteProcesal' | 'radicado',
  ): Promise<void> {
    try {
      // Buscar el proceso por radicado y task
      const whereClause: any = { radicado };
      if (taskType === 'parteProcesal') {
        whereClause.tareaProgramadaId = taskId;
      } else {
        whereClause.tareaProgramadaRadicadoId = taskId;
      }

      const proceso = await this.prisma.procesosJudiciales.findFirst({
        where: whereClause,
        include: {
          tareaProgramada: { include: { user: true } },
          tareaProgramadaRadicado: { include: { user: true } },
        },
      });

      if (!proceso) {
        this.logger.warn(
          `[${taskId}] Proceso ${radicado} no encontrado en BD para actualizar.`,
        );
        return;
      }

      // Datos para notificar actuaciones nuevas
      const telefono =
        taskType === 'parteProcesal'
          ? proceso.tareaProgramada?.user.telefono
          : proceso.tareaProgramadaRadicado?.user.telefono;
      const juzgado =
        taskType === 'parteProcesal'
          ? proceso.tareaProgramada?.juzgado
          : proceso.tareaProgramadaRadicado?.juzgado;

      // Capturar antes del update: si el proceso ya tenía detalle, las
      // actuaciones que aparezcan ahora son movimientos nuevos a notificar.
      const yaTeniaDetalle = proceso.detalleExtraido;

      // Detectar actuaciones nuevas ANTES del upsert (comparando índices en BD)
      const actuacionesExistentes = await this.prisma.actuacion.findMany({
        where: { procesoId: proceso.id },
        select: { indice: true },
      });
      const indicesExistentes = new Set(
        actuacionesExistentes.map((a) => a.indice),
      );
      const nuevasActuaciones = actuaciones.filter(
        (a) => !indicesExistentes.has(a.indice),
      );

      // Parsear fechas de forma segura
      const parseDateSamai = (str: string | null): Date | null => {
        if (!str) return null;
        // Formato "06/02/2024 0:00:00" o "2024-02-05"
        if (str.includes('/')) {
          const [datePart] = str.split(' ');
          const [d, m, y] = datePart.split('/');
          return new Date(`${y}-${m}-${d}`);
        }
        return new Date(str);
      };

      // Actualizar proceso con detalle
      await this.prisma.procesosJudiciales.update({
        where: { id: proceso.id },
        data: {
          corporacion: detalle.corporacion,
          ponente: detalle.ponente,
          clase: detalle.claseDetalle || detalle.clase,
          subclase: detalle.subclase,
          marcoLegal: detalle.marcoLegal,
          vigente: detalle.vigente,
          salaConoce: detalle.salaConoce,
          salaDecide: detalle.salaDecide,
          fechaRadicado: parseDateSamai(detalle.fechaRadicado),
          fechaPresentacion: parseDateSamai(detalle.fechaPresentacion),
          sentencia: detalle.sentencia,
          asunto: detalle.asunto,
          origen: detalle.origen,
          recurso: detalle.recurso,
          naturaleza: detalle.naturaleza,
          ubicacion: detalle.ubicacion,
          etapa: detalle.etapa,
          formatoExpediente: detalle.formatoExpediente,
          detalleExtraido: true,
        },
      });

      // Insertar actuaciones nuevas (upsert por índice único)
      if (actuaciones.length > 0) {
        for (const act of actuaciones) {
          await this.prisma.actuacion.upsert({
            where: {
              procesoId_indice: {
                procesoId: proceso.id,
                indice: act.indice,
              },
            },
            create: {
              procesoId: proceso.id,
              fechaRegistro: parseDateSamai(act.fechaRegistro),
              fechaActuacion: parseDateSamai(act.fechaActuacion),
              actuacion: act.actuacion,
              anotacion: act.anotacion,
              estado: act.estado,
              anexos: act.anexos,
              indice: act.indice,
            },
            update: {
              actuacion: act.actuacion,
              anotacion: act.anotacion,
              estado: act.estado,
              anexos: act.anexos,
            },
          });
        }

        if (yaTeniaDetalle && nuevasActuaciones.length > 0) {
          if (telefono) {
            this.notificationsService
              .sendActuacionNotification(
                radicado,
                juzgado ?? '',
                nuevasActuaciones,
                telefono,
              )
              .catch((err) =>
                this.logger.error(
                  `[${taskId}] Error notificando actuaciones de ${radicado}: ${err?.message}`,
                ),
              );
          } else {
            this.logger.warn(
              `[${taskId}] Proceso ${radicado} con ${nuevasActuaciones.length} actuaciones nuevas pero usuario sin teléfono.`,
            );
          }
          this.logger.log(
            `[${taskId}] ${nuevasActuaciones.length} actuaciones nuevas para ${radicado}.`,
          );
        }
      }

      this.logger.log(
        `[${taskId}] Detalle guardado para ${radicado}: ${actuaciones.length} actuaciones.`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `[${taskId}] Error guardando detalle de ${radicado}: ${msg}`,
      );
    }
  }
}
