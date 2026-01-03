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
    deepseek_timeout: int = 60
    deepseek_max_retries: int = 3
    deepseek_model: str = "deepseek-chat"

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "health_knowledge"
    rag_top_k: int = 3
    rag_score_threshold: float = 0.7

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None
    redis_db: int = 0
    redis_cache_ttl: int = 3600  # 1小时

    # MongoDB
    mongodb_url: str = "mongodb://admin:mongo123@localhost:27017/health_messages?authSource=admin"
    mongodb_db_name: str = "health_messages"

    # AI 免责声明
    disclaimer_text: str = "此建议仅供参考，请咨询专业医生。AI 生成内容不应替代专业医疗诊断和治疗。"

    # CORS
    # 逗号分隔域名列表，或使用 "*" 表示允许所有来源（建议仅在开发环境使用）
    cors_origins: str = "*"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
