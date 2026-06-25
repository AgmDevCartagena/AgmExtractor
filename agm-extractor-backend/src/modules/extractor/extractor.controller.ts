import { Body, Controller, Delete, Get, Param, Post, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ScheduleParamsDto } from './dto/schedule-params.dto';
import { ScheduleRadicadoDto } from './dto/schedule-radicado.dto';
import { SearchRadicadoDto } from './dto/search-radicado.dto';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { Throttle } from '@nestjs/throttler';
import { PaginationQueryDto } from './dto/paginate-query.dto';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { SamaiScraperService } from './samai-scraper.service';
import { ExtractorSchedulerService } from './extractor-scheduler.service';
import { ExtractorQueryService } from './extractor-query.service';
import { ExtractorExportService } from './extractor-export.service';

@Controller('extractor')
export class ExtractorController {
    constructor(
        private readonly scraper: SamaiScraperService,
        private readonly scheduler: ExtractorSchedulerService,
        private readonly query: ExtractorQueryService,
        private readonly exporter: ExtractorExportService,
    ) { }

    @Post('schedule')
    @Throttle({ default: { limit: 10, ttl: 70000 } })
    scheduleExtraction(
        @Body() body: ScheduleParamsDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.scheduler.scheduleExtraction(body, user.id);
    }

    @Delete('schedule/:jobId')
    @Throttle({ default: { limit: 20, ttl: 70000 } })
    cancelScheduledExtraction(
        @Param('jobId') jobId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.scheduler.stopScheduledExtraction(jobId, user.id);
    }

    @Get('schedule')
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getDataForScheduledTask(
        @CurrentUser() user: { id: string },
        @Query() pagination: PaginationQueryDto,
    ) {
        return this.query.getDataForScheduledTask(pagination, user.id);
    }

    @Get('schedule/tasks/:userId')
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getScheduledTasks(
        @Param('userId') userId: string,
        @Query() pagination: PaginationQueryDto
    ) {
        return this.query.getScheduledTasks(pagination, userId);
    }

    @Get('queue/status')
    @AllowAnonymous()
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getQueueStatus() {
        return this.scheduler.getQueueStatus();
    }

    // --- Radicado endpoints ---

    @Post('radicado/search')
    @Throttle({ default: { limit: 20, ttl: 70000 } })
    searchByRadicado(
        @Body() body: SearchRadicadoDto,
    ) {
        return this.scraper.searchRadicado(body);
    }

    @Post('radicado/schedule')
    @Throttle({ default: { limit: 10, ttl: 70000 } })
    scheduleRadicadoExtraction(
        @Body() body: ScheduleRadicadoDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.scheduler.scheduleRadicadoExtraction(body, user.id);
    }

    @Get('radicado/schedule/tasks')
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getRadicadoTasks(
        @CurrentUser() user: { id: string },
        @Query() pagination: PaginationQueryDto
    ) {
        return this.query.getRadicadoTasks(pagination, user.id);
    }

    @Get('radicado/schedule')
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getDataForRadicadoTask(
        @CurrentUser() user: { id: string },
        @Query() pagination: PaginationQueryDto
    ) {
        return this.query.getDataForRadicadoTask(pagination, user.id);
    }

    @Delete('radicado/schedule/:jobId')
    @Throttle({ default: { limit: 20, ttl: 70000 } })
    cancelRadicadoExtraction(
        @Param('jobId') jobId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.scheduler.stopRadicadoExtraction(jobId, user.id);
    }

    @Get('export/ultima-actuacion')
    @Throttle({ default: { limit: 10, ttl: 70000 } })
    async exportUltimaActuacion(
        @CurrentUser() user: { id: string },
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const buffer = await this.exporter.exportUltimaActuacion(user.id);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="ultima-actuacion.xlsx"',
        });
        return new StreamableFile(buffer);
    }

    @Get('export/procesos')
    @Throttle({ default: { limit: 10, ttl: 70000 } })
    async exportProcesos(
        @CurrentUser() user: { id: string },
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const buffer = await this.exporter.exportProcesos(user.id);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="procesos.xlsx"',
        });
        return new StreamableFile(buffer);
    }

    @Get('proceso/:id')
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getProcesoDetalle(
        @Param('id') id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.query.getProcesoDetalle(id, user.id);
    }
}
