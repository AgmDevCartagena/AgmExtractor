import { Module } from '@nestjs/common';
import { ExtractorService } from './extractor.service';
import { ExtractorController } from './extractor.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule
  ],
  providers: [ExtractorService],
  controllers: [ExtractorController]
})
export class ExtractorModule { }
