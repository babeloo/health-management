/**
 * 认证响应 DTO
 */
export class AuthResponseDto {
  /**
   * 访问令牌 (15分钟有效期)
   */
  accessToken: string;

  /**
   * 刷新令牌 (7天有效期)
   */
  refreshToken: string;

  /**
   * 令牌类型
   */
  tokenType: string = 'Bearer';

  /**
   * 访问令牌过期时间(秒)
   */
  expiresIn: number;

  /**
   * 用户信息
   */
  user: {
    id: string;
    username: string;
    role: string;
    fullName?: string;
    email?: string;
  };
}
