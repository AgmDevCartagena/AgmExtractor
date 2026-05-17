import { Module } from '@nestjs/common';
import { ExtractorService } from './extractor.service';
import { ExtractorController } from './extractor.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BrowserManager } from './browser.manager';
import { ExtractionQueue } from './extractor.queue';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule
  ],
  providers: [
    ExtractorService,
    BrowserManager,
    ExtractionQueue
  ],
  controllers: [ExtractorController]
})
export class ExtractorModule { }
