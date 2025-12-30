import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { BindDeviceDto } from './dto/bind-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('设备管理')
@Controller('api/v1/devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '注册设备' })
  @ApiResponse({ status: 201, description: '设备注册成功' })
  @ApiResponse({ status: 400, description: '设备已存在' })
  async registerDevice(@Body() dto: RegisterDeviceDto) {
    const device = await this.deviceService.registerDevice(dto);
    return {
      code: 200,
      message: '设备注册成功',
      data: device,
    };
  }

  @Post(':deviceId/bind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '绑定设备到用户' })
  @ApiResponse({ status: 200, description: '设备绑定成功' })
  @ApiResponse({ status: 404, description: '设备或用户不存在' })
  @ApiResponse({ status: 400, description: '设备已绑定' })
  async bindDevice(@Param('deviceId') deviceId: string, @Body() dto: BindDeviceDto) {
    const device = await this.deviceService.bindDevice(deviceId, dto);
    return {
      code: 200,
      message: '设备绑定成功',
      data: device,
    };
  }

  @Post(':deviceId/unbind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '解绑设备' })
  @ApiResponse({ status: 200, description: '设备解绑成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  async unbindDevice(@Param('deviceId') deviceId: string) {
    const device = await this.deviceService.unbindDevice(deviceId);
    return {
      code: 200,
      message: '设备解绑成功',
      data: device,
    };
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户的设备列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserDevices(@Param('userId') userId: string) {
    const devices = await this.deviceService.getUserDevices(userId);
    return {
      code: 200,
      message: '获取设备列表成功',
      data: {
        devices,
        total: devices.length,
      },
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取设备详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  async getDeviceById(@Param('id') id: string) {
    const device = await this.deviceService.getDeviceById(id);
    return {
      code: 200,
      message: '获取设备详情成功',
      data: device,
    };
  }
}
