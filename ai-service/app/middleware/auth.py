"""
JWT 认证中间件
"""
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from typing import Optional, Dict, Any
from app.config import settings

security = HTTPBearer()


class JWTUser:
    """JWT 解析后的用户信息"""

    def __init__(self, user_id: str, role: str, email: Optional[str] = None):
        self.user_id = user_id
        self.role = role
        self.email = email


def decode_jwt(token: str) -> Dict[str, Any]:
    """
    解码并验证 JWT Token

    Args:
        token: JWT token 字符串

    Returns:
        解码后的 payload

    Raises:
        HTTPException: Token 无效或过期
    """
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token 验证失败: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = security,
) -> JWTUser:
    """
    从请求中提取并验证 JWT，返回用户信息

    Args:
        credentials: HTTP Bearer 认证凭证

    Returns:
        JWTUser: 用户信息对象

    Raises:
        HTTPException: 401 - Token 缺失或无效
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少认证 Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_jwt(token)

    # 提取用户信息（兼容 NestJS 的 JWT payload 格式）
    user_id = payload.get("sub") or payload.get("userId")
    role = payload.get("role")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 中缺少用户 ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return JWTUser(user_id=user_id, role=role, email=payload.get("email"))
