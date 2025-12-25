"""
测试配置文件

提供测试所需的 fixtures 和配置
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_redis_service():
    """Mock Redis 服务"""
    mock = AsyncMock()
    mock.ping.return_value = True
    mock.set.return_value = True
    mock.get.return_value = None
    mock.delete.return_value = 1
    mock.exists.return_value = False
    return mock


@pytest.fixture
def mock_deepseek_client():
    """Mock DeepSeek 客户端"""
    mock = AsyncMock()
    mock.chat.return_value = {
        "content": "测试回复。此建议仅供参考，请咨询专业医生。",
        "finish_reason": "stop",
        "usage": {
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150,
        },
        "model": "deepseek-chat",
    }
    return mock


@pytest.fixture
def mock_rag_service():
    """Mock RAG 服务"""
    mock = AsyncMock()
    mock.search.return_value = [
        {
            "id": "test-1",
            "score": 0.9,
            "content": "测试内容",
            "metadata": {"title": "测试文档"},
        }
    ]
    mock.generate_answer.return_value = {
        "answer": "这是测试答案。此建议仅供参考，请咨询专业医生。",
        "sources": [],
        "has_context": True,
    }
    return mock


@pytest.fixture
def sample_conversation_session():
    """示例会话数据"""
    return {
        "session_id": "test-session-123",
        "user_id": "user-001",
        "state": "waiting_input",
        "messages": [],
        "context": {},
        "created_at": "2025-01-01T00:00:00",
        "updated_at": "2025-01-01T00:00:00",
    }


@pytest.fixture
def sample_chat_request():
    """示例对话请求"""
    return {
        "message": "今天血压 130/80",
        "session_id": "test-session-123",
        "user_id": "user-001",
    }


@pytest.fixture
def sample_checkin_blood_pressure():
    """示例血压打卡数据"""
    return {
        "checkin_type": "blood_pressure",
        "data": {
            "systolic": 130,
            "diastolic": 80,
            "heart_rate": None,
            "unit": "mmHg",
        },
        "notes": None,
        "timestamp": "2025-01-01T10:00:00",
    }


@pytest.fixture
def sample_checkin_blood_sugar():
    """示例血糖打卡数据"""
    return {
        "checkin_type": "blood_sugar",
        "data": {
            "value": 5.6,
            "timing": "fasting",
            "unit": "mmol/L",
        },
        "notes": None,
        "timestamp": "2025-01-01T08:00:00",
    }
