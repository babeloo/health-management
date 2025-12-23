import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from './cache.service';

/**
 * 缓存模块
 * 提供 Redis 缓存服务，使用 @Global() 装饰器使其在全局可用
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
