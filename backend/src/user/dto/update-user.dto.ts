import { IsOptional, IsString, IsEnum, IsDateString, MaxLength, MinLength } from 'class-validator';

/**
 * 更新用户信息 DTO
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}
