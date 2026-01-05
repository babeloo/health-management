"""
Education Article Service
"""

from typing import List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from redis import asyncio as aioredis
from app.config import settings
from app.models import Article
import json


class ArticleService:
    """科普文章管理服务"""

    def __init__(self):
        self.mongo_client = AsyncIOMotorClient(settings.mongodb_url)
        self.db = self.mongo_client[settings.mongodb_db_name]
        self.articles_collection = self.db["articles"]
        self.favorites_collection = self.db["favorites"]

        # Redis缓存
        self.redis = aioredis.from_url(
            f"redis://{settings.redis_host}:{settings.redis_port}/{settings.redis_db}",
            password=settings.redis_password,
            decode_responses=True,
        )

    async def get_articles(
        self,
        category: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[List[Article], int]:
        """获取文章列表"""
        query = {}
        if category:
            query["category"] = category

        # 计算总数
        total = await self.articles_collection.count_documents(query)

        # 分页查询
        skip = (page - 1) * page_size
        cursor = (
            self.articles_collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        )

        articles = []
        async for doc in cursor:
            articles.append(Article(**doc))

        return articles, total

    async def get_article(self, article_id: str) -> Optional[Article]:
        """获取文章详情"""
        # 尝试从缓存获取
        cache_key = f"article:{article_id}"
        cached = await self.redis.get(cache_key)
        if cached:
            return Article(**json.loads(cached))

        # 从数据库获取
        doc = await self.articles_collection.find_one({"id": article_id})
        if doc:
            article = Article(**doc)

            # 增加浏览量
            await self.articles_collection.update_one({"id": article_id}, {"$inc": {"views": 1}})
            article.views += 1

            # 缓存
            await self.redis.setex(cache_key, settings.redis_cache_ttl, article.model_dump_json())

            return article

        return None

    async def add_favorite(self, user_id: str, article_id: str) -> bool:
        """收藏文章"""
        result = await self.favorites_collection.update_one(
            {"user_id": user_id, "article_id": article_id},
            {"$set": {"created_at": datetime.now()}},
            upsert=True,
        )
        return result.upserted_id is not None or result.modified_count > 0

    async def remove_favorite(self, user_id: str, article_id: str) -> bool:
        """取消收藏"""
        result = await self.favorites_collection.delete_one(
            {"user_id": user_id, "article_id": article_id}
        )
        return result.deleted_count > 0

    async def get_user_favorites(
        self, user_id: str, page: int = 1, page_size: int = 20
    ) -> tuple[List[Article], int]:
        """获取用户收藏的文章"""
        # 获取收藏的文章ID
        skip = (page - 1) * page_size
        cursor = (
            self.favorites_collection.find({"user_id": user_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(page_size)
        )

        article_ids = []
        async for doc in cursor:
            article_ids.append(doc["article_id"])

        # 获取文章详情
        articles = []
        if article_ids:
            cursor = self.articles_collection.find({"id": {"$in": article_ids}})
            async for doc in cursor:
                articles.append(Article(**doc))

        # 计算总数
        total = await self.favorites_collection.count_documents({"user_id": user_id})

        return articles, total


# 全局实例
article_service = ArticleService()
