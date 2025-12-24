"""
应用配置模块

使用 pydantic-settings 管理环境变量和应用配置
"""

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置类"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # 应用基础配置
    app_name: str = Field(default="AI Service", description="应用名称")
    app_version: str = Field(default="0.1.0", description="应用版本")
    debug: bool = Field(default=False, description="调试模式")
    environment: str = Field(default="development", description="运行环境")

    # 服务器配置
    host: str = Field(default="0.0.0.0", description="服务器地址")
    port: int = Field(default=8000, description="服务器端口")

    # CORS 配置
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="允许的跨域来源",
    )
    cors_allow_credentials: bool = Field(default=True, description="允许携带凭证")
    cors_allow_methods: List[str] = Field(default=["*"], description="允许的 HTTP 方法")
    cors_allow_headers: List[str] = Field(default=["*"], description="允许的 HTTP 头")

    # DeepSeek API 配置
    deepseek_api_key: str = Field(default="", description="DeepSeek API Key")
    deepseek_api_base: str = Field(
        default="https://api.deepseek.com/v1", description="DeepSeek API Base URL"
    )
    deepseek_model: str = Field(default="deepseek-chat", description="DeepSeek 模型名称")
    deepseek_temperature: float = Field(default=0.7, description="模型温度参数")
    deepseek_max_tokens: int = Field(default=2000, description="最大 token 数")
    deepseek_timeout: int = Field(default=60, description="API 请求超时时间（秒）")
    deepseek_max_retries: int = Field(default=3, description="API 请求最大重试次数")

    # Qdrant 配置
    qdrant_host: str = Field(default="localhost", description="Qdrant 服务器地址")
    qdrant_port: int = Field(default=6333, description="Qdrant 服务器端口")
    qdrant_grpc_port: int = Field(default=6334, description="Qdrant gRPC 端口")
    qdrant_api_key: str = Field(default="", description="Qdrant API Key")
    qdrant_collection: str = Field(default="health_knowledge", description="Qdrant 集合名称")
    qdrant_use_https: bool = Field(default=False, description="是否使用 HTTPS")

    # RAG 配置
    rag_chunk_size: int = Field(default=1000, description="文档分块大小")
    rag_chunk_overlap: int = Field(default=200, description="分块重叠大小")
    rag_top_k: int = Field(default=5, description="检索返回的 top-k 结果")
    rag_similarity_threshold: float = Field(default=0.7, description="相似度阈值")

    # Embedding 配置
    embedding_model: str = Field(
        default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        description="Embedding 模型名称",
    )
    embedding_dimension: int = Field(default=384, description="向量维度")

    # 日志配置
    log_level: str = Field(default="INFO", description="日志级别")
    log_format: str = Field(
        default="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        description="日志格式",
    )
    log_rotation: str = Field(default="500 MB", description="日志轮转大小")
    log_retention: str = Field(default="10 days", description="日志保留时间")

    # 缓存配置
    redis_host: str = Field(default="localhost", description="Redis 服务器地址")
    redis_port: int = Field(default=6379, description="Redis 服务器端口")
    redis_password: str = Field(default="", description="Redis 密码")
    redis_db: int = Field(default=0, description="Redis 数据库索引")
    redis_cache_ttl: int = Field(default=300, description="缓存过期时间（秒）")

    # 后端服务配置
    backend_api_url: str = Field(default="http://localhost:3000", description="NestJS 后端服务 URL")
    backend_api_timeout: int = Field(default=30, description="后端 API 请求超时时间（秒）")

    # 安全配置
    jwt_secret_key: str = Field(default="", description="JWT 密钥")
    jwt_algorithm: str = Field(default="HS256", description="JWT 算法")

    def is_production(self) -> bool:
        """判断是否为生产环境"""
        return self.environment.lower() == "production"

    def is_development(self) -> bool:
        """判断是否为开发环境"""
        return self.environment.lower() == "development"


@lru_cache()
def get_settings() -> Settings:
    """
    获取应用配置实例（单例模式）

    使用 lru_cache 确保配置只被加载一次
    """
    return Settings()


# 导出配置实例
settings = get_settings()
