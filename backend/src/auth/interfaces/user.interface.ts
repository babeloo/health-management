/**
 * JWT Payload 接口
 */
export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

/**
 * 当前用户接口
 */
export interface CurrentUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  fullName: string | null;
}
