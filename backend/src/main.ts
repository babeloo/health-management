import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 使用 Winston Logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS配置
  app.enableCors();

  // API前缀
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`🚀 Backend service is running on: http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`📚 API documentation: http://localhost:${port}/api/v1`);
}

bootstrap();
