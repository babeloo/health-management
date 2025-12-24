import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createWinstonLogger } from './config/winston.config';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { InfluxModule } from './common/influx/influx.module';
import { CacheModule } from './common/cache/cache.module';
import { HealthModule } from './health/health.module';
import { PointsModule } from './points/points.module';
import { ChatModule } from './chat/chat.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    // 环境变量配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env.local', '.env'],
    }),

    // Winston 日志模块
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const env = configService.get<string>('NODE_ENV', 'development');
        return createWinstonLogger(env);
      },
    }),

    // MongoDB 连接
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URL', 'mongodb://localhost:27017/health_mgmt'),
      }),
    }),

    // Prisma 数据库模块
    PrismaModule,

    // InfluxDB 时序数据库模块
    InfluxModule,

    // Redis 缓存模块（全局模块）
    CacheModule,

    // 认证授权模块
    AuthModule,

    // 用户管理模块
    UserModule,

    // 健康档案模块
    HealthModule,

    // 积分管理模块
    PointsModule,

    // 实时通讯模块
    ChatModule,

    // 通知模块
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 应用日志中间件到所有路由
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
