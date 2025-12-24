"""
Test Config Module

测试配置模块功能
"""

import os

from app.core.config import Settings, get_settings


def test_settings_default_values():
    """测试配置的默认值"""
    settings = Settings()
    assert settings.app_name == "AI Service"
    assert settings.app_version == "0.1.0"
    assert settings.environment == "development"
    assert settings.host == "0.0.0.0"
    assert settings.port == 8000


def test_settings_environment_override():
    """测试环境变量覆盖配置"""
    os.environ["APP_NAME"] = "Test Service"
    os.environ["PORT"] = "9000"
    settings = Settings()
    assert settings.app_name == "Test Service"
    assert settings.port == 9000
    # 清理环境变量
    os.environ.pop("APP_NAME", None)
    os.environ.pop("PORT", None)


def test_get_settings_singleton():
    """测试配置单例模式"""
    settings1 = get_settings()
    settings2 = get_settings()
    assert settings1 is settings2


def test_is_production():
    """测试生产环境判断"""
    settings = Settings(environment="production")
    assert settings.is_production() is True
    assert settings.is_development() is False


def test_is_development():
    """测试开发环境判断"""
    settings = Settings(environment="development")
    assert settings.is_production() is False
    assert settings.is_development() is True


def test_deepseek_config():
    """测试 DeepSeek 配置"""
    settings = Settings()
    assert settings.deepseek_model == "deepseek-chat"
    assert settings.deepseek_temperature == 0.7
    assert settings.deepseek_max_tokens == 2000
    assert settings.deepseek_max_retries == 3


def test_qdrant_config():
    """测试 Qdrant 配置"""
    settings = Settings()
    assert settings.qdrant_host == "localhost"
    assert settings.qdrant_port == 6333
    assert settings.qdrant_collection == "health_knowledge"


def test_rag_config():
    """测试 RAG 配置"""
    settings = Settings()
    assert settings.rag_chunk_size == 1000
    assert settings.rag_chunk_overlap == 200
    assert settings.rag_top_k == 5
    assert settings.rag_similarity_threshold == 0.7
