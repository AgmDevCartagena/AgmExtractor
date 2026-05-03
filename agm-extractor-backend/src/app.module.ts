import { Module } from '@nestjs/common';
import { ExtractorModule } from './modules/extractor/extractor.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthGuard, AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { NotificationsModule } from './modules/extractor/notifications/notifications.module';

@Module({
  imports: [
    ExtractorModule,
    ScheduleModule.forRoot(),
    AuthModule.forRoot({
      auth
    }),
    PrismaModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
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
export class AppModule { }
