import { IsString, IsEnum, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DeviceType {
  BLOOD_PRESSURE_MONITOR = 'BLOOD_PRESSURE_MONITOR',
  BLOOD_GLUCOSE_METER = 'BLOOD_GLUCOSE_METER',
  WEIGHT_SCALE = 'WEIGHT_SCALE',
  THERMOMETER = 'THERMOMETER',
  OXIMETER = 'OXIMETER',
  ECG_MONITOR = 'ECG_MONITOR',
  OTHER = 'OTHER',
}

/**
 * 设备注册 DTO
 */
export class RegisterDeviceDto {
  @ApiProperty({
    description: '设备唯一标识符（如MAC地址）',
    example: 'AA:BB:CC:DD:EE:FF',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deviceId: string;

  @ApiProperty({
    description: '设备类型',
    enum: DeviceType,
    example: DeviceType.BLOOD_PRESSURE_MONITOR,
  })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiPropertyOptional({
    description: '设备名称',
    example: '我的血压计',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  deviceName?: string;

  @ApiPropertyOptional({
    description: '制造商',
    example: 'Omron',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional({
    description: '型号',
    example: 'HEM-7121',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({
    description: '固件版本',
    example: '1.0.0',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firmwareVersion?: string;
}
