import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RiskCalculationService } from './services/risk-calculation.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { StorageModule } from '../common/storage/storage.module';
import { InfluxModule } from '../common/influx/influx.module';

/**
 * 健康档案模块
 * 提供健康档案管理功能
 */
@Module({
  imports: [PrismaModule, StorageModule, InfluxModule],
  controllers: [HealthController],
  providers: [HealthService, RiskCalculationService],
  exports: [HealthService],
})
export class HealthModule {}
