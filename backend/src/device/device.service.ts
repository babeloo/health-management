import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { BindDeviceDto } from './dto/bind-device.dto';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 注册设备
   */
  async registerDevice(dto: RegisterDeviceDto) {
    // 检查设备是否已存在
    const existingDevice = await this.prisma.device.findUnique({
      where: { deviceId: dto.deviceId },
    });

    if (existingDevice) {
      throw new BadRequestException('设备已注册');
    }

    // 生成MQTT认证信息
    const mqttUsername = `device_${dto.deviceId.replace(/:/g, '_')}`;
    const mqttPassword = this.generateRandomPassword();
    const mqttPasswordHash = await bcrypt.hash(mqttPassword, 10);
    const mqttClientId = `mqtt_client_${dto.deviceId.replace(/:/g, '_')}`;

    // 创建设备记录
    const device = await this.prisma.device.create({
      data: {
        deviceId: dto.deviceId,
        deviceType: dto.deviceType,
        deviceName: dto.deviceName,
        manufacturer: dto.manufacturer,
        model: dto.model,
        firmwareVersion: dto.firmwareVersion,
        mqttUsername,
        mqttPasswordHash,
        mqttClientId,
        status: 'INACTIVE',
        bindStatus: 'UNBOUND',
      },
    });

    // 返回设备信息（包含明文MQTT密码，仅此一次）
    return {
      id: device.id,
      deviceId: device.deviceId,
      deviceType: device.deviceType,
      mqttUsername: device.mqttUsername,
      mqttPassword, // 明文密码仅返回一次
      mqttClientId: device.mqttClientId,
      createdAt: device.createdAt,
    };
  }

  /**
   * 绑定设备到用户
   */
  async bindDevice(deviceId: string, dto: BindDeviceDto) {
    // 检查设备是否存在
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('设备不存在');
    }

    // 检查设备是否已绑定
    if (device.bindStatus === 'BOUND' && device.userId) {
      throw new BadRequestException('设备已绑定到其他用户');
    }

    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 绑定设备
    const updatedDevice = await this.prisma.device.update({
      where: { deviceId },
      data: {
        userId: dto.userId,
        bindStatus: 'BOUND',
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    return updatedDevice;
  }

  /**
   * 解绑设备
   */
  async unbindDevice(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('设备不存在');
    }

    const updatedDevice = await this.prisma.device.update({
      where: { deviceId },
      data: {
        userId: null,
        bindStatus: 'UNBOUND',
        status: 'INACTIVE',
      },
    });

    return updatedDevice;
  }

  /**
   * 获取用户的设备列表
   */
  async getUserDevices(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取设备详情（通过 UUID）
   */
  async getDeviceById(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('设备不存在');
    }

    return device;
  }

  /**
   * 获取设备详情（通过 deviceId）
   */
  async getDeviceByDeviceId(deviceId: string) {
    return this.prisma.device.findUnique({
      where: { deviceId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * 更新设备在线状态
   */
  async updateDeviceOnlineStatus(deviceId: string, isOnline: boolean) {
    return this.prisma.device.update({
      where: { deviceId },
      data: {
        status: isOnline ? 'ACTIVE' : 'OFFLINE',
        lastOnlineAt: isOnline ? new Date() : undefined,
      },
    });
  }

  /**
   * 记录设备数据上报
   */
  async recordDeviceData(deviceId: string) {
    return this.prisma.device.update({
      where: { deviceId },
      data: {
        lastDataAt: new Date(),
      },
    });
  }

  /**
   * 获取所有设备（用于离线检查）
   */
  async getAllDevices() {
    return this.prisma.device.findMany({
      where: {
        bindStatus: 'BOUND',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * 生成随机密码
   */
  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
