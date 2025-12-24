import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum PatientStatsGroupBy {
  DISEASE = 'disease',
  RISK_LEVEL = 'risk_level',
  AGE_GROUP = 'age_group',
  GENDER = 'gender',
}

/**
 * 患者统计查询 DTO
 */
export class PatientStatsQueryDto {
  @ApiPropertyOptional({ enum: PatientStatsGroupBy, description: '分组方式' })
  @IsOptional()
  @IsEnum(PatientStatsGroupBy)
  groupBy?: PatientStatsGroupBy;

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
 * 患者统计响应 DTO
 */
export class PatientStatsResponseDto {
  groupBy: string;

  data: Array<{
    label: string;
    count: number;
    percentage: number;
  }>;
}
