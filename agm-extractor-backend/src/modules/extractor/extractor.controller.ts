import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ExtractorService } from './extractor.service';
import { ScheduleParamsDto } from './dto/schedule-params.dto';
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
}
