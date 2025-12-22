import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 消费积分 DTO
 */
export class RedeemPointsDto {
  @ApiProperty({
    description: '用户 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: '消费积分数量（必须为正数）',
    example: 100,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  points: number;

  @ApiProperty({
    description: '消费用途',
    example: 'gift_redemption',
    enum: ['gift_redemption', 'service_redemption', 'donation'],
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description: '关联 ID（如礼品 ID、服务 ID）',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({
    description: '交易描述',
    example: '兑换健康礼包',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
