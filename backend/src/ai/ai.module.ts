import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

/**
 * AI 模块
 * 提供 AI 健康科普功能，代理转发请求到 Python AI 服务
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30秒超时
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
