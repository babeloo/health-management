import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { DeviceService } from '../device/device.service';
import { HealthService } from '../health/health.service';
import { InfluxService } from '../common/influx/influx.service';
import { NotificationService } from '../notification/notification.service';
import { DeviceDataDto, DeviceDataType } from './dto';
import { CheckInType } from '../generated/prisma/client';

/**
 * MQTT 服务
 * 负责订阅设备主题并处理设备数据上报
 */
@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);

  private mqttClient: MqttClient | null = null;

  private readonly deviceTopic = 'devices/+/data'; // 订阅所有设备的数据主题

  constructor(
    private readonly configService: ConfigService,
    private readonly deviceService: DeviceService,
    private readonly healthService: HealthService,
    private readonly influxService: InfluxService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 模块初始化时连接 MQTT Broker
   */
  async onModuleInit() {
    await this.connectMqtt();
  }

  /**
   * 模块销毁时断开 MQTT 连接
   */
  async onModuleDestroy() {
    await this.disconnectMqtt();
  }

  /**
   * 连接 MQTT Broker 并订阅设备主题
   */
  private async connectMqtt(): Promise<void> {
    const mqttUrl = this.configService.get<string>('MQTT_BROKER_URL', 'mqtt://localhost:1883');
    const mqttUsername = this.configService.get<string>('MQTT_BROKER_USERNAME');
    const mqttPassword = this.configService.get<string>('MQTT_BROKER_PASSWORD');

    this.logger.log(`正在连接 MQTT Broker: ${mqttUrl}`);

    this.mqttClient = mqtt.connect(mqttUrl, {
      clientId: `nest_backend_${Date.now()}`,
      username: mqttUsername,
      password: mqttPassword,
      clean: true,
      reconnectPeriod: 5000, // 5秒重连
    });

    this.mqttClient.on('connect', () => {
      this.logger.log('MQTT Broker 连接成功');
      this.subscribeToDevices();
    });

    this.mqttClient.on('error', (error: Error) => {
      this.logger.error(`MQTT 连接错误: ${error.message}`, error.stack);
    });

    this.mqttClient.on('offline', () => {
      this.logger.warn('MQTT Broker 离线');
    });

    this.mqttClient.on('reconnect', () => {
      this.logger.log('正在重新连接 MQTT Broker...');
    });

    this.mqttClient.on('message', async (topic: string, message: Buffer) => {
      await this.handleDeviceMessage(topic, message);
    });
  }

  /**
   * 订阅设备数据主题
   */
  private subscribeToDevices(): void {
    if (!this.mqttClient) {
      this.logger.error('MQTT 客户端未初始化');
      return;
    }

    this.mqttClient.subscribe(this.deviceTopic, { qos: 1 }, (err) => {
      if (err) {
        this.logger.error(`订阅主题失败: ${this.deviceTopic}`, err);
      } else {
        this.logger.log(`成功订阅主题: ${this.deviceTopic}`);
      }
    });
  }

  /**
   * 处理设备消息
   */
  private async handleDeviceMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const payload = message.toString();
      this.logger.log(`收到设备消息 [${topic}]: ${payload}`);

      // 解析 JSON 数据
      const deviceData = this.parseDeviceData(payload);
      if (!deviceData) {
        this.logger.error(`无效的设备数据格式: ${payload}`);
        return;
      }

      // 验证数据
      const validationErrors = await this.validateDeviceData(deviceData);
      if (validationErrors.length > 0) {
        this.logger.error(`设备数据验证失败: ${JSON.stringify(validationErrors)}`);
        return;
      }

      // 处理设备数据
      await this.processDeviceData(deviceData);
    } catch (error) {
      this.logger.error(`处理设备消息失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 解析设备数据
   */
  private parseDeviceData(payload: string): DeviceDataDto | null {
    try {
      const data = JSON.parse(payload);
      return plainToClass(DeviceDataDto, data);
    } catch (error) {
      this.logger.error(`JSON 解析失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 验证设备数据
   */
  private async validateDeviceData(deviceData: DeviceDataDto): Promise<string[]> {
    const errors = await validate(deviceData);
    return errors.map((err) => Object.values(err.constraints || {}).join(', '));
  }

  /**
   * 处理设备数据（核心业务逻辑）
   */
  private async processDeviceData(deviceData: DeviceDataDto): Promise<void> {
    const { deviceId, timestamp, type, data } = deviceData;

    try {
      // 1. 验证设备是否存在并绑定到用户（通过 deviceId 查询）
      const device = await this.deviceService.getDeviceByDeviceId(deviceId);
      if (!device) {
        this.logger.error(`设备不存在: ${deviceId}`);
        return;
      }

      if (!device.userId) {
        this.logger.warn(`设备未绑定用户: ${deviceId}`);
        return;
      }

      const { userId } = device;

      // 2. 更新设备在线状态和数据上报时间
      await this.deviceService.updateDeviceOnlineStatus(deviceId, true);
      await this.deviceService.recordDeviceData(deviceId);

      // 3. 根据数据类型处理
      if (type === DeviceDataType.BLOOD_PRESSURE) {
        await this.processBloodPressureData(userId, deviceId, timestamp, data as any);
      } else if (type === DeviceDataType.BLOOD_GLUCOSE) {
        await this.processBloodGlucoseData(userId, deviceId, timestamp, data as any);
      }

      this.logger.log(`设备数据处理成功: deviceId=${deviceId}, userId=${userId}, type=${type}`);
    } catch (error) {
      this.logger.error(
        `处理设备数据失败: deviceId=${deviceId}, error=${error.message}`,
        error.stack,
      );
      // 降级处理：记录错误但不抛出异常，避免阻塞其他消息处理
    }
  }

  /**
   * 处理血压数据
   */
  private async processBloodPressureData(
    userId: string,
    deviceId: string,
    timestamp: number,
    data: { systolic: number; diastolic: number; pulse: number },
  ): Promise<void> {
    try {
      // 自动创建血压打卡记录
      const checkIn = await this.healthService.createCheckIn(userId, {
        type: CheckInType.BLOOD_PRESSURE,
        checkInDate: new Date(timestamp).toISOString().split('T')[0],
        notes: `设备自动上报 (${deviceId})`,
        data: {
          systolic: data.systolic,
          diastolic: data.diastolic,
          pulse: data.pulse,
        },
      });

      this.logger.log(
        `血压打卡创建成功: userId=${userId}, checkInId=${checkIn.id}, 血压=${data.systolic}/${data.diastolic}`,
      );

      // 自动同步到 InfluxDB (HealthService 内部已处理)
      // 无需额外调用
    } catch (error) {
      this.logger.error(`血压数据处理失败: userId=${userId}, error=${error.message}`, error.stack);
    }
  }

  /**
   * 处理血糖数据
   */
  private async processBloodGlucoseData(
    userId: string,
    deviceId: string,
    timestamp: number,
    data: { glucose_value: number; test_type: string },
  ): Promise<void> {
    try {
      // 自动创建血糖打卡记录
      const checkIn = await this.healthService.createCheckIn(userId, {
        type: CheckInType.BLOOD_SUGAR,
        checkInDate: new Date(timestamp).toISOString().split('T')[0],
        notes: `设备自动上报 (${deviceId})`,
        data: {
          value: data.glucose_value,
          timing: data.test_type,
        },
      });

      this.logger.log(
        `血糖打卡创建成功: userId=${userId}, checkInId=${checkIn.id}, 血糖=${data.glucose_value} (${data.test_type})`,
      );

      // 自动同步到 InfluxDB (HealthService 内部已处理)
      // 无需额外调用
    } catch (error) {
      this.logger.error(`血糖数据处理失败: userId=${userId}, error=${error.message}`, error.stack);
    }
  }

  /**
   * 检查设备离线状态（定时任务调用）
   * 如果设备超过1小时未上报数据，发送离线通知
   */
  async checkDeviceOfflineStatus(): Promise<void> {
    try {
      // 获取所有设备
      const devices = await this.deviceService.getAllDevices();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // 筛选离线设备
      const offlineDevices = devices.filter(
        (device) =>
          device.lastDataAt && device.lastDataAt < oneHourAgo && device.status !== 'OFFLINE',
      );

      // 并行处理所有离线设备
      await Promise.all(
        offlineDevices.map(async (device) => {
          // 设备离线
          await this.deviceService.updateDeviceOnlineStatus(device.deviceId, false);

          // 发送离线通知
          if (device.userId) {
            await this.notificationService.createNotification({
              userId: device.userId,
              type: 'SYSTEM_NOTIFICATION',
              title: '设备离线提醒',
              content: `您的设备 ${device.deviceName || device.deviceId} 已超过1小时未上报数据，请检查设备连接`,
            });
          }

          this.logger.warn(
            `设备离线: deviceId=${device.deviceId}, 上次数据时间=${device.lastDataAt}`,
          );
        }),
      );
    } catch (error) {
      this.logger.error(`检查设备离线状态失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 断开 MQTT 连接
   */
  private async disconnectMqtt(): Promise<void> {
    if (this.mqttClient) {
      this.logger.log('正在断开 MQTT Broker 连接...');
      await this.mqttClient.endAsync();
      this.mqttClient = null;
      this.logger.log('MQTT Broker 已断开连接');
    }
  }

  /**
   * 发布消息到 MQTT 主题（用于测试）
   */
  async publishMessage(topic: string, message: string): Promise<void> {
    if (!this.mqttClient) {
      throw new Error('MQTT 客户端未连接');
    }

    return new Promise<void>((resolve, reject) => {
      this.mqttClient!.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`发布消息失败: topic=${topic}, error=${err.message}`);
          reject(err);
        } else {
          this.logger.log(`消息发布成功: topic=${topic}, message=${message}`);
          resolve();
        }
      });
    });
  }

  /**
   * 获取 MQTT 客户端状态
   */
  getMqttStatus(): { connected: boolean; reconnecting: boolean } {
    return {
      connected: this.mqttClient?.connected || false,
      reconnecting: this.mqttClient?.reconnecting || false,
    };
  }
}
