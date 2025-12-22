import { IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CheckInType } from '@prisma/client';

/**
 * 趋势分析查询 DTO
 */
export class CheckInTrendQueryDto {
  @ApiProperty({
    description: '打卡类型',
    example: 'BLOOD_PRESSURE',
    enum: ['BLOOD_PRESSURE', 'BLOOD_SUGAR', 'MEDICATION', 'EXERCISE', 'DIET', 'THERAPY'],
  })
  @IsEnum(CheckInType)
  type: CheckInType;

  @ApiProperty({ description: '开始日期（格式：YYYY-MM-DD）', example: '2025-11-22' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '结束日期（格式：YYYY-MM-DD）', example: '2025-12-22' })
  @IsDateString()
  endDate: string;
}

/**
 * 趋势分析统计数据 DTO
 */
export class TrendStatisticsDto {
  @ApiProperty({ description: '平均收缩压（仅血压）', required: false })
  avgSystolic?: number;

  @ApiProperty({ description: '平均舒张压（仅血压）', required: false })
  avgDiastolic?: number;

  @ApiProperty({ description: '平均脉搏（仅血压）', required: false })
  avgPulse?: number;

  @ApiProperty({ description: '最大收缩压（仅血压）', required: false })
  maxSystolic?: number;

  @ApiProperty({ description: '最小收缩压（仅血压）', required: false })
  minSystolic?: number;

  @ApiProperty({ description: '平均血糖值（仅血糖）', required: false })
  avgBloodSugar?: number;

  @ApiProperty({ description: '最大血糖值（仅血糖）', required: false })
  maxBloodSugar?: number;

  @ApiProperty({ description: '最小血糖值（仅血糖）', required: false })
  minBloodSugar?: number;

  @ApiProperty({ description: '总运动时长（仅运动）', required: false })
  totalExerciseDuration?: number;

  @ApiProperty({ description: '平均运动时长（仅运动）', required: false })
  avgExerciseDuration?: number;

  @ApiProperty({ description: '总打卡次数', required: false })
  totalCount?: number;
}

/**
 * 趋势分析响应 DTO
 */
export class CheckInTrendResponseDto {
  @ApiProperty({ description: '打卡类型' })
  type: CheckInType;

  @ApiProperty({ description: '开始日期' })
  startDate: string;

  @ApiProperty({ description: '结束日期' })
  endDate: string;

  @ApiProperty({ description: '打卡数据列表', type: [Object] })
  data: Record<string, unknown>[];

  @ApiProperty({ description: '统计数据', type: TrendStatisticsDto })
  statistics: TrendStatisticsDto;
}
