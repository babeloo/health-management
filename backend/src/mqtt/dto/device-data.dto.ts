import { IsString, IsNumber, IsEnum, IsObject, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 设备数据类型枚举
 */
export enum DeviceDataType {
  BLOOD_PRESSURE = 'blood_pressure',
  BLOOD_GLUCOSE = 'blood_glucose',
}

/**
 * 血压数据 DTO
 */
export class BloodPressureDataDto {
  @IsNumber()
  @Min(60)
  @Max(250)
  systolic: number;

  @IsNumber()
  @Min(40)
  @Max(150)
  diastolic: number;

  @IsNumber()
  @Min(40)
  @Max(200)
  pulse: number;
}

/**
 * 血糖数据 DTO
 */
export class BloodGlucoseDataDto {
  @IsNumber()
  @Min(0.5)
  @Max(50)
  glucose_value: number;

  @IsString()
  @IsEnum(['fasting', 'postprandial', 'random', 'bedtime'])
  test_type: 'fasting' | 'postprandial' | 'random' | 'bedtime';
}

/**
 * 设备数据 DTO（MQTT 消息格式）
 */
export class DeviceDataDto {
  @IsString()
  deviceId: string;

  @IsNumber()
  timestamp: number;

  @IsString()
  @IsEnum(DeviceDataType)
  type: DeviceDataType;

  @IsObject()
  @ValidateNested()
  @Type((obj) => {
    if (obj?.object?.type === DeviceDataType.BLOOD_PRESSURE) {
      return BloodPressureDataDto;
    }
    if (obj?.object?.type === DeviceDataType.BLOOD_GLUCOSE) {
      return BloodGlucoseDataDto;
    }
    return Object;
  })
  data: BloodPressureDataDto | BloodGlucoseDataDto;
}
