import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Winston 日志配置
 * 支持控制台输出和文件轮转
 */
export const createWinstonLogger = (env: string = 'development') => {
  const logLevel = env === 'production' ? 'warn' : env === 'staging' ? 'info' : 'debug';

  const transports: winston.transport[] = [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike('HealthMgmt', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),

    // 所有日志文件（按日期轮转）
    new DailyRotateFile({
      dirname: 'logs',
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),

    // 错误日志文件（单独存储）
    new DailyRotateFile({
      dirname: 'logs',
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ];

  return WinstonModule.createLogger({
    level: logLevel,
    transports,
  });
};
