import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { MqttController } from './mqtt.controller';
import { DeviceModule } from '../device/device.module';
import { HealthModule } from '../health/health.module';
import { InfluxModule } from '../common/influx/influx.module';
import { NotificationModule } from '../notification/notification.module';

/**
 * MQTT 模块
 * 负责设备数据接收和处理
 */
@Module({
  imports: [DeviceModule, HealthModule, InfluxModule, NotificationModule],
  controllers: [MqttController],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
