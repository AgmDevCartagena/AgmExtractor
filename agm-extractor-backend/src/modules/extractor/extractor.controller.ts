import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ExtractorService } from './extractor.service';
import { ScheduleParamsDto } from './dto/schedule-params.dto';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { Throttle } from '@nestjs/throttler';
import { PaginationQueryDto } from './dto/paginate-query.dto';

@Controller('extractor')
export class ExtractorController {
    constructor(
        private readonly extractorService: ExtractorService
    ) { }

    @Post('schedule')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    scheduleExtraction(
        @Body() body: ScheduleParamsDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.extractorService.scheduleExtraction(body, user.id);
    }

    @Delete('schedule/:jobId')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    cancelScheduledExtraction(
        @Param('jobId') jobId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.extractorService.stopScheduledExtraction(jobId, user.id);
    }

    @Get('schedule/:userId')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    getDataForScheduledTask(
        @Param('userId') userId: string,
        @Query() pagination: PaginationQueryDto
    ) {
        return this.extractorService.getDataForScheduledTask(pagination, userId);
    }
}
