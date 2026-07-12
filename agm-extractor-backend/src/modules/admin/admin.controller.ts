import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/currentUser.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../tracking/audit.service';
import { AdminMetricsService } from './admin-metrics.service';
import {
  AuditQueryDto,
  ExecutionQueryDto,
  TimeseriesQueryDto,
} from './dto/admin-query.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly metrics: AdminMetricsService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('metrics/overview')
  overview() {
    return this.metrics.overview();
  }

  @Get('metrics/timeseries')
  timeseries(@Query() query: TimeseriesQueryDto) {
    return this.metrics.timeseries(
      query.metric ?? 'signups',
      query.range ?? '30d',
    );
  }

  @Get('metrics/performance')
  performance() {
    return this.metrics.performance();
  }

  @Get('audit')
  auditLog(@Query() query: AuditQueryDto) {
    return this.metrics.audit(query);
  }

  @Get('executions')
  executions(@Query() query: ExecutionQueryDto) {
    return this.metrics.executions(query);
  }

  @Patch('users/:id/estado')
  async updateEstado(
    @Param('id') id: string,
    @Body() dto: UpdateEstadoDto,
    @CurrentUser() admin: { id: string },
    @Req() req: Request,
  ) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { estado: dto.estado },
      select: { id: true, nombre: true, email: true, estado: true },
    });

    await this.audit.register({
      accion: 'USER_ESTADO',
      usuarioId: admin?.id ?? null,
      targetUserId: id,
      ipAddress:
        (req.headers['x-forwarded-for'] as string | undefined)
          ?.split(',')[0]
          ?.trim() ??
        req.ip ??
        null,
      userAgent: req.headers['user-agent'] ?? null,
      metadata: { estado: dto.estado },
    });

    return user;
  }
}
