import { IsString } from 'class-validator';

/**
 * Token 刷新 DTO
 */
export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
