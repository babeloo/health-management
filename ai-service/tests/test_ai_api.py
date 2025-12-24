"""
AI API 集成测试
"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from app.main import app


class TestAIAPI:
    """AI API 集成测试类"""

    @pytest.fixture
    async def client(self):
        """创建测试客户端"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac

    @pytest.fixture
    def mock_ai_response(self):
        """模拟 AI 响应"""
        return {
            "content": "这是测试响应\n\n【免责声明】此建议仅供参考，请咨询专业医生。",
            "finish_reason": "stop",
            "usage": {
                "prompt_tokens": 50,
                "completion_tokens": 100,
                "total_tokens": 150
            }
        }

    @pytest.mark.asyncio
    async def test_chat_endpoint(self, client, mock_ai_response):
        """测试对话接口"""
        with patch("app.services.ai_service.get_ai_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.chat = AsyncMock(return_value=mock_ai_response)
            mock_get_service.return_value = mock_service

            response = await client.post(
                "/api/v1/ai/chat",
                json={
                    "message": "高血压患者应该注意什么？",
                    "stream": False
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "content" in data
            assert "仅供参考" in data["content"]
            assert data["usage"]["total_tokens"] == 150

    @pytest.mark.asyncio
    async def test_chat_with_history(self, client, mock_ai_response):
        """测试带对话历史的对话"""
        with patch("app.services.ai_service.get_ai_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.chat = AsyncMock(return_value=mock_ai_response)
            mock_get_service.return_value = mock_service

            response = await client.post(
                "/api/v1/ai/chat",
                json={
                    "message": "那运动方面呢？",
                    "conversation_history": [
                        {"role": "user", "content": "高血压患者应该注意什么？"},
                        {"role": "assistant", "content": "建议控制饮食..."}
                    ],
                    "stream": False
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "content" in data

    @pytest.mark.asyncio
    async def test_chat_validation_error(self, client):
        """测试请求参数验证"""
        response = await client.post(
            "/api/v1/ai/chat",
            json={
                "message": "",  # 空消息，应该失败
                "stream": False
            }
        )

        assert response.status_code == 422  # Validation Error

    @pytest.mark.asyncio
    async def test_health_advice_endpoint(self, client, mock_ai_response):
        """测试健康建议接口"""
        mock_response = {
            "advice": "健康建议内容\n\n【免责声明】此建议仅供参考，请咨询专业医生。",
            "finish_reason": "stop",
            "usage": {"prompt_tokens": 100, "completion_tokens": 200, "total_tokens": 300}
        }

        with patch("app.services.ai_service.get_ai_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.generate_health_advice = AsyncMock(return_value=mock_response)
            mock_get_service.return_value = mock_service

            response = await client.post(
                "/api/v1/ai/health-advice",
                json={
                    "health_data": {
                        "age": 45,
                        "diseases": ["高血压"],
                        "recent_check_ins": {
                            "blood_pressure": 5,
                            "medication": 7
                        },
                        "average_bp": {
                            "systolic": 145,
                            "diastolic": 90
                        },
                        "risk_level": "medium"
                    }
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "advice" in data
            assert "仅供参考" in data["advice"]

    @pytest.mark.asyncio
    async def test_symptom_analysis_endpoint(self, client):
        """测试症状分析接口"""
        mock_response = {
            "analysis": "症状分析内容\n\n【免责声明】此建议仅供参考，请咨询专业医生。",
            "finish_reason": "stop",
            "usage": {"prompt_tokens": 80, "completion_tokens": 150, "total_tokens": 230}
        }

        with patch("app.services.ai_service.get_ai_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.analyze_symptoms = AsyncMock(return_value=mock_response)
            mock_get_service.return_value = mock_service

            response = await client.post(
                "/api/v1/ai/symptom-analysis",
                json={
                    "symptoms": "头晕、头痛，特别是早上起床时",
                    "patient_data": {
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
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "analysis" in data
            assert "仅供参考" in data["analysis"]

    @pytest.mark.asyncio
    async def test_medication_guide_endpoint(self, client):
        """测试用药指导接口"""
        mock_response = {
            "guide": "用药指导内容\n\n【免责声明】此建议仅供参考，请咨询专业医生。",
            "finish_reason": "stop",
            "usage": {"prompt_tokens": 60, "completion_tokens": 120, "total_tokens": 180}
        }

        with patch("app.services.ai_service.get_ai_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.generate_medication_guide = AsyncMock(return_value=mock_response)
            mock_get_service.return_value = mock_service

            response = await client.post(
                "/api/v1/ai/medication-guide",
                json={
                    "medication_name": "硝苯地平缓释片",
                    "patient_info": {
                        "age": 55,
                        "diseases": ["高血压"]
                    }
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "guide" in data
            assert "仅供参考" in data["guide"]

    @pytest.mark.asyncio
    async def test_health_education_endpoint(self, client):
        """测试健康科普接口"""
        mock_response = {
            "content": "科普内容\n\n【免责声明】此建议仅供参考，请咨询专业医生。",
            "finish_reason": "stop",
            "usage": {"prompt_tokens": 70, "completion_tokens": 180, "total_tokens": 250}
        }

        with patch("app.services.ai_service.get_ai_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.generate_health_education = AsyncMock(return_value=mock_response)
            mock_get_service.return_value = mock_service

            response = await client.post(
                "/api/v1/ai/health-education",
                json={
                    "topic": "高血压饮食注意事项",
                    "patient_context": {
                        "age": 45,
                        "diseases": ["高血压"]
                    }
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "content" in data
            assert "仅供参考" in data["content"]

    @pytest.mark.asyncio
    async def test_risk_assessment_endpoint(self, client):
        """测试风险评估接口"""
        mock_response = {
            "assessment": "风险评估内容\n\n【免责声明】此建议仅供参考，请咨询专业医生。",
            "finish_reason": "stop",
            "usage": {"prompt_tokens": 120, "completion_tokens": 250, "total_tokens": 370}
        }

        with patch("app.services.ai_service.get_ai_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.assess_risk = AsyncMock(return_value=mock_response)
            mock_get_service.return_value = mock_service

            response = await client.post(
                "/api/v1/ai/risk-assessment",
                json={
                    "health_data": {
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
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "assessment" in data
            assert "仅供参考" in data["assessment"]

    @pytest.mark.asyncio
    async def test_usage_stats_endpoint(self, client):
        """测试使用统计接口"""
        mock_stats = {
            "prompt_tokens": 1000,
            "completion_tokens": 2000,
            "total_tokens": 3000,
            "requests": 15
        }

        with patch("app.services.ai_service.get_ai_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.get_usage_stats = AsyncMock(return_value=mock_stats)
            mock_get_service.return_value = mock_service

            response = await client.get("/api/v1/ai/usage")

            assert response.status_code == 200
            data = response.json()
            assert data["prompt_tokens"] == 1000
            assert data["completion_tokens"] == 2000
            assert data["total_tokens"] == 3000
            assert data["requests"] == 15

    @pytest.mark.asyncio
    async def test_reset_usage_endpoint(self, client):
        """测试重置使用统计接口"""
        with patch("app.services.ai_service.get_ai_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.reset_usage_stats = AsyncMock()
            mock_get_service.return_value = mock_service

            response = await client.post("/api/v1/ai/usage/reset")

            assert response.status_code == 200
            data = response.json()
            assert "message" in data

    @pytest.mark.asyncio
    async def test_api_error_handling(self, client):
        """测试 API 错误处理"""
        from app.services.ai_service import AIServiceError

        with patch("app.services.ai_service.get_ai_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.chat = AsyncMock(side_effect=AIServiceError("API 调用失败"))
            mock_get_service.return_value = mock_service

            response = await client.post(
                "/api/v1/ai/chat",
                json={
                    "message": "你好",
                    "stream": False
                }
            )

            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
