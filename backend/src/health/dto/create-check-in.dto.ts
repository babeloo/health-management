import {
  IsEnum,
  IsOptional,
  IsString,
  IsObject,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CheckInType } from '../../generated/prisma/client';

/**
 * 血压打卡数据 DTO
 */
export class BloodPressureDataDto {
  @ApiProperty({ description: '收缩压 (90-200 mmHg)', example: 120, minimum: 90, maximum: 200 })
  @IsNumber()
  @Min(90)
  @Max(200)
  systolic: number;

  @ApiProperty({ description: '舒张压 (60-120 mmHg)', example: 80, minimum: 60, maximum: 120 })
  @IsNumber()
  @Min(60)
  @Max(120)
  diastolic: number;

  @ApiProperty({
    description: '脉搏 (40-150 次/分)',
    example: 72,
    minimum: 40,
    maximum: 150,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(150)
  pulse?: number;
}

/**
 * 血糖打卡数据 DTO
 */
export class BloodSugarDataDto {
  @ApiProperty({ description: '血糖值 (3-30 mmol/L)', example: 5.6, minimum: 3, maximum: 30 })
  @IsNumber()
  @Min(3)
  @Max(30)
  value: number;

  @ApiProperty({
    description: '测量时机',
    example: 'fasting',
    enum: ['before_meal', 'after_meal', 'fasting'],
  })
  @IsEnum(['before_meal', 'after_meal', 'fasting'])
  timing: 'before_meal' | 'after_meal' | 'fasting';
}

/**
 * 用药打卡数据 DTO
 */
export class MedicationDataDto {
  @ApiProperty({ description: '药物名称', example: '阿司匹林' })
  @IsString()
  medication: string;

  @ApiProperty({ description: '剂量', example: '100mg' })
  @IsString()
  dosage: string;

  @ApiProperty({ description: '是否已服用', example: true })
  @IsBoolean()
  taken: boolean;
}

/**
 * 运动打卡数据 DTO
 */
export class ExerciseDataDto {
  @ApiProperty({ description: '运动类型', example: '慢跑' })
  @IsString()
  exerciseType: string;

  @ApiProperty({ description: '时长（分钟）', example: 30, minimum: 1 })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ description: '强度', example: 'moderate', enum: ['low', 'moderate', 'high'] })
  @IsEnum(['low', 'moderate', 'high'])
  intensity: 'low' | 'moderate' | 'high';
}

/**
 * 饮食打卡数据 DTO
 */
export class DietDataDto {
  @ApiProperty({
    description: '餐次',
    example: 'lunch',
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
  })
  @IsEnum(['breakfast', 'lunch', 'dinner', 'snack'])
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';

  @ApiProperty({ description: '食物列表', example: ['米饭', '炒青菜', '鸡胸肉'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  items: string[];

  @ApiProperty({ description: '热量（卡路里）', example: 500, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;
}

/**
 * 理疗打卡数据 DTO
 */
export class TherapyDataDto {
  @ApiProperty({ description: '理疗类型', example: '针灸' })
  @IsString()
  therapyType: string;

  @ApiProperty({ description: '时长（分钟）', example: 60, minimum: 1 })
  @IsNumber()
  @Min(1)
  duration: number;
}

/**
 * 创建打卡记录 DTO
 */
export class CreateCheckInDto {
  @ApiProperty({
    description: '打卡类型',
    example: 'BLOOD_PRESSURE',
    enum: ['BLOOD_PRESSURE', 'BLOOD_SUGAR', 'MEDICATION', 'EXERCISE', 'DIET', 'THERAPY'],
  })
  @IsEnum(CheckInType)
  type: CheckInType;

  @ApiProperty({
    description: '打卡数据（根据类型不同，字段不同）',
    example: { systolic: 120, diastolic: 80, pulse: 72 },
  })
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;

  @ApiProperty({ description: '备注', example: '今日状态良好', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: '打卡日期（格式：YYYY-MM-DD）',
    example: '2025-12-22',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  checkInDate?: string;
}
