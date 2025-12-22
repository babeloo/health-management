import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 获得积分 DTO
 */
export class EarnPointsDto {
  @ApiProperty({
    description: '用户 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: '积分数量（必须为正数）',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  points: number;

  @ApiProperty({
    description: '积分来源',
    example: 'check_in',
    enum: ['check_in', 'continuous_streak', 'bonus', 'referral', 'system_reward'],
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description: '来源关联 ID（如打卡记录 ID）',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({
    description: '交易描述',
    example: '血压打卡成功',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
