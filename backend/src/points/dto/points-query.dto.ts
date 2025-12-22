import { IsOptional, IsInt, Min, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { TransactionType } from '../../generated/prisma/client';

/**
 * 积分交易历史查询 DTO
 */
export class PointsTransactionQueryDto {
  @ApiProperty({
    description: '页码（从 1 开始）',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '每页条数',
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({
    description: '交易类型过滤',
    enum: ['EARN', 'REDEEM', 'BONUS', 'PENALTY'],
    required: false,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiProperty({
    description: '开始日期（ISO 8601 格式）',
    example: '2025-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: '结束日期（ISO 8601 格式）',
    example: '2025-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * 积分余额响应 DTO
 */
export class PointsBalanceResponseDto {
  @ApiProperty({ description: '用户 ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiProperty({ description: '当前积分余额', example: 1250 })
  balance: number;

  @ApiProperty({ description: '总获得积分', example: 1500 })
  totalEarned: number;

  @ApiProperty({ description: '总消费积分', example: 250 })
  totalRedeemed: number;
}

/**
 * 积分交易记录响应 DTO
 */
export class PointsTransactionResponseDto {
  @ApiProperty({ description: '交易 ID', example: '550e8400-e29b-41d4-a716-446655440003' })
  id: string;

  @ApiProperty({ description: '用户 ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiProperty({
    description: '交易类型',
    example: 'EARN',
    enum: ['EARN', 'REDEEM', 'BONUS', 'PENALTY'],
  })
  type: TransactionType;

  @ApiProperty({ description: '积分变化（正数为获得，负数为消费）', example: 10 })
  points: number;

  @ApiProperty({ description: '来源/用途', example: 'check_in', nullable: true })
  source: string | null;

  @ApiProperty({
    description: '关联 ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  sourceId: string | null;

  @ApiProperty({ description: '交易描述', example: '血压打卡成功', nullable: true })
  description: string | null;

  @ApiProperty({ description: '创建时间', example: '2025-12-23T10:30:00.000Z' })
  createdAt: Date;
}
