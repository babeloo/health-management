import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { MembershipType } from './membership-type.enum';

/**
 * 更新会员类型 DTO
 */
export class UpdateMembershipDto {
  @ApiProperty({
    description: '会员类型',
    enum: MembershipType,
    example: MembershipType.PREMIUM,
  })
  @IsEnum(MembershipType, { message: '会员类型必须是 basic, premium 或 vip' })
  @IsNotEmpty({ message: '会员类型不能为空' })
  membershipType: MembershipType;
}
