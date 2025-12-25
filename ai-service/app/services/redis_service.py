"""
Redis 服务模块

提供 Redis 客户端封装和缓存功能
"""

import json
from typing import Any, Dict, List, Optional

import redis.asyncio as redis
from loguru import logger

from app.core.config import settings


class RedisService:
    """
    Redis 服务类

    提供异步 Redis 操作，用于对话上下文管理和缓存
    """

    def __init__(self):
        """初始化 Redis 客户端"""
        self.client: Optional[redis.Redis] = None
        self._connect()

    def _connect(self):
        """建立 Redis 连接"""
        try:
            self.client = redis.Redis(
                host=settings.redis_host,
                port=settings.redis_port,
                password=settings.redis_password if settings.redis_password else None,
                db=settings.redis_db,
                decode_responses=True,  # 自动解码为字符串
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            logger.info(
                f"Redis client initialized: {settings.redis_host}:{settings.redis_port}/{settings.redis_db}"
            )
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise

    async def ping(self) -> bool:
        """
        检查 Redis 连接

        Returns:
            bool: 连接正常返回 True
        """
        try:
            await self.client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis ping failed: {str(e)}")
            return False

    async def set(
        self, key: str, value: Any, ttl: Optional[int] = None
    ) -> bool:
        """
        设置键值

        Args:
            key: 键名
            value: 值（自动序列化为 JSON）
            ttl: 过期时间（秒），None 表示永不过期

        Returns:
            bool: 设置成功返回 True
        """
        try:
            serialized_value = json.dumps(value, ensure_ascii=False)
            if ttl:
                await self.client.setex(key, ttl, serialized_value)
            else:
                await self.client.set(key, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Redis set failed: key={key}, error={str(e)}")
            return False

    async def get(self, key: str) -> Optional[Any]:
        """
        获取键值

        Args:
            key: 键名

        Returns:
            值（自动反序列化 JSON），不存在返回 None
        """
        try:
            value = await self.client.get(key)
            if value is None:
                return None
            return json.loads(value)
        except Exception as e:
            logger.error(f"Redis get failed: key={key}, error={str(e)}")
            return None

    async def delete(self, *keys: str) -> int:
        """
        删除键

        Args:
            *keys: 键名列表

        Returns:
            int: 删除的键数量
        """
        try:
            count = await self.client.delete(*keys)
            return count
        except Exception as e:
            logger.error(f"Redis delete failed: keys={keys}, error={str(e)}")
            return 0

    async def exists(self, key: str) -> bool:
        """
        检查键是否存在

        Args:
            key: 键名

        Returns:
            bool: 存在返回 True
        """
        try:
            return await self.client.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis exists failed: key={key}, error={str(e)}")
            return False

    async def expire(self, key: str, ttl: int) -> bool:
        """
        设置键过期时间

        Args:
            key: 键名
            ttl: 过期时间（秒）

        Returns:
            bool: 设置成功返回 True
        """
        try:
            return await self.client.expire(key, ttl)
        except Exception as e:
            logger.error(f"Redis expire failed: key={key}, error={str(e)}")
            return False

    async def ttl(self, key: str) -> int:
        """
        获取键剩余过期时间

        Args:
            key: 键名

        Returns:
            int: 剩余秒数，-1 表示永不过期，-2 表示不存在
        """
        try:
            return await self.client.ttl(key)
        except Exception as e:
            logger.error(f"Redis ttl failed: key={key}, error={str(e)}")
            return -2

    async def lpush(self, key: str, *values: Any) -> int:
        """
        从列表左侧推入元素

        Args:
            key: 键名
            *values: 值列表（自动序列化为 JSON）

        Returns:
            int: 列表长度
        """
        try:
            serialized_values = [json.dumps(v, ensure_ascii=False) for v in values]
            length = await self.client.lpush(key, *serialized_values)
            return length
        except Exception as e:
            logger.error(f"Redis lpush failed: key={key}, error={str(e)}")
            return 0

    async def rpush(self, key: str, *values: Any) -> int:
        """
        从列表右侧推入元素

        Args:
            key: 键名
            *values: 值列表（自动序列化为 JSON）

        Returns:
            int: 列表长度
        """
        try:
            serialized_values = [json.dumps(v, ensure_ascii=False) for v in values]
            length = await self.client.rpush(key, *serialized_values)
            return length
        except Exception as e:
            logger.error(f"Redis rpush failed: key={key}, error={str(e)}")
            return 0

    async def lrange(self, key: str, start: int, end: int) -> List[Any]:
        """
        获取列表指定范围的元素

        Args:
            key: 键名
            start: 起始索引
            end: 结束索引（-1 表示到列表末尾）

        Returns:
            List[Any]: 元素列表（自动反序列化 JSON）
        """
        try:
            values = await self.client.lrange(key, start, end)
            return [json.loads(v) for v in values]
        except Exception as e:
            logger.error(f"Redis lrange failed: key={key}, error={str(e)}")
            return []

    async def llen(self, key: str) -> int:
        """
        获取列表长度

        Args:
            key: 键名

        Returns:
            int: 列表长度
        """
        try:
            return await self.client.llen(key)
        except Exception as e:
            logger.error(f"Redis llen failed: key={key}, error={str(e)}")
            return 0

    async def ltrim(self, key: str, start: int, end: int) -> bool:
        """
        修剪列表，只保留指定范围的元素

        Args:
            key: 键名
            start: 起始索引
            end: 结束索引

        Returns:
            bool: 操作成功返回 True
        """
        try:
            await self.client.ltrim(key, start, end)
            return True
        except Exception as e:
            logger.error(f"Redis ltrim failed: key={key}, error={str(e)}")
            return False

    async def close(self):
        """关闭 Redis 连接"""
        if self.client:
            await self.client.close()
            logger.info("Redis client closed")


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
