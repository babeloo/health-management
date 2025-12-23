import { Module } from '@nestjs/common';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PointsRulesService } from './services/points-rules.service';
import { StreakCalculationService } from './services/streak-calculation.service';

/**
 * 积分模块
 * 管理用户积分的获得、消费、查询和交易历史
 */
@Module({
  imports: [PrismaModule],
  controllers: [PointsController],
  providers: [PointsService, PointsRulesService, StreakCalculationService],
  exports: [PointsService, PointsRulesService, StreakCalculationService], // 导出供其他模块使用
})
export class PointsModule {}
