"""
Test API Routers
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from app.main import app
from app.models import Conversation, ChatMessage, Article

client = TestClient(app)


@pytest.fixture
def mock_services():
    """Mock所有服务"""
    with (
        patch("app.routers.ai_router.ai_service") as mock_ai,
        patch("app.routers.ai_router.conversation_service") as mock_conv,
        patch("app.routers.education_router.article_service") as mock_article,
    ):
        yield mock_ai, mock_conv, mock_article


def test_health_check():
    """测试健康检查端点"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_endpoint(mock_services):
    """测试AI对话端点"""
    mock_ai, mock_conv, _ = mock_services

    # Mock conversation service
    mock_conversation = Conversation(
        id="conv123",
        user_id="user123",
        messages=[],
        created_at="2024-01-01T00:00:00",
        updated_at="2024-01-01T00:00:00",
    )
    mock_conv.create_conversation = AsyncMock(return_value=mock_conversation)
    mock_conv.add_message = AsyncMock(return_value=mock_conversation)

    # Mock AI service
    mock_ai.chat = AsyncMock(return_value=("AI回复。此建议仅供参考，请咨询专业医生。", None))

    response = client.post(
        "/api/v1/ai/chat",
        json={"user_id": "user123", "message": "你好", "use_rag": True},
    )

    assert response.status_code == 200
    data = response.json()
    assert "conversation_id" in data
    assert "此建议仅供参考" in data["message"]


def test_get_conversations_endpoint(mock_services):
    """测试获取对话历史端点"""
    _, mock_conv, _ = mock_services

    mock_conversations = [
        Conversation(
            id="conv1",
            user_id="user123",
            messages=[],
            created_at="2024-01-01T00:00:00",
            updated_at="2024-01-01T00:00:00",
        )
    ]
    mock_conv.get_user_conversations = AsyncMock(return_value=mock_conversations)

    response = client.get("/api/v1/ai/conversations/user123")

    assert response.status_code == 200
    data = response.json()
    assert "conversations" in data
    assert len(data["conversations"]) > 0


def test_get_articles_endpoint(mock_services):
    """测试获取文章列表端点"""
    _, _, mock_article = mock_services

    mock_articles = [
        Article(
            id="article1",
            title="测试文章",
            content="内容",
            category="健康",
            tags=[],
            author="作者",
            views=0,
            created_at="2024-01-01T00:00:00",
        )
    ]
    mock_article.get_articles = AsyncMock(return_value=(mock_articles, 1))

    response = client.get("/api/v1/education/articles")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) > 0


def test_get_article_detail_endpoint(mock_services):
    """测试获取文章详情端点"""
    _, _, mock_article = mock_services

    mock_article_obj = Article(
        id="article1",
        title="测试文章",
        content="详细内容",
        category="健康",
        tags=["高血压"],
        author="作者",
        views=10,
        created_at="2024-01-01T00:00:00",
    )
    mock_article.get_article = AsyncMock(return_value=mock_article_obj)

    response = client.get("/api/v1/education/articles/article1")

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "测试文章"
    assert data["views"] == 10


def test_favorite_article_endpoint(mock_services):
    """测试收藏文章端点"""
    _, _, mock_article = mock_services

    mock_article.add_favorite = AsyncMock(return_value=True)

    response = client.post(
        "/api/v1/education/articles/article1/favorite",
        json={"user_id": "user123", "article_id": "article1"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


def test_unfavorite_article_endpoint(mock_services):
    """测试取消收藏端点"""
    _, _, mock_article = mock_services

    mock_article.remove_favorite = AsyncMock(return_value=True)

    response = client.delete("/api/v1/education/articles/article1/favorite?user_id=user123")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
