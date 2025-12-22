import { IsEnum, IsOptional, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CheckInType } from '../../generated/prisma/client';

/**
 * 打卡记录查询 DTO
 */
export class CheckInQueryDto {
  @ApiProperty({
    description: '打卡类型',
    example: 'BLOOD_PRESSURE',
    enum: ['BLOOD_PRESSURE', 'BLOOD_SUGAR', 'MEDICATION', 'EXERCISE', 'DIET', 'THERAPY'],
    required: false,
  })
  @IsOptional()
  @IsEnum(CheckInType)
  type?: CheckInType;

  @ApiProperty({
    description: '开始日期（格式：YYYY-MM-DD）',
    example: '2025-12-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: '结束日期（格式：YYYY-MM-DD）',
    example: '2025-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: '页码', example: 1, minimum: 1, default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', example: 20, minimum: 1, default: 20, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
