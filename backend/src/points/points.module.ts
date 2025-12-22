import { Module } from '@nestjs/common';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

/**
 * 积分模块
 * 管理用户积分的获得、消费、查询和交易历史
 */
@Module({
  imports: [PrismaModule],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService], // 导出供其他模块使用（如打卡模块自动发放积分）
})
export class PointsModule {}
