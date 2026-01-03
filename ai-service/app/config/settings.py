"""
配置管理模块
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""

    # JWT 配置
    jwt_secret: str = "your-super-secret-jwt-key-change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expires_in: int = 86400  # 24小时（秒）

    # DeepSeek API
    deepseek_api_key: Optional[str] = None
    deepseek_base_url: str = "https://api.deepseek.com/v1"

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "health_knowledge"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None

    # CORS
    # 逗号分隔域名列表，或使用 "*" 表示允许所有来源（建议仅在开发环境使用）
    cors_origins: str = "*"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
