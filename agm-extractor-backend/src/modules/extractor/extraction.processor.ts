import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SamaiScraperService } from './samai-scraper.service';
import {
  EXTRACTION_QUEUE,
  JOB_EXTRACT_PARTE,
  JOB_EXTRACT_RADICADO,
  ExtractParteJobData,
  ExtractRadicadoJobData,
} from './extraction-queue.constants';

@Processor(EXTRACTION_QUEUE, {
  concurrency: parseInt(process.env.EXTRACTION_CONCURRENCY ?? '3', 10),
  lockDuration: 120_000,
})
export class ExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExtractionProcessor.name);

  constructor(private readonly scraper: SamaiScraperService) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case JOB_EXTRACT_PARTE: {
        const { taskId, parteProcesal, juzgado } =
          job.data as ExtractParteJobData;
        return this.scraper.extractData(taskId, parteProcesal, juzgado);
      }
      case JOB_EXTRACT_RADICADO: {
        const { taskId, radicado, juzgado } =
          job.data as ExtractRadicadoJobData;
        return this.scraper.extractDataByRadicado(
          taskId,
          radicado,
          juzgado,
          true,
        );
      }
      default:
        throw new Error(`Job desconocido: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job [${job.name}:${job.id}] falló: ${err?.message}`);
  }
}
