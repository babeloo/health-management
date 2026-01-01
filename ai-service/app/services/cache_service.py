"""
缓存优化模块

提供装饰器和工具函数来优化常见操作的缓存
"""

import hashlib
import json
from functools import wraps
from typing import Any, Callable, Optional, TypeVar

from loguru import logger

from app.services.redis_service import get_redis_service
from app.services.metrics_service import get_metrics_service

# 类型变量
F = TypeVar("F", bound=Callable[..., Any])


def generate_cache_key(prefix: str, data: Any) -> str:
    """
    生成缓存键

    使用前缀和数据内容的哈希值生成唯一键

    Args:
        prefix: 缓存键前缀（e.g., "rag_answer", "vector_search"）
        data: 用于生成哈希的数据

    Returns:
        str: 缓存键
    """
    if isinstance(data, (dict, list)):
        data_str = json.dumps(data, sort_keys=True, ensure_ascii=False)
    else:
        data_str = str(data)

    data_hash = hashlib.md5(data_str.encode()).hexdigest()
    return f"{prefix}:{data_hash}"


def cache_result(
    ttl: int = 3600,
    cache_type: str = "default",
):
    """
    缓存结果装饰器

    自动缓存异步函数的结果，记录缓存命中/未命中指标

    Args:
        ttl: 缓存过期时间（秒），默认 1 小时
        cache_type: 缓存类型标识（用于指标记录）

    Usage:
        @cache_result(ttl=3600, cache_type="rag_answer")
        async def get_health_advice(question: str) -> str:
            # 实现逻辑
            pass
    """

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            redis = get_redis_service()
            metrics = get_metrics_service()

            # 生成缓存键
            cache_key = generate_cache_key(cache_type, {args, tuple(sorted(kwargs.items()))})

            # 尝试从缓存读取
            cached_value = await redis.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {cache_key}")
                metrics.record_cache_hit(cache_type)
                return cached_value

            # 缓存未命中，执行函数
            logger.debug(f"Cache miss: {cache_key}")
            metrics.record_cache_miss(cache_type)
            result = await func(*args, **kwargs)

            # 存储到缓存
            await redis.set(cache_key, result, ttl=ttl)
            return result

        return wrapper  # type: ignore

    return decorator


class CacheManager:
    """
    缓存管理器

    统一管理不同类型的缓存，提供常见的缓存操作
    """

    # 缓存配置
    CACHE_CONFIG = {
        "rag_answer": {
            "ttl": 3600,  # 1 小时
            "description": "RAG 常见问题的 AI 回答缓存",
        },
        "vector_search": {
            "ttl": 1800,  # 30 分钟
            "description": "向量检索结果缓存",
        },
        "health_advice": {
            "ttl": 86400,  # 24 小时
            "description": "健康建议模板缓存",
        },
        "embedding": {
            "ttl": 604800,  # 7 天
            "description": "文本 embedding 缓存",
        },
        "diagnosis": {
            "ttl": 3600,  # 1 小时
            "description": "诊断建议缓存",
        },
    }

    def __init__(self):
        """初始化缓存管理器"""
        self.redis = get_redis_service()
        self.metrics = get_metrics_service()
        logger.info("Cache manager initialized")

    async def get(self, cache_type: str, key: str) -> Optional[Any]:
        """
        获取缓存值

        Args:
            cache_type: 缓存类型（e.g., "rag_answer", "vector_search"）
            key: 缓存键

        Returns:
            缓存值，不存在返回 None
        """
        cache_key = generate_cache_key(cache_type, key)
        value = await self.redis.get(cache_key)
        if value is not None:
            self.metrics.record_cache_hit(cache_type)
            logger.debug(f"Cache hit for {cache_type}: {cache_key}")
        else:
            self.metrics.record_cache_miss(cache_type)
            logger.debug(f"Cache miss for {cache_type}: {cache_key}")
        return value

    async def set(
        self,
        cache_type: str,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
    ) -> bool:
        """
        设置缓存值

        Args:
            cache_type: 缓存类型
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒），如果为 None 则使用默认配置

        Returns:
            bool: 设置成功返回 True
        """
        if ttl is None:
            ttl = self.CACHE_CONFIG.get(cache_type, {}).get("ttl", 3600)

        cache_key = generate_cache_key(cache_type, key)
        success = await self.redis.set(cache_key, value, ttl=ttl)
        if success:
            logger.debug(f"Cache set for {cache_type}: {cache_key} (TTL: {ttl}s)")
        return success

    async def delete(self, cache_type: str, key: str) -> int:
        """
        删除缓存

        Args:
            cache_type: 缓存类型
            key: 缓存键

        Returns:
            int: 删除的键数量
        """
        cache_key = generate_cache_key(cache_type, key)
        count = await self.redis.delete(cache_key)
        if count > 0:
            logger.debug(f"Cache deleted for {cache_type}: {cache_key}")
        return count

    async def clear_by_prefix(self, prefix: str) -> int:
        """
        根据前缀删除所有缓存

        Args:
            prefix: 缓存键前缀

        Returns:
            int: 删除的键数量
        """
        try:
            # 注意：这是一个简化实现，生产环境应使用 SCAN
            # 为了演示，我们这里先跳过实现
            logger.warning("clear_by_prefix 需要使用 SCAN 命令实现，当前版本跳过")
            return 0
        except Exception as e:
            logger.error(f"Failed to clear cache by prefix {prefix}: {str(e)}")
            return 0

    async def get_cache_stats(self) -> dict:
        """
        获取缓存统计信息

        Returns:
            dict: 缓存统计信息
        """
        return {
            "cache_config": self.CACHE_CONFIG,
            "cache_types": list(self.CACHE_CONFIG.keys()),
        }


# 全局单例
_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """
    获取缓存管理器实例（单例模式）

    Returns:
        CacheManager: 缓存管理器实例
    """
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
    return _cache_manager
