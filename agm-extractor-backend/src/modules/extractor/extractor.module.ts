import { Module } from '@nestjs/common';
import { ExtractorController } from './extractor.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BrowserManager } from './browser.manager';
import { ExtractionQueue } from './extractor.queue';
import { SamaiScraperService } from './samai-scraper.service';
import { ExtractorSchedulerService } from './extractor-scheduler.service';
import { ExtractorQueryService } from './extractor-query.service';
import { ExtractorExportService } from './extractor-export.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule
  ],
  providers: [
    SamaiScraperService,
    ExtractorSchedulerService,
    ExtractorQueryService,
    ExtractorExportService,
    BrowserManager,
    ExtractionQueue
  ],
  controllers: [ExtractorController]
})
export class ExtractorModule { }
