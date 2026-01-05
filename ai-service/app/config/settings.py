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
    deepseek_api_base: str = "https://api.deepseek.com/v1"
    deepseek_timeout: int = 60
    deepseek_max_retries: int = 3
    deepseek_model: str = "deepseek-chat"
    deepseek_temperature: float = 0.7
    deepseek_max_tokens: int = 2000

    # Embedding 配置
    embedding_provider: str = "openai"  # openai 或 local
    embedding_model: str = "text-embedding-ada-002"  # OpenAI 模型
    embedding_local_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"  # 本地模型
    embedding_dimension: int = 1536  # text-embedding-ada-002 的维度
    embedding_cache_enabled: bool = True

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

    # 日志配置
    log_format: str = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    log_level: str = "INFO"
    log_rotation: str = "10 MB"  # 日志文件轮转大小
    log_retention: str = "7 days"  # 日志保留时间

    # 环境配置
    environment: str = "development"

    # CORS
    # 逗号分隔域名列表，或使用 "*" 表示允许所有来源（建议仅在开发环境使用）
    cors_origins: str = "*"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
