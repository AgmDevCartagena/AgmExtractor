import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RegisterAuditInput {
  accion: string;
  usuarioId?: string | null;
  targetUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una acción en `audit_logs`. Nunca lanza: una falla de auditoría
   * no debe romper el flujo de negocio que la dispara.
   */
  async register(input: RegisterAuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          accion: input.accion,
          usuarioId: input.usuarioId ?? null,
          targetUserId: input.targetUserId ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo registrar auditoría (${input.accion}): ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
