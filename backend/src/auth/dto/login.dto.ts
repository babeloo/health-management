import { IsString, MinLength } from 'class-validator';

/**
 * 用户登录 DTO
 */
export class LoginDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
