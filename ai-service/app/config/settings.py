"""
配置管理模块

配置加载优先级（从低到高）：
1. 代码中的默认值
2. 根目录 .env 文件（全局配置）
3. ai-service/.env 文件（模块配置，覆盖全局）
4. 环境变量（最高优先级）
"""

from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path


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
    deepseek_temperature: float = 0.7
    deepseek_max_tokens: int = 2000

    # Embedding 配置
    embedding_provider: str = "openai"  # openai 或 local
    embedding_api_key: Optional[str] = None  # OpenAI API Key (如使用openai provider)
    embedding_base_url: str = "https://api.openai.com/v1"  # OpenAI API 地址
    embedding_model: str = "text-embedding-ada-002"  # OpenAI 模型
    embedding_local_model: str = (
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"  # 本地模型
    )
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
    log_format: str = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    )
    log_level: str = "INFO"
    log_rotation: str = "10 MB"  # 日志文件轮转大小
    log_retention: str = "7 days"  # 日志保留时间

    # 环境配置
    environment: str = "development"

    # CORS
    # 逗号分隔域名列表，或使用 "*" 表示允许所有来源（建议仅在开发环境使用）
    cors_origins: str = "*"

    class Config:
        # 配置文件加载顺序：先加载根目录.env，再加载ai-service/.env
        # 后面的文件会覆盖前面的配置项
        _base_dir = Path(__file__).parent.parent.parent  # ai-service 目录
        _project_root = _base_dir.parent  # 项目根目录

        env_file = [
            str(_project_root / ".env"),  # 1. 根目录全局配置
            str(_base_dir / ".env"),  # 2. ai-service 模块配置（覆盖）
        ]
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"

    def get_config_files(self) -> list[str]:
        """获取配置文件路径列表"""
        return [
            str(Path(__file__).parent.parent.parent.parent / ".env"),
            str(Path(__file__).parent.parent.parent / ".env"),
        ]

    def print_config_info(self):
        """打印配置加载信息（调试用）"""
        from loguru import logger

        logger.info("=" * 60)
        logger.info("Configuration Loading Info")
        logger.info("=" * 60)

        for i, config_file in enumerate(self.get_config_files(), 1):
            exists = Path(config_file).exists()
            status = "✓ Found" if exists else "✗ Not Found"
            logger.info(f"{i}. {status}: {config_file}")

        logger.info("-" * 60)
        logger.info("Key Configuration Values:")
        logger.info(f"  Environment: {self.environment}")
        logger.info(f"  DeepSeek Base URL: {self.deepseek_base_url}")
        logger.info(f"  DeepSeek API Key: {'*' * 10 if self.deepseek_api_key else 'Not Set'}")
        logger.info(f"  Embedding Provider: {self.embedding_provider}")
        logger.info(f"  Embedding Base URL: {self.embedding_base_url}")
        logger.info(
            f"  Embedding API Key: {'*' * 10 if self.embedding_api_key else 'Not Set (fallback to DeepSeek)'}"
        )
        logger.info(f"  Qdrant URL: {self.qdrant_url}")
        logger.info(f"  Redis Host: {self.redis_host}")
        logger.info(f"  MongoDB URL: {self.mongodb_url[:50]}...")
        logger.info("=" * 60)


settings = Settings()
