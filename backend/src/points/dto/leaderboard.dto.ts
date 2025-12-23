import { IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 排行榜查询 DTO
 */
export class LeaderboardQueryDto {
  @ApiProperty({
    description: '排行榜时间维度',
    enum: ['all-time', 'weekly'],
    default: 'all-time',
    required: false,
  })
  @IsOptional()
  @IsEnum(['all-time', 'weekly'])
  period?: 'all-time' | 'weekly' = 'all-time';

  @ApiProperty({
    description: '返回前 N 名',
    minimum: 1,
    maximum: 500,
    default: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  limit?: number = 100;

  @ApiProperty({
    description: '是否包含当前用户排名',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  includeSelf?: boolean = true;
}

/**
 * 排行榜条目 DTO
 */
export class LeaderboardEntryDto {
  @ApiProperty({ description: '排名（1-based）' })
  rank: number;

  @ApiProperty({ description: '用户 ID' })
  userId: string;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '真实姓名（可选）', required: false })
  fullName?: string;

  @ApiProperty({ description: '头像 URL（可选）', required: false })
  avatarUrl?: string;

  @ApiProperty({ description: '积分数' })
  points: number;
}

/**
 * 排行榜响应 DTO
 */
export class LeaderboardResponseDto {
  @ApiProperty({ description: '排行榜时间维度', enum: ['all-time', 'weekly'] })
  period: string;

  @ApiProperty({ description: '排行榜时间标签（中文）', example: '总榜' })
  periodLabel: string;

  @ApiProperty({ description: '排行榜 Top N 用户', type: [LeaderboardEntryDto] })
  topEntries: LeaderboardEntryDto[];

  @ApiProperty({ description: '当前用户排名信息（可选）', required: false })
  currentUser?: LeaderboardEntryDto | null;

  @ApiProperty({ description: '排行榜总用户数' })
  totalUsers: number;
}
