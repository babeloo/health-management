import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { StorageModule } from '../common/storage/storage.module';
import { AuditModule } from '../audit/audit.module';

/**
 * 用户模块
 * 提供用户管理相关功能
 */
@Module({
  imports: [PrismaModule, StorageModule, AuditModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
