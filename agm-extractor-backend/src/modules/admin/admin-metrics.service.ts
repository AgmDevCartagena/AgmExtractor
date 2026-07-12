import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto, ExecutionQueryDto } from './dto/admin-query.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  private daysAgo(days: number): Date {
    return new Date(Date.now() - days * DAY_MS);
  }

  private pct(part: number, total: number): number {
    if (!total) return 0;
    return Math.round((part / total) * 1000) / 10; // 1 decimal
  }

  async overview() {
    const now = new Date();
    const last7 = this.daysAgo(7);
    const last30 = this.daysAgo(30);
    const last24h = this.daysAgo(1);

    const [
      usuariosTotal,
      usuariosActivos,
      usuariosInactivos,
      usuariosBaneados,
      usuariosNuevos7,
      usuariosNuevos30,
      usuariosCon2FA,
      sesionesActivas,
      tareasTotal,
      tareasActivas,
      radicadosTotal,
      radicadosActivos,
      procesosTotal,
      procesos7,
      procesos30,
      procesosConDetalle,
      actuacionesTotal,
      ejec24h,
      ejec24hOk,
      ejec7d,
      ejec7dOk,
      durationAgg,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { estado: true } }),
      this.prisma.user.count({ where: { estado: false } }),
      this.prisma.user.count({ where: { banned: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: last7 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: last30 } } }),
      this.prisma.user.count({ where: { twoFactorEnabled: true } }),
      this.prisma.session.count({ where: { expiresAt: { gt: now } } }),
      this.prisma.tareaProgramada.count(),
      this.prisma.tareaProgramada.count({ where: { activa: true } }),
      this.prisma.tareaProgramadaRadicado.count(),
      this.prisma.tareaProgramadaRadicado.count({ where: { activa: true } }),
      this.prisma.procesosJudiciales.count(),
      this.prisma.procesosJudiciales.count({
        where: { fechaDescubrimiento: { gte: last7 } },
      }),
      this.prisma.procesosJudiciales.count({
        where: { fechaDescubrimiento: { gte: last30 } },
      }),
      this.prisma.procesosJudiciales.count({
        where: { detalleExtraido: true },
      }),
      this.prisma.actuacion.count(),
      this.prisma.executionLog.count({
        where: { startedAt: { gte: last24h } },
      }),
      this.prisma.executionLog.count({
        where: { startedAt: { gte: last24h }, status: 'SUCCESS' },
      }),
      this.prisma.executionLog.count({ where: { startedAt: { gte: last7 } } }),
      this.prisma.executionLog.count({
        where: { startedAt: { gte: last7 }, status: 'SUCCESS' },
      }),
      this.prisma.executionLog.aggregate({
        _avg: { durationMs: true },
        where: { startedAt: { gte: last7 }, status: 'SUCCESS' },
      }),
    ]);

    return {
      usuarios: {
        total: usuariosTotal,
        activos: usuariosActivos,
        inactivos: usuariosInactivos,
        baneados: usuariosBaneados,
        nuevos7d: usuariosNuevos7,
        nuevos30d: usuariosNuevos30,
        con2FA: usuariosCon2FA,
        pct2FA: this.pct(usuariosCon2FA, usuariosTotal),
      },
      sesiones: { activas: sesionesActivas },
      radares: {
        total: tareasTotal + radicadosTotal,
        activos: tareasActivas + radicadosActivos,
        porParte: tareasTotal,
        porRadicado: radicadosTotal,
      },
      procesos: {
        total: procesosTotal,
        nuevos7d: procesos7,
        nuevos30d: procesos30,
        conDetalle: procesosConDetalle,
        pctConDetalle: this.pct(procesosConDetalle, procesosTotal),
      },
      actuaciones: { total: actuacionesTotal },
      ejecuciones: {
        ult24h: ejec24h,
        ult24hExito: ejec24hOk,
        pctExito24h: this.pct(ejec24hOk, ejec24h),
        ult7d: ejec7d,
        ult7dExito: ejec7dOk,
        pctExito7d: this.pct(ejec7dOk, ejec7d),
        duracionMediaMs: Math.round(durationAgg._avg.durationMs ?? 0),
      },
    };
  }

  async timeseries(
    metric: 'signups' | 'executions' | 'procesos',
    range: '7d' | '30d' | '90d',
  ) {
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const since = this.daysAgo(days);

    let rows: Array<{ day: Date; count: number }>;

    if (metric === 'signups') {
      rows = await this.prisma.$queryRaw`
                SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::int AS count
                FROM "users"
                WHERE "createdAt" >= ${since}
                GROUP BY day ORDER BY day`;
    } else if (metric === 'executions') {
      rows = await this.prisma.$queryRaw`
                SELECT date_trunc('day', "startedAt")::date AS day, COUNT(*)::int AS count
                FROM "execution_logs"
                WHERE "startedAt" >= ${since}
                GROUP BY day ORDER BY day`;
    } else {
      rows = await this.prisma.$queryRaw`
                SELECT date_trunc('day', "fechaDescubrimiento")::date AS day, COUNT(*)::int AS count
                FROM "procesos_judiciales"
                WHERE "fechaDescubrimiento" >= ${since}
                GROUP BY day ORDER BY day`;
    }

    return rows.map((r) => ({
      date:
        r.day instanceof Date
          ? r.day.toISOString().slice(0, 10)
          : String(r.day),
      count: Number(r.count),
    }));
  }

  async performance() {
    const last24h = this.daysAgo(1);

    const [total, exito, fallo, corriendo, agg, throughput24h] =
      await Promise.all([
        this.prisma.executionLog.count(),
        this.prisma.executionLog.count({ where: { status: 'SUCCESS' } }),
        this.prisma.executionLog.count({ where: { status: 'FAILED' } }),
        this.prisma.executionLog.count({ where: { status: 'RUNNING' } }),
        this.prisma.executionLog.aggregate({
          _avg: { durationMs: true, procesosEncontrados: true },
          where: { status: 'SUCCESS' },
        }),
        this.prisma.executionLog.count({
          where: { startedAt: { gte: last24h } },
        }),
      ]);

    const cerradas = exito + fallo;
    return {
      total,
      exito,
      fallo,
      corriendo,
      pctExito: this.pct(exito, cerradas),
      duracionMediaMs: Math.round(agg._avg.durationMs ?? 0),
      procesosPorCorrida:
        Math.round((agg._avg.procesosEncontrados ?? 0) * 10) / 10,
      throughput24h,
    };
  }

  async audit(query: AuditQueryDto) {
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const where: Record<string, unknown> = {};
    if (query.accion) where.accion = query.accion;
    if (query.usuarioId) where.usuarioId = query.usuarioId;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async executions(query: ExecutionQueryDto) {
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.executionLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.executionLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
