import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Role } from '../enums/role.enum';

/**
 * 用户注册 DTO
 */
export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/, {
    message: '密码必须包含大小写字母和数字,长度至少6位',
  })
  password: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^1[3-9]\d{9}$/, {
    message: '手机号格式不正确',
  })
  phone?: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;
}
