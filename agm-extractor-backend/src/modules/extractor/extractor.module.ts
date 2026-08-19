import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExtractorController } from './extractor.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BrowserManager } from './browser.manager';
import { SamaiScraperService } from './samai-scraper.service';
import { ExtractorSchedulerService } from './extractor-scheduler.service';
import { ExtractorQueryService } from './extractor-query.service';
import { ExtractorExportService } from './extractor-export.service';
import { ExtractionProcessor } from './extraction.processor';
import { EXTRACTION_QUEUE } from './extraction-queue.constants';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: EXTRACTION_QUEUE,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 24 * 3600, count: 500 },
      },
    }),
  ],
  providers: [
    SamaiScraperService,
    ExtractorSchedulerService,
    ExtractorQueryService,
    ExtractorExportService,
    BrowserManager,
    ExtractionProcessor,
  ],
  controllers: [ExtractorController],
})
export class ExtractorModule {}
