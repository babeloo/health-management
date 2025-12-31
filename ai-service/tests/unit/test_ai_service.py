"""
Test AI Service
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.ai_service import AIService
from app.models import ChatMessage


@pytest.fixture
def ai_service():
    """AI服务fixture"""
    with patch("app.services.ai_service.AsyncOpenAI"):
        service = AIService()
        return service


@pytest.mark.asyncio
async def test_get_embedding(ai_service):
    """测试获取文本向量"""
    # Mock OpenAI response
    mock_response = MagicMock()
    mock_response.data = [MagicMock(embedding=[0.1, 0.2, 0.3])]
    ai_service.client.embeddings.create = AsyncMock(return_value=mock_response)

    result = await ai_service.get_embedding("测试文本")

    assert result == [0.1, 0.2, 0.3]
    ai_service.client.embeddings.create.assert_called_once()


@pytest.mark.asyncio
async def test_chat_without_rag(ai_service):
    """测试不使用RAG的对话"""
    # Mock OpenAI response
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content="这是AI的回复"))
    ]
    ai_service.client.chat.completions.create = AsyncMock(return_value=mock_response)

    messages = [ChatMessage(role="user", content="你好")]
    reply, sources = await ai_service.chat(messages, use_rag=False)

    assert "这是AI的回复" in reply
    assert ai_service.disclaimer in reply
    assert sources is None


@pytest.mark.asyncio
async def test_chat_with_rag(ai_service):
    """测试使用RAG的对话"""
    # Mock embedding
    ai_service.get_embedding = AsyncMock(return_value=[0.1] * 1536)

    # Mock RAG search
    with patch("app.services.ai_service.rag_service") as mock_rag:
        mock_rag.search = AsyncMock(
            return_value=[{"content": "健康知识", "score": 0.9}]
        )

        # Mock OpenAI response
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content="基于知识库的回复"))
        ]
        ai_service.client.chat.completions.create = AsyncMock(
            return_value=mock_response
        )

        messages = [ChatMessage(role="user", content="高血压怎么办")]
        reply, sources = await ai_service.chat(messages, use_rag=True)

        assert "基于知识库的回复" in reply
        assert ai_service.disclaimer in reply
        assert sources is not None
        assert len(sources) > 0


@pytest.mark.asyncio
async def test_chat_adds_disclaimer(ai_service):
    """测试确保回复包含免责声明"""
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content="没有免责声明的回复"))
    ]
    ai_service.client.chat.completions.create = AsyncMock(return_value=mock_response)

    messages = [ChatMessage(role="user", content="测试")]
    reply, _ = await ai_service.chat(messages, use_rag=False)

    assert ai_service.disclaimer in reply
