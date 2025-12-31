"""
JWT 认证中间件单元测试
"""
import pytest
from jose import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException
from app.middleware.auth import decode_jwt, get_current_user, JWTUser
from app.config import settings
from fastapi.security import HTTPAuthorizationCredentials


def create_test_token(user_id: str, role: str = "patient", expired: bool = False):
    """创建测试用的 JWT Token"""
    payload = {
        "sub": user_id,
        "userId": user_id,
        "role": role,
        "email": "test@example.com",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow()
        + timedelta(seconds=-1 if expired else settings.jwt_expires_in),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


class TestDecodeJWT:
    """测试 JWT 解码功能"""

    def test_decode_valid_token(self):
        """测试解码有效的 JWT Token"""
        token = create_test_token("user123", "patient")
        payload = decode_jwt(token)

        assert payload["sub"] == "user123"
        assert payload["userId"] == "user123"
        assert payload["role"] == "patient"
        assert payload["email"] == "test@example.com"

    def test_decode_expired_token(self):
        """测试解码过期的 JWT Token"""
        token = create_test_token("user123", expired=True)

        with pytest.raises(HTTPException) as exc_info:
            decode_jwt(token)

        assert exc_info.value.status_code == 401
        assert "Token 验证失败" in exc_info.value.detail

    def test_decode_invalid_token(self):
        """测试解码无效的 JWT Token"""
        invalid_token = "invalid.token.here"

        with pytest.raises(HTTPException) as exc_info:
            decode_jwt(invalid_token)

        assert exc_info.value.status_code == 401

    def test_decode_wrong_signature(self):
        """测试解码签名错误的 JWT Token"""
        payload = {"sub": "user123", "role": "patient"}
        wrong_token = jwt.encode(payload, "wrong-secret", algorithm="HS256")

        with pytest.raises(HTTPException) as exc_info:
            decode_jwt(wrong_token)

        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
class TestGetCurrentUser:
    """测试获取当前用户功能"""

    async def test_get_current_user_success(self):
        """测试成功获取当前用户"""
        token = create_test_token("user123", "patient")
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        user = await get_current_user(credentials)

        assert isinstance(user, JWTUser)
        assert user.user_id == "user123"
        assert user.role == "patient"
        assert user.email == "test@example.com"

    async def test_get_current_user_no_credentials(self):
        """测试缺少认证凭证"""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(None)

        assert exc_info.value.status_code == 401
        assert "缺少认证 Token" in exc_info.value.detail

    async def test_get_current_user_expired_token(self):
        """测试过期的 Token"""
        token = create_test_token("user123", expired=True)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials)

        assert exc_info.value.status_code == 401

    async def test_get_current_user_missing_user_id(self):
        """测试 Token 中缺少 user_id"""
        payload = {"role": "patient", "email": "test@example.com"}
        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials)

        assert exc_info.value.status_code == 401
        assert "缺少用户 ID" in exc_info.value.detail

    async def test_get_current_user_different_roles(self):
        """测试不同角色的用户"""
        roles = ["patient", "doctor", "health_manager", "admin"]

        for role in roles:
            token = create_test_token(f"user_{role}", role)
            credentials = HTTPAuthorizationCredentials(
                scheme="Bearer", credentials=token
            )

            user = await get_current_user(credentials)

            assert user.user_id == f"user_{role}"
            assert user.role == role


class TestJWTUser:
    """测试 JWTUser 类"""

    def test_jwt_user_creation(self):
        """测试创建 JWTUser 对象"""
        user = JWTUser(user_id="user123", role="patient", email="test@example.com")

        assert user.user_id == "user123"
        assert user.role == "patient"
        assert user.email == "test@example.com"

    def test_jwt_user_without_email(self):
        """测试创建不带 email 的 JWTUser 对象"""
        user = JWTUser(user_id="user123", role="patient")

        assert user.user_id == "user123"
        assert user.role == "patient"
        assert user.email is None
