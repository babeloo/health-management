"""
AI 服务单元测试
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.ai_service import AIService, AIServiceError
from app.services.deepseek_client import DeepSeekAPIError


class TestAIService:
    """AI 服务测试类"""

    @pytest.fixture
    def service(self):
        """创建测试服务"""
        return AIService()

    @pytest.fixture
    def mock_deepseek_response(self):
        """模拟 DeepSeek 响应"""
        return {
            "content": "这是测试响应",
            "finish_reason": "stop",
            "usage": {
                "prompt_tokens": 50,
                "completion_tokens": 100,
                "total_tokens": 150
            }
        }

    @pytest.mark.asyncio
    async def test_chat_success(self, service, mock_deepseek_response):
        """测试成功的对话"""
        with patch.object(
            service.deepseek_client,
            "chat",
            new=AsyncMock(return_value=mock_deepseek_response)
        ):
            response = await service.chat("你好")

            assert "这是测试响应" in response["content"]
            assert "仅供参考" in response["content"] or "此建议" in response["content"]
            assert response["usage"]["total_tokens"] == 150

    @pytest.mark.asyncio
    async def test_chat_with_history(self, service, mock_deepseek_response):
        """测试带对话历史的对话"""
        history = [
            {"role": "user", "content": "你好"},
            {"role": "assistant", "content": "你好！有什么可以帮助你的？"}
        ]

        with patch.object(
            service.deepseek_client,
            "chat",
            new=AsyncMock(return_value=mock_deepseek_response)
        ) as mock_chat:
            await service.chat("高血压应该注意什么？", conversation_history=history)

            # 验证调用参数包含历史记录
            call_args = mock_chat.call_args
            messages = call_args.kwargs["messages"]
            assert len(messages) >= 3  # system + history + current

    @pytest.mark.asyncio
    async def test_chat_stream(self, service):
        """测试流式对话"""
        async def mock_stream():
            chunks = ["你", "好", "！"]
            for chunk in chunks:
                yield chunk

        with patch.object(
            service.deepseek_client,
            "chat_stream",
            new=AsyncMock(return_value=mock_stream())
        ):
            result = []
            async for chunk in service.chat_stream("你好"):
                result.append(chunk)

            assert "你好！" in "".join(result)

    @pytest.mark.asyncio
    async def test_chat_api_error(self, service):
        """测试 API 错误处理"""
        with patch.object(
            service.deepseek_client,
            "chat",
            new=AsyncMock(side_effect=DeepSeekAPIError("API 错误"))
        ):
            with pytest.raises(AIServiceError) as exc_info:
                await service.chat("你好")

            assert "对话失败" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_generate_health_advice(self, service, mock_deepseek_response):
        """测试生成健康建议"""
        health_data = {
            "age": 45,
            "diseases": ["高血压"],
            "recent_check_ins": {
                "blood_pressure": 5,
                "medication": 7
            },
            "average_bp": {
                "systolic": 145,
                "diastolic": 90
            }
        }

        with patch.object(
            service.deepseek_client,
            "chat",
            new=AsyncMock(return_value=mock_deepseek_response)
        ):
            response = await service.generate_health_advice(health_data)

            assert "advice" in response
            assert "仅供参考" in response["advice"] or "此建议" in response["advice"]
            assert response["usage"]["total_tokens"] == 150

    @pytest.mark.asyncio
    async def test_analyze_symptoms(self, service, mock_deepseek_response):
        """测试症状分析"""
        symptoms = "头晕、头痛"
        patient_data = {
            "age": 50,
            "gender": "male",
            "diseases": ["高血压"],
            "recent_data": {
                "blood_pressure": {
                    "systolic": 160,
                    "diastolic": 95
                }
            }
        }

        with patch.object(
            service.deepseek_client,
            "chat",
            new=AsyncMock(return_value=mock_deepseek_response)
        ):
            response = await service.analyze_symptoms(symptoms, patient_data)

            assert "analysis" in response
            assert "仅供参考" in response["analysis"]

    @pytest.mark.asyncio
    async def test_generate_medication_guide(self, service, mock_deepseek_response):
        """测试生成用药指导"""
        medication = "硝苯地平缓释片"
        patient_info = {
            "age": 60,
            "diseases": ["高血压"]
        }

        with patch.object(
            service.deepseek_client,
            "chat",
            new=AsyncMock(return_value=mock_deepseek_response)
        ):
            response = await service.generate_medication_guide(medication, patient_info)

            assert "guide" in response
            assert "仅供参考" in response["guide"]

    @pytest.mark.asyncio
    async def test_generate_health_education(self, service, mock_deepseek_response):
        """测试生成健康科普"""
        topic = "高血压饮食注意事项"
        context = {
            "age": 45,
            "diseases": ["高血压"]
        }

        with patch.object(
            service.deepseek_client,
            "chat",
            new=AsyncMock(return_value=mock_deepseek_response)
        ):
            response = await service.generate_health_education(topic, context)

            assert "content" in response
            assert "仅供参考" in response["content"]

    @pytest.mark.asyncio
    async def test_assess_risk(self, service, mock_deepseek_response):
        """测试风险评估"""
        health_data = {
            "age": 50,
            "gender": "male",
            "bmi": 28.5,
            "diseases": ["高血压"],
            "health_metrics": {
                "blood_pressure": {
                    "systolic": 150,
                    "diastolic": 95
                }
            }
        }

        with patch.object(
            service.deepseek_client,
            "chat",
            new=AsyncMock(return_value=mock_deepseek_response)
        ):
            response = await service.assess_risk(health_data)

            assert "assessment" in response
            assert "仅供参考" in response["assessment"]

    def test_get_usage_stats(self, service):
        """测试获取使用统计"""
        mock_stats = {
            "prompt_tokens": 1000,
            "completion_tokens": 2000,
            "total_tokens": 3000,
            "requests": 10
        }

        with patch.object(
            service.deepseek_client,
            "get_usage_stats",
            return_value=mock_stats
        ):
            stats = service.get_usage_stats()

            assert stats == mock_stats

    def test_reset_usage_stats(self, service):
        """测试重置使用统计"""
        with patch.object(
            service.deepseek_client,
            "reset_usage_stats"
        ) as mock_reset:
            service.reset_usage_stats()

            mock_reset.assert_called_once()

    def test_singleton_pattern(self):
        """测试单例模式"""
        from app.services.ai_service import get_ai_service

        service1 = get_ai_service()
        service2 = get_ai_service()

        assert service1 is service2

    @pytest.mark.asyncio
    async def test_disclaimer_always_added(self, service, mock_deepseek_response):
        """测试免责声明总是被添加"""
        # 测试所有主要方法都添加了免责声明
        methods_to_test = [
            ("chat", ["你好"], {}),
            ("generate_health_advice", [{"age": 45}], {}),
            ("analyze_symptoms", ["头痛", {"age": 50}], {}),
            ("generate_medication_guide", ["阿司匹林"], {}),
            ("generate_health_education", ["高血压"], {}),
            ("assess_risk", [{"age": 50}], {}),
        ]

        with patch.object(
            service.deepseek_client,
            "chat",
            new=AsyncMock(return_value=mock_deepseek_response)
        ):
            for method_name, args, kwargs in methods_to_test:
                method = getattr(service, method_name)
                response = await method(*args, **kwargs)

                # 获取响应中的内容字段
                content_key = [k for k in response.keys() if k in ["content", "advice", "analysis", "guide", "assessment"]][0]
                content = response[content_key]

                assert "仅供参考" in content or "请咨询" in content, \
                    f"{method_name} 方法未添加免责声明"
