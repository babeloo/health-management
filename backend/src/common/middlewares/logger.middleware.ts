import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * HTTP 请求日志中间件
 * 记录所有进入的 HTTP 请求和响应时间
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // 请求开始日志
    this.logger.log(`→ [${method}] ${originalUrl} - ${ip} - ${userAgent}`);

    // 监听响应结束事件
    response.on('finish', () => {
      const { statusCode } = response;
      const duration = Date.now() - startTime;

      // 根据状态码选择日志级别
      let logLevel: 'error' | 'warn' | 'log' = 'log';
      if (statusCode >= 500) {
        logLevel = 'error';
      } else if (statusCode >= 400) {
        logLevel = 'warn';
      }

      this.logger[logLevel](`← [${method}] ${originalUrl} - ${statusCode} - ${duration}ms`);
    });

    next();
  }
}
