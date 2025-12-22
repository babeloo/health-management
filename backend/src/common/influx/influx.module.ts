import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InfluxService } from './influx.service';
import influxConfig from './influx.config';

/**
 * InfluxDB 模块
 * 全局模块，供其他模块使用时序数据存储功能
 */
@Global()
@Module({
  imports: [ConfigModule.forFeature(influxConfig)],
  providers: [InfluxService],
  exports: [InfluxService],
})
export class InfluxModule {}
