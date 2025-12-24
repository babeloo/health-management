import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationProcessor } from './notification.processor';
import { PushNotificationService } from './push-notification.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'notification',
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationQueueService,
    NotificationProcessor,
    PushNotificationService,
  ],
  exports: [NotificationService, NotificationQueueService, PushNotificationService],
})
export class NotificationModule {}
