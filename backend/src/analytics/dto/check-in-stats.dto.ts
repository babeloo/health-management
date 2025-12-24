import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CheckInType } from '../../generated/prisma/client';

/**
 * 打卡统计查询 DTO
 */
export class CheckInStatsQueryDto {
  @ApiPropertyOptional({ enum: CheckInType, description: '打卡类型' })
  @IsOptional()
  @IsEnum(CheckInType)
  type?: CheckInType;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * 打卡统计响应 DTO
 */
export class CheckInStatsResponseDto {
  // 按日期统计
  dailyStats: Array<{
    date: string;
    count: number;
  }>;

  // 按类型统计
  typeStats: Array<{
    type: CheckInType;
    count: number;
    percentage: number;
  }>;

  // 完成率趋势
  completionRateTrend: Array<{
    date: string;
    rate: number;
  }>;

  // 连续打卡分布
  streakDistribution: Array<{
    days: string;
    userCount: number;
  }>;
}
