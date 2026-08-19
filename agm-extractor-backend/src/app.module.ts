import { Module } from '@nestjs/common';
import { ExtractorModule } from './modules/extractor/extractor.module';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthGuard, AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { NotificationsModule } from './modules/extractor/notifications/notifications.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ExtractorModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    AuthModule.forRoot({
      auth,
    }),
    PrismaModule,
    TrackingModule,
    AdminModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    NotificationsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
