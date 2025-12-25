"""
Agent API 端点测试
"""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestAgentAPI:
    """测试 Agent API 端点"""

    @patch("app.api.v1.agent.agent_service")
    def test_chat_endpoint(self, mock_agent_service):
        """测试对话端点"""
        # Mock agent service
        mock_agent_service.chat = AsyncMock(
            return_value={
                "session_id": "test-session-123",
                "reply": "您好！我是健康管理助手。",
                "intent": "greeting",
                "confidence": 0.9,
                "data": None,
            }
        )

        # 发送请求
        response = client.post(
            "/api/v1/agent/chat",
            json={
                "message": "你好",
                "session_id": "test-session-123",
                "user_id": "user-001",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == "test-session-123"
        assert "reply" in data
        assert data["intent"] == "greeting"

    @patch("app.api.v1.agent.agent_service")
    def test_chat_endpoint_checkin(self, mock_agent_service):
        """测试对话端点 - 打卡场景"""
        # Mock agent service
        mock_agent_service.chat = AsyncMock(
            return_value={
                "session_id": "test-session-456",
                "reply": "✅ 血压打卡成功！",
                "intent": "checkin_blood_pressure",
                "confidence": 0.95,
                "data": {
                    "checkin_type": "blood_pressure",
                    "data": {
                        "systolic": 130,
                        "diastolic": 80,
                        "unit": "mmHg",
                    },
                },
            }
        )

        # 发送请求
        response = client.post(
            "/api/v1/agent/chat",
            json={
                "message": "今天血压 130/80",
                "user_id": "user-001",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "✅" in data["reply"]
        assert data["intent"] == "checkin_blood_pressure"
        assert data["data"] is not None

    @patch("app.api.v1.agent.conversation_service")
    def test_get_session_info(self, mock_conversation_service):
        """测试获取会话信息"""
        from app.services.conversation_service import ConversationSession, ConversationState

        # Mock conversation service
        mock_session = ConversationSession(
            session_id="test-session-123",
            user_id="user-001",
            state=ConversationState.WAITING_INPUT,
            messages=[],
        )
        mock_conversation_service.get_session = AsyncMock(return_value=mock_session)

        # 发送请求
        response = client.get("/api/v1/agent/sessions/test-session-123")

        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == "test-session-123"
        assert data["user_id"] == "user-001"
        assert data["message_count"] == 0

    @patch("app.api.v1.agent.conversation_service")
    def test_get_session_not_found(self, mock_conversation_service):
        """测试获取不存在的会话"""
        # Mock conversation service
        mock_conversation_service.get_session = AsyncMock(return_value=None)

        # 发送请求
        response = client.get("/api/v1/agent/sessions/non-existent")

        assert response.status_code == 404

    @patch("app.api.v1.agent.conversation_service")
    def test_clear_session(self, mock_conversation_service):
        """测试清空会话"""
        # Mock conversation service
        mock_conversation_service.clear_messages = AsyncMock(return_value=True)

        # 发送请求
        response = client.delete("/api/v1/agent/sessions/test-session-123")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "会话已清空"

    @patch("app.api.v1.agent.conversation_service")
    def test_delete_session(self, mock_conversation_service):
        """测试删除会话"""
        # Mock conversation service
        mock_conversation_service.delete_session = AsyncMock(return_value=True)

        # 发送请求
        response = client.delete("/api/v1/agent/sessions/test-session-123/delete")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "会话已删除"

    @patch("app.api.v1.agent.agent_service")
    def test_natural_language_checkin(self, mock_agent_service):
        """测试自然语言打卡"""
        # Mock agent service
        mock_agent_service.chat = AsyncMock(
            return_value={
                "session_id": "test-session",
                "reply": "✅ 血压打卡成功！",
                "intent": "checkin_blood_pressure",
                "confidence": 0.95,
                "data": {
                    "checkin_type": "blood_pressure",
                    "data": {"systolic": 130, "diastolic": 80},
                },
            }
        )

        # 发送请求
        response = client.post(
            "/api/v1/agent/checkin",
            json={
                "message": "血压 130/80",
                "user_id": "user-001",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["checkin_type"] == "blood_pressure"
        assert data["data"] is not None

    @patch("app.api.v1.agent.get_redis_service")
    def test_health_check(self, mock_get_redis):
        """测试健康检查"""
        # Mock Redis service
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(return_value=True)
        mock_get_redis.return_value = mock_redis

        # 发送请求
        response = client.get("/api/v1/agent/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestAgentAPIValidation:
    """测试 API 输入验证"""

    def test_chat_missing_message(self):
        """测试缺少必需字段"""
        response = client.post("/api/v1/agent/chat", json={})

        assert response.status_code == 422  # Validation error

    def test_chat_empty_message(self):
        """测试空消息"""
        response = client.post("/api/v1/agent/chat", json={"message": ""})

        assert response.status_code == 422

    def test_chat_message_too_long(self):
        """测试消息过长"""
        response = client.post(
            "/api/v1/agent/chat",
            json={"message": "x" * 1001},  # 超过 1000 字符限制
        )

        assert response.status_code == 422

    def test_checkin_missing_user_id(self):
        """测试打卡缺少用户 ID"""
        response = client.post(
            "/api/v1/agent/checkin",
            json={"message": "血压 130/80"},
        )

        assert response.status_code == 422
