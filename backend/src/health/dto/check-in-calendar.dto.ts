import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CheckInType } from '@prisma/client';

/**
 * 日历视图查询 DTO
 */
export class CheckInCalendarQueryDto {
  @ApiProperty({ description: '年份', example: 2025, minimum: 2020, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ description: '月份', example: 12, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}

/**
 * 日历日数据 DTO
 */
export class CalendarDayDto {
  @ApiProperty({ description: '日期（格式：YYYY-MM-DD）', example: '2025-12-01' })
  date: string;

  @ApiProperty({
    description: '已完成的打卡类型',
    example: ['BLOOD_PRESSURE', 'MEDICATION'],
    type: [String],
  })
  checkedTypes: CheckInType[];

  @ApiProperty({ description: '当日总积分', example: 15 })
  totalPoints: number;
}

/**
 * 月度统计数据 DTO
 */
export class MonthlyStatsDto {
  @ApiProperty({ description: '总打卡次数', example: 60 })
  totalCheckIns: number;

  @ApiProperty({ description: '总积分', example: 540 })
  totalPoints: number;

  @ApiProperty({ description: '完成率（百分比）', example: 90 })
  completionRate: number;

  @ApiProperty({ description: '连续打卡天数', example: 7 })
  continuousStreak: number;
}

/**
 * 日历视图响应 DTO
 */
export class CheckInCalendarResponseDto {
  @ApiProperty({ description: '年份' })
  year: number;

  @ApiProperty({ description: '月份' })
  month: number;

  @ApiProperty({ description: '日历数据', type: [CalendarDayDto] })
  calendar: CalendarDayDto[];

  @ApiProperty({ description: '月度统计', type: MonthlyStatsDto })
  monthlyStats: MonthlyStatsDto;
}
