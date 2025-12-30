import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

/**
 * MQTT 测试接口
 * 用于测试 MQTT 消息发布和服务状态查看
 */
@Controller('api/v1/mqtt')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  /**
   * 发布测试消息到 MQTT（仅管理员）
   * POST /api/v1/mqtt/publish
   */
  @Post('publish')
  @Permissions(Permission.MANAGE_USERS)
  @HttpCode(HttpStatus.OK)
  async publishMessage(
    @Body() body: { topic: string; message: string },
  ): Promise<{ success: boolean; message: string }> {
    const { topic, message } = body;
    await this.mqttService.publishMessage(topic, message);

    return {
      success: true,
      message: `消息已发布到主题: ${topic}`,
    };
  }

  /**
   * 获取 MQTT 服务状态
   * GET /api/v1/mqtt/status
   */
  @Get('status')
  @Permissions(Permission.MANAGE_USERS)
  getMqttStatus(): { connected: boolean; reconnecting: boolean } {
    return this.mqttService.getMqttStatus();
  }

  /**
   * 模拟设备数据上报（仅用于测试，生产环境禁用）
   * POST /api/v1/mqtt/simulate-device-data
   */
  @Post('simulate-device-data')
  @Permissions(Permission.MANAGE_USERS)
  @HttpCode(HttpStatus.OK)
  async simulateDeviceData(
    @Body()
    body: {
      deviceId: string;
      type: 'blood_pressure' | 'blood_glucose';
      data: any;
    },
  ): Promise<{ success: boolean; message: string }> {
    const { deviceId, type, data } = body;

    const deviceData = {
      deviceId,
      timestamp: Date.now(),
      type,
      data,
    };

    const topic = `devices/${deviceId}/data`;
    const message = JSON.stringify(deviceData);

    await this.mqttService.publishMessage(topic, message);

    return {
      success: true,
      message: '设备数据模拟发送成功',
    };
  }
}
