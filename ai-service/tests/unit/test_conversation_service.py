"""
Test Conversation Service
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.conversation_service import ConversationService
from app.models import ChatMessage


@pytest.fixture
def conversation_service():
    """对话服务fixture"""
    with patch("app.services.conversation_service.AsyncIOMotorClient"):
        service = ConversationService()
        service.collection = MagicMock()
        return service


@pytest.mark.asyncio
async def test_create_conversation(conversation_service):
    """测试创建对话"""
    conversation_service.collection.insert_one = AsyncMock()

    conversation = await conversation_service.create_conversation("user123")

    assert conversation.user_id == "user123"
    assert len(conversation.messages) == 0
    assert conversation.id is not None
    conversation_service.collection.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_get_conversation(conversation_service):
    """测试获取对话"""
    mock_doc = {
        "id": "conv123",
        "user_id": "user123",
        "messages": [],
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00",
    }
    conversation_service.collection.find_one = AsyncMock(return_value=mock_doc)

    conversation = await conversation_service.get_conversation("conv123")

    assert conversation is not None
    assert conversation.id == "conv123"
    assert conversation.user_id == "user123"


@pytest.mark.asyncio
async def test_add_message(conversation_service):
    """测试添加消息"""
    mock_result = MagicMock()
    mock_result.modified_count = 1
    conversation_service.collection.update_one = AsyncMock(return_value=mock_result)
    conversation_service.get_conversation = AsyncMock(return_value=MagicMock(id="conv123"))

    message = ChatMessage(role="user", content="测试消息")
    result = await conversation_service.add_message("conv123", message)

    assert result is not None
    conversation_service.collection.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_get_user_conversations(conversation_service):
    """测试获取用户对话列表"""
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.skip.return_value = mock_cursor
    mock_cursor.limit.return_value = mock_cursor

    async def mock_async_iter():
        yield {
            "id": "conv1",
            "user_id": "user123",
            "messages": [],
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }

    mock_cursor.__aiter__ = mock_async_iter
    conversation_service.collection.find = MagicMock(return_value=mock_cursor)

    conversations = await conversation_service.get_user_conversations("user123")

    assert len(conversations) > 0
    assert conversations[0].user_id == "user123"
