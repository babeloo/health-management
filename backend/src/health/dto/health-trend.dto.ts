import { IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 健康趋势查询 DTO（基于 InfluxDB 时序数据）
 */
export class GetHealthTrendDto {
  @ApiProperty({
    description: '数据类型',
    example: 'BLOOD_PRESSURE',
    enum: ['BLOOD_PRESSURE', 'BLOOD_SUGAR'],
  })
  @IsEnum(['BLOOD_PRESSURE', 'BLOOD_SUGAR'])
  type: 'BLOOD_PRESSURE' | 'BLOOD_SUGAR';

  @ApiProperty({
    description: '查询天数（1-90 天）',
    example: 7,
    minimum: 1,
    maximum: 90,
  })
  @IsInt()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  days: number = 7; // 默认查询 7 天
}

/**
 * 健康趋势响应 DTO（血压）
 */
export class BloodPressureTrendDto {
  @ApiProperty({ description: '时间戳', example: '2025-12-22T10:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ description: '收缩压 (mmHg)', example: 120 })
  systolic: number;

  @ApiProperty({ description: '舒张压 (mmHg)', example: 80 })
  diastolic: number;

  @ApiProperty({ description: '脉搏 (次/分)', example: 72, required: false })
  pulse?: number;
}

/**
 * 健康趋势响应 DTO（血糖）
 */
export class BloodSugarTrendDto {
  @ApiProperty({ description: '时间戳', example: '2025-12-22T10:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ description: '血糖值 (mmol/L)', example: 5.6 })
  value: number;

  @ApiProperty({
    description: '测量时机',
    example: 'fasting',
    enum: ['before_meal', 'after_meal', 'fasting'],
  })
  timing: string;
}

/**
 * 健康趋势响应 DTO
 */
export class HealthTrendResponseDto {
  @ApiProperty({ description: '数据类型', example: 'BLOOD_PRESSURE' })
  type: string;

  @ApiProperty({ description: '查询天数', example: 7 })
  days: number;

  @ApiProperty({
    description: '趋势数据（血压或血糖）',
    type: [Object],
    example: [{ timestamp: '2025-12-22T10:30:00.000Z', systolic: 120, diastolic: 80, pulse: 72 }],
  })
  data: BloodPressureTrendDto[] | BloodSugarTrendDto[];

  @ApiProperty({ description: '数据总数', example: 7 })
  totalCount: number;
}
