import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileStorageService } from './file-storage.service';

/**
 * 存储模块
 * 提供文件存储服务（MinIO）
 */
@Module({
  imports: [ConfigModule],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class StorageModule {}
