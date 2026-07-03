import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminMetricsService } from './admin-metrics.service';

@Module({
    imports: [PrismaModule],
    controllers: [AdminController],
    providers: [AdminMetricsService],
})
export class AdminModule {}
