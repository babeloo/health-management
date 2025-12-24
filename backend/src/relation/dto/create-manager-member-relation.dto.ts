import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { MembershipType } from './membership-type.enum';

/**
 * 创建健康管理师会员关系 DTO
 */
export class CreateManagerMemberRelationDto {
  @ApiProperty({
    description: '健康管理师 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: '健康管理师 ID 必须是有效的 UUID' })
  @IsNotEmpty({ message: '健康管理师 ID 不能为空' })
  managerId: string;

  @ApiProperty({
    description: '会员 ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID('4', { message: '会员 ID 必须是有效的 UUID' })
  @IsNotEmpty({ message: '会员 ID 不能为空' })
  memberId: string;

  @ApiProperty({
    description: '会员类型',
    enum: MembershipType,
    example: MembershipType.BASIC,
    required: false,
  })
  @IsEnum(MembershipType, { message: '会员类型必须是 basic, premium 或 vip' })
  @IsOptional()
  membershipType?: MembershipType;
}
