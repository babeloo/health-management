import { Module } from '@nestjs/common';
import { RelationController } from './relation.controller';
import { RelationService } from './relation.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

/**
 * 医患关系管理模块
 * 提供医生-患者关系和健康管理师-会员关系的管理功能
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [RelationController],
  providers: [RelationService],
  exports: [RelationService],
})
export class RelationModule {}
