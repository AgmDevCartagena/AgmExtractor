import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ExtractorService } from './extractor.service';
import { ScheduleParamsDto } from './dto/schedule-params.dto';
import { ScheduleRadicadoDto } from './dto/schedule-radicado.dto';
import { SearchRadicadoDto } from './dto/search-radicado.dto';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { Throttle } from '@nestjs/throttler';
import { PaginationQueryDto } from './dto/paginate-query.dto';
import { anonymous } from 'better-auth/plugins';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('extractor')
export class ExtractorController {
    constructor(
        private readonly extractorService: ExtractorService
    ) { }

    @Post('schedule')
    @Throttle({ default: { limit: 10, ttl: 70000 } })
    scheduleExtraction(
        @Body() body: ScheduleParamsDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.extractorService.scheduleExtraction(body, user.id);
    }

    @Delete('schedule/:jobId')
    @Throttle({ default: { limit: 20, ttl: 70000 } })
    cancelScheduledExtraction(
        @Param('jobId') jobId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.extractorService.stopScheduledExtraction(jobId, user.id);
    }

    @Get('schedule')
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getDataForScheduledTask(
        @CurrentUser() user: { id: string },
        @Query() pagination: PaginationQueryDto,
    ) {
        return this.extractorService.getDataForScheduledTask(pagination, user.id);
    }

    @Get('schedule/tasks/:userId')
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getScheduledTasks(
        @Param('userId') userId: string,
        @Query() pagination: PaginationQueryDto
    ) {
        return this.extractorService.getScheduledTasks(pagination, userId);
    }

    @Get('queue/status')
    @AllowAnonymous()
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getQueueStatus() {
        return this.extractorService.getQueueStatus();
    }

    // --- Radicado endpoints ---

    @Post('radicado/search')
    @Throttle({ default: { limit: 20, ttl: 70000 } })
    searchByRadicado(
        @Body() body: SearchRadicadoDto,
    ) {
        return this.extractorService.searchRadicado(body);
    }

    @Post('radicado/schedule')
    @Throttle({ default: { limit: 10, ttl: 70000 } })
    scheduleRadicadoExtraction(
        @Body() body: ScheduleRadicadoDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.extractorService.scheduleRadicadoExtraction(body, user.id);
    }

    @Get('radicado/schedule/tasks')
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getRadicadoTasks(
        @CurrentUser() user: { id: string },
        @Query() pagination: PaginationQueryDto
    ) {
        return this.extractorService.getRadicadoTasks(pagination, user.id);
    }

    @Get('radicado/schedule')
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getDataForRadicadoTask(
        @CurrentUser() user: { id: string },
        @Query() pagination: PaginationQueryDto
    ) {
        return this.extractorService.getDataForRadicadoTask(pagination, user.id);
    }

    @Delete('radicado/schedule/:jobId')
    @Throttle({ default: { limit: 20, ttl: 70000 } })
    cancelRadicadoExtraction(
        @Param('jobId') jobId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.extractorService.stopRadicadoExtraction(jobId, user.id);
    }

    @Get('proceso/:id')
    @Throttle({ default: { limit: 100, ttl: 70000 } })
    getProcesoDetalle(
        @Param('id') id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.extractorService.getProcesoDetalle(id, user.id);
    }
}
