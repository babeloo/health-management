"""
意图识别服务测试
"""

import pytest
from unittest.mock import patch, AsyncMock

from app.services.intent_service import (
    IntentRecognitionService,
    IntentType,
    IntentResult,
)


@pytest.mark.asyncio
class TestIntentRecognitionService:
    """测试意图识别服务"""

    def setup_method(self):
        """测试前准备"""
        self.service = IntentRecognitionService()

    async def test_recognize_blood_pressure_checkin_by_rule(self):
        """测试规则识别 - 血压打卡"""
        text = "今天血压 130/80"
        result = await self.service.recognize(text)

        assert result.intent == IntentType.CHECKIN_BLOOD_PRESSURE
        assert result.confidence >= 0.8
        assert "systolic" in result.entities
        assert "diastolic" in result.entities
        assert result.entities["systolic"] == 130
        assert result.entities["diastolic"] == 80

    async def test_recognize_blood_sugar_checkin_by_rule(self):
        """测试规则识别 - 血糖打卡"""
        text = "空腹血糖 5.6"
        result = await self.service.recognize(text)

        assert result.intent == IntentType.CHECKIN_BLOOD_SUGAR
        assert result.confidence >= 0.8
        assert "value" in result.entities
        assert result.entities["value"] == 5.6

    async def test_recognize_medication_checkin_by_rule(self):
        """测试规则识别 - 用药打卡"""
        text = "今天已经吃药了"
        result = await self.service.recognize(text)

        assert result.intent == IntentType.CHECKIN_MEDICATION
        assert result.confidence >= 0.8

    async def test_recognize_exercise_checkin_by_rule(self):
        """测试规则识别 - 运动打卡"""
        text = "今天跑步 30 分钟"
        result = await self.service.recognize(text)

        assert result.intent == IntentType.CHECKIN_EXERCISE
        assert result.confidence >= 0.8
        assert "duration" in result.entities
        assert result.entities["duration"] == 30

    async def test_recognize_greeting_by_rule(self):
        """测试规则识别 - 问候"""
        text = "你好"
        result = await self.service.recognize(text)

        assert result.intent == IntentType.GREETING
        assert result.confidence >= 0.8

    @patch("app.services.intent_service.get_deepseek_client")
    async def test_recognize_by_llm(self, mock_get_client):
        """测试 LLM 识别"""
        # Mock DeepSeek 客户端
        mock_client = AsyncMock()
        mock_client.chat.return_value = {
            "content": '{"intent": "health_consult", "confidence": 0.9, "entities": {}}',
            "finish_reason": "stop",
        }
        mock_get_client.return_value = mock_client

        text = "高血压应该注意什么"
        result = await self.service.recognize(text)

        assert result.intent == IntentType.HEALTH_CONSULT
        assert result.confidence == 0.9

    async def test_is_checkin_intent(self):
        """测试是否为打卡意图"""
        assert self.service.is_checkin_intent(IntentType.CHECKIN_BLOOD_PRESSURE)
        assert self.service.is_checkin_intent(IntentType.CHECKIN_BLOOD_SUGAR)
        assert self.service.is_checkin_intent(IntentType.CHECKIN_MEDICATION)
        assert not self.service.is_checkin_intent(IntentType.HEALTH_CONSULT)
        assert not self.service.is_checkin_intent(IntentType.GREETING)

    async def test_get_checkin_type(self):
        """测试获取打卡类型"""
        assert (
            self.service.get_checkin_type(IntentType.CHECKIN_BLOOD_PRESSURE)
            == "blood_pressure"
        )
        assert (
            self.service.get_checkin_type(IntentType.CHECKIN_BLOOD_SUGAR)
            == "blood_sugar"
        )
        assert (
            self.service.get_checkin_type(IntentType.CHECKIN_MEDICATION) == "medication"
        )
        assert self.service.get_checkin_type(IntentType.HEALTH_CONSULT) is None
