"""
Configuration Management
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""

    # 应用配置
    APP_NAME: str = "AI Health Service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # DeepSeek API配置
    DEEPSEEK_API_KEY: str
    DEEPSEEK_API_BASE: str = "https://api.deepseek.com/v1"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_MAX_RETRIES: int = 3
    DEEPSEEK_TIMEOUT: int = 30

    # MongoDB配置
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "health_mgmt"

    # Redis配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    REDIS_CACHE_TTL: int = 300  # 5分钟

    # Qdrant配置
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_NAME: str = "health_knowledge"
    QDRANT_API_KEY: Optional[str] = None

    # RAG配置
    RAG_TOP_K: int = 5
    RAG_SCORE_THRESHOLD: float = 0.7

    # 免责声明
    DISCLAIMER_TEXT: str = "此建议仅供参考，请咨询专业医生。"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
