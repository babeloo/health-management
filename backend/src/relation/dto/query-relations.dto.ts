import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RelationStatus } from '../../generated/prisma/client';

/**
 * 查询关系列表 DTO
 */
export class QueryRelationsDto {
  @ApiPropertyOptional({
    description: '关系状态',
    enum: RelationStatus,
    example: RelationStatus.ACTIVE,
  })
  @IsEnum(RelationStatus, { message: '关系状态必须是 ACTIVE 或 INACTIVE' })
  @IsOptional()
  status?: RelationStatus;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为 1' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 20,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为 1' })
  @IsOptional()
  limit?: number = 20;
}
