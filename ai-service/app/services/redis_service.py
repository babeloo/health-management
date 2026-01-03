"""
Redis 服务模块

提供 Redis 连接和基本操作的封装
"""

import json
from typing import Any, Optional

import redis.asyncio as redis
from loguru import logger

from app.config import settings


class RedisService:
    """Redis 服务类"""

    def __init__(self):
        """初始化 Redis 连接"""
        self.redis_url = f"redis://{settings.redis_host}:{settings.redis_port}/{settings.redis_db}"
        if settings.redis_password:
            self.redis_url = f"redis://:{settings.redis_password}@{settings.redis_host}:{settings.redis_port}/{settings.redis_db}"

        self.client = None
        logger.info(f"Redis service initialized: {self.redis_url}")

    async def connect(self):
        """连接到 Redis"""
        if self.client is None:
            try:
                self.client = redis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                )
                await self.client.ping()
                logger.info("Redis connection established")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {str(e)}")
                raise

    async def disconnect(self):
        """断开 Redis 连接"""
        if self.client:
            await self.client.close()
            self.client = None
            logger.info("Redis connection closed")

    async def get(self, key: str) -> Optional[Any]:
        """
        获取缓存值

        Args:
            key: 缓存键

        Returns:
            缓存值，不存在返回 None
        """
        if self.client is None:
            await self.connect()

        try:
            value = await self.client.get(key)
            if value is not None:
                # 尝试解析 JSON
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return value
            return None
        except Exception as e:
            logger.error(f"Redis get error for key {key}: {str(e)}")
            return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """
        设置缓存值

        Args:
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒）

        Returns:
            bool: 设置成功返回 True
        """
        if self.client is None:
            await self.connect()

        try:
            # 序列化为 JSON 字符串
            if isinstance(value, (dict, list)):
                value_str = json.dumps(value, ensure_ascii=False)
            else:
                value_str = str(value)

            await self.client.setex(key, ttl, value_str)
            return True
        except Exception as e:
            logger.error(f"Redis set error for key {key}: {str(e)}")
            return False

    async def delete(self, key: str) -> int:
        """
        删除缓存

        Args:
            key: 缓存键

        Returns:
            int: 删除的键数量
        """
        if self.client is None:
            await self.connect()

        try:
            return await self.client.delete(key)
        except Exception as e:
            logger.error(f"Redis delete error for key {key}: {str(e)}")
            return 0

    async def exists(self, key: str) -> bool:
        """
        检查键是否存在

        Args:
            key: 缓存键

        Returns:
            bool: 键是否存在
        """
        if self.client is None:
            await self.connect()

        try:
            return await self.client.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis exists error for key {key}: {str(e)}")
            return False

    async def expire(self, key: str, ttl: int) -> bool:
        """
        设置过期时间

        Args:
            key: 缓存键
            ttl: 过期时间（秒）

        Returns:
            bool: 设置成功返回 True
        """
        if self.client is None:
            await self.connect()

        try:
            return await self.client.expire(key, ttl)
        except Exception as e:
            logger.error(f"Redis expire error for key {key}: {str(e)}")
            return False


# 全局单例
_redis_service: Optional[RedisService] = None


def get_redis_service() -> RedisService:
    """
    获取 Redis 服务实例（单例模式）

    Returns:
        RedisService: Redis 服务实例
    """
    global _redis_service
    if _redis_service is None:
        _redis_service = RedisService()
    return _redis_service
