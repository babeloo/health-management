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

  // 只在非生产环境启用 Swagger
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
    const config = new DocumentBuilder()
      .setTitle('智慧慢病管理系统 API')
      .setDescription('智慧慢病管理系统后端 API 文档')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = Number(process.env.PORT) || 5000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);

  // eslint-disable-next-line no-console
  console.log(`🚀 Backend service is running on: http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`📚 Swagger UI: http://localhost:${port}/api`);
  }
}

bootstrap();
