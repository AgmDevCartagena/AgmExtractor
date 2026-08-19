import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface StartExecutionInput {
  tipo: 'programada' | 'radicado';
  refId: string;
  userId?: string | null;
}

export interface FinishExecutionInput {
  status: 'SUCCESS' | 'FAILED';
  procesosEncontrados?: number;
  error?: string | null;
}

@Injectable()
export class ExecutionLogService {
  private readonly logger = new Logger(ExecutionLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un ExecutionLog en estado RUNNING y devuelve su id (o null si falla,
   * para que el llamador no tenga que protegerse).
   */
  async start(input: StartExecutionInput): Promise<string | null> {
    try {
      const log = await this.prisma.executionLog.create({
        data: {
          tipo: input.tipo,
          refId: input.refId,
          userId: input.userId ?? null,
          status: 'RUNNING',
        },
        select: { id: true },
      });
      return log.id;
    } catch (error) {
      this.logger.error(
        `No se pudo iniciar ExecutionLog (${input.tipo}:${input.refId}): ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /**
   * Cierra un ExecutionLog: setea status, finishedAt y durationMs (calculado
   * desde startedAt). No-op si `id` es null.
   */
  async finish(id: string | null, input: FinishExecutionInput): Promise<void> {
    if (!id) return;
    try {
      const finishedAt = new Date();
      const log = await this.prisma.executionLog.findUnique({
        where: { id },
        select: { startedAt: true },
      });
      const durationMs = log
        ? finishedAt.getTime() - log.startedAt.getTime()
        : null;

      await this.prisma.executionLog.update({
        where: { id },
        data: {
          status: input.status,
          finishedAt,
          durationMs,
          procesosEncontrados: input.procesosEncontrados ?? 0,
          error: input.error ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo cerrar ExecutionLog (${id}): ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
