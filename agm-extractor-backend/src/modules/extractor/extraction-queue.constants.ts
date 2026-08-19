export const EXTRACTION_QUEUE = 'extraction';

export const JOB_EXTRACT_PARTE = 'extract-parte';
export const JOB_EXTRACT_RADICADO = 'extract-radicado';

export const FRECUENCIA_MS: Record<string, number> = {
  '3min': 3 * 60_000,
  '15min': 15 * 60_000,
  '30min': 30 * 60_000,
  '1h': 60 * 60_000,
  '12h': 12 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '2d': 2 * 24 * 60 * 60_000,
  '3d': 3 * 24 * 60 * 60_000,
};

export interface ExtractParteJobData {
  taskId: string;
  parteProcesal: string[];
  juzgado: string;
}

export interface ExtractRadicadoJobData {
  taskId: string;
  radicado: string;
  juzgado: string;
}
