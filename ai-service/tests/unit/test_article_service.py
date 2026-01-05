"""
Test Article Service
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.article_service import ArticleService


@pytest.fixture
def article_service():
    """文章服务fixture"""
    with (
        patch("app.services.article_service.AsyncIOMotorClient"),
        patch("app.services.article_service.aioredis"),
    ):
        service = ArticleService()
        service.articles_collection = MagicMock()
        service.favorites_collection = MagicMock()
        service.redis = MagicMock()
        service.redis.get = AsyncMock(return_value=None)
        service.redis.setex = AsyncMock()
        return service


@pytest.mark.asyncio
async def test_get_articles(article_service):
    """测试获取文章列表"""
    article_service.articles_collection.count_documents = AsyncMock(return_value=10)

    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.skip.return_value = mock_cursor
    mock_cursor.limit.return_value = mock_cursor

    async def mock_async_iter(self):
        yield {
            "id": "article1",
            "title": "测试文章",
            "content": "内容",
            "category": "健康",
            "tags": [],
            "author": "作者",
            "views": 0,
            "created_at": "2024-01-01T00:00:00",
        }

    mock_cursor.__aiter__ = lambda self: mock_async_iter(self)
    article_service.articles_collection.find = MagicMock(return_value=mock_cursor)

    articles, total = await article_service.get_articles(page=1, page_size=20)

    assert total == 10
    assert len(articles) > 0
    assert articles[0].title == "测试文章"


@pytest.mark.asyncio
async def test_get_article(article_service):
    """测试获取文章详情"""
    mock_doc = {
        "id": "article1",
        "title": "测试文章",
        "content": "内容",
        "category": "健康",
        "tags": [],
        "author": "作者",
        "views": 10,
        "created_at": "2024-01-01T00:00:00",
    }
    article_service.articles_collection.find_one = AsyncMock(return_value=mock_doc)
    article_service.articles_collection.update_one = AsyncMock()

    article = await article_service.get_article("article1")

    assert article is not None
    assert article.title == "测试文章"
    assert article.views == 11  # 浏览量+1
    article_service.articles_collection.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_add_favorite(article_service):
    """测试收藏文章"""
    mock_result = MagicMock()
    mock_result.upserted_id = "fav123"
    mock_result.modified_count = 0
    article_service.favorites_collection.update_one = AsyncMock(return_value=mock_result)

    success = await article_service.add_favorite("user123", "article1")

    assert success is True
    article_service.favorites_collection.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_remove_favorite(article_service):
    """测试取消收藏"""
    mock_result = MagicMock()
    mock_result.deleted_count = 1
    article_service.favorites_collection.delete_one = AsyncMock(return_value=mock_result)

    success = await article_service.remove_favorite("user123", "article1")

    assert success is True
    article_service.favorites_collection.delete_one.assert_called_once()


@pytest.mark.asyncio
async def test_get_user_favorites(article_service):
    """测试获取用户收藏列表"""
    # Mock favorites cursor
    mock_fav_cursor = MagicMock()
    mock_fav_cursor.sort.return_value = mock_fav_cursor
    mock_fav_cursor.skip.return_value = mock_fav_cursor
    mock_fav_cursor.limit.return_value = mock_fav_cursor

    async def mock_fav_iter(self):
        yield {"user_id": "user123", "article_id": "article1"}

    mock_fav_cursor.__aiter__ = lambda self: mock_fav_iter(self)
    article_service.favorites_collection.find = MagicMock(return_value=mock_fav_cursor)

    # Mock articles cursor
    mock_article_cursor = MagicMock()

    async def mock_article_iter(self):
        yield {
            "id": "article1",
            "title": "收藏的文章",
            "content": "内容",
            "category": "健康",
            "tags": [],
            "author": "作者",
            "views": 0,
            "created_at": "2024-01-01T00:00:00",
        }

    mock_article_cursor.__aiter__ = lambda self: mock_article_iter(self)
    article_service.articles_collection.find = MagicMock(return_value=mock_article_cursor)

    article_service.favorites_collection.count_documents = AsyncMock(return_value=1)

    articles, total = await article_service.get_user_favorites("user123")

    assert total == 1
    assert len(articles) > 0
    assert articles[0].title == "收藏的文章"
