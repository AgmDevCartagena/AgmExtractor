import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from './audit.service';
import { ExecutionLogService } from './execution-log.service';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [AuditService, ExecutionLogService],
    exports: [AuditService, ExecutionLogService],
})
export class TrackingModule {}
