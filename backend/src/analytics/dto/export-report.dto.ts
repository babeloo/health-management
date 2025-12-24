import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportType {
  PATIENTS = 'patients',
  CHECK_INS = 'check_ins',
  RISK_ASSESSMENTS = 'risk_assessments',
  LEADERBOARD = 'leaderboard',
}

/**
 * 导出报表 DTO
 */
export class ExportReportDto {
  @ApiProperty({ enum: ReportType, description: '报表类型' })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
