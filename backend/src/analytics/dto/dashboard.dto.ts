import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 仪表盘查询 DTO
 */
export class DashboardQueryDto {
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
 * 仪表盘响应 DTO
 */
export class DashboardResponseDto {
  // 患者统计
  totalPatients: number;

  activePatients: number;

  newPatientsWeek: number;

  newPatientsMonth: number;

  // 打卡统计
  totalCheckIns: number;

  todayCheckIns: number;

  checkInCompletionRate: number;

  // 风险统计
  highRiskPatients: number;

  mediumRiskPatients: number;

  lowRiskPatients: number;

  // 人员统计
  totalDoctors: number;

  totalHealthManagers: number;

  // 积分排行榜
  topPatients: Array<{
    userId: string;
    fullName: string;
    totalPoints: number;
    rank: number;
  }>;
}
