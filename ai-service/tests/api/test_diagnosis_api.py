"""
诊断 API 端点测试

测试所有诊断 API 路由的功能
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.models.diagnosis_models import (
    HealthSummaryRequest,
    HealthMetric,
    RiskAssessmentRequest,
    DiagnosticAdviceRequest,
    MedicationAdviceRequest,
    LifestyleAdviceRequest,
    ComprehensiveDiagnosisReportRequest,
    TrendData,
)


@pytest.fixture
def client():
    """创建测试客户端"""
    return TestClient(app)


@pytest.fixture
def health_summary_payload():
    """健康摘要请求载荷"""
    return {
        "user_id": "user_123",
        "age": 55,
        "gender": "male",
        "diseases": ["高血压", "糖尿病"],
        "recent_metrics": [
            {
                "name": "收缩压",
                "value": 145,
                "unit": "mmHg",
                "normal_range": {"min": 90, "max": 120},
                "status": "abnormal"
            }
        ],
        "checkin_stats": {
            "blood_pressure": 5,
            "blood_sugar": 3,
            "medication": 7
        },
        "trends": [
            {
                "metric_name": "血压",
                "trend": "declined",
                "change_percentage": -5.5,
                "days": 30
            }
        ]
    }


@pytest.fixture
def risk_assessment_payload():
    """风险评估请求载荷"""
    return {
        "user_id": "user_123",
        "age": 60,
        "gender": "male",
        "diseases": ["高血压", "糖尿病"],
        "family_history": ["心脏病"],
        "health_metrics": {
            "systolic": 150,
            "diastolic": 95,
            "blood_sugar": 180
        },
        "lifestyle": {
            "smoking": True,
            "exercise_frequency": "1-2次/周"
        }
    }


@pytest.fixture
def diagnostic_advice_payload():
    """诊断建议请求载荷"""
    return {
        "user_id": "user_123",
        "age": 55,
        "gender": "male",
        "diseases": ["高血压"],
        "current_symptoms": ["头晕", "头痛"],
        "health_metrics": {
            "systolic": 160,
            "diastolic": 100,
            "blood_sugar": 110
        },
        "current_medications": ["硝苯地平缓释片"]
    }


@pytest.fixture
def medication_advice_payload():
    """用药建议请求载荷"""
    return {
        "user_id": "user_123",
        "age": 60,
        "diseases": ["高血压", "糖尿病"],
        "allergies": ["青霉素"],
        "current_medications": [
            {
                "name": "硝苯地平缓释片",
                "dosage": "30mg",
                "frequency": "每天两次"
            }
        ],
        "health_metrics": {
            "systolic": 150,
            "diastolic": 95,
            "blood_sugar": 180
        }
    }


@pytest.fixture
def lifestyle_advice_payload():
    """生活方式建议请求载荷"""
    return {
        "user_id": "user_123",
        "age": 55,
        "gender": "male",
        "diseases": ["高血压", "糖尿病"],
        "current_lifestyle": {
            "diet": "高盐高油",
            "exercise_frequency": "1次/周",
            "sleep_hours": "6小时"
        },
        "health_metrics": {
            "bmi": 28,
            "blood_pressure": "150/95"
        }
    }


@pytest.fixture
def comprehensive_report_payload():
    """综合诊断报告请求载荷"""
    return {
        "user_id": "user_123",
        "age": 55,
        "gender": "male",
        "diseases": ["高血压"],
        "recent_metrics": [
            {
                "name": "收缩压",
                "value": 145,
                "unit": "mmHg",
                "normal_range": {"min": 90, "max": 120},
                "status": "abnormal"
            }
        ],
        "checkin_stats": {
            "blood_pressure": 5,
            "blood_sugar": 3,
            "medication": 7
        }
    }


class TestDiagnosisAPI:
    """诊断 API 测试类"""

    @pytest.mark.asyncio
    async def test_health_summary_endpoint_success(
        self,
        client,
        health_summary_payload,
    ):
        """测试健康摘要 API 端点成功响应"""
        with patch("app.api.v1.diagnosis.diagnosis_service.generate_health_summary") as mock:
            mock.return_value = AsyncMock(
                return_value={
                    "user_id": "user_123",
                    "summary": "该患者血压控制欠佳。此建议仅供参考。",
                    "key_metrics": [{"name": "收缩压", "value": 145}],
                    "abnormal_indicators": ["收缩压"],
                    "trends": ["血压呈下降趋势"],
                    "generated_at": "2024-12-25T10:00:00Z"
                }
            )()

            response = client.post(
                "/api/v1/diagnosis/health-summary",
                json=health_summary_payload
            )

            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == "user_123"
            assert "summary" in data
            assert "key_metrics" in data

    @pytest.mark.asyncio
    async def test_risk_assessment_endpoint_success(
        self,
        client,
        risk_assessment_payload,
    ):
        """测试风险评估 API 端点成功响应"""
        with patch("app.api.v1.diagnosis.diagnosis_service.assess_risk") as mock:
            mock.return_value = AsyncMock(
                return_value={
                    "user_id": "user_123",
                    "risk_level": "high",
                    "risk_score": 75,
                    "primary_risks": [
                        {
                            "factor": "血压控制不佳",
                            "severity": "high",
                            "description": "收缩压 150 mmHg"
                        }
                    ],
                    "predicted_complications": ["脑卒中", "心肌梗塞"],
                    "recommendations": ["加强用药依从性"],
                    "assessment_details": "该患者为高风险人群",
                    "generated_at": "2024-12-25T10:00:00Z"
                }
            )()

            response = client.post(
                "/api/v1/diagnosis/risk-assessment",
                json=risk_assessment_payload
            )

            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == "user_123"
            assert data["risk_level"] == "high"
            assert data["risk_score"] >= 0

    @pytest.mark.asyncio
    async def test_diagnostic_advice_endpoint_success(
        self,
        client,
        diagnostic_advice_payload,
    ):
        """测试诊断建议 API 端点成功响应"""
        with patch("app.api.v1.diagnosis.diagnosis_service.generate_diagnostic_advice") as mock:
            mock.return_value = AsyncMock(
                return_value={
                    "user_id": "user_123",
                    "recommendations": [
                        {
                            "condition": "高血压控制不佳",
                            "likelihood": "probable",
                            "basis": "血压显著升高",
                            "supporting_evidence": ["收缩压 160 mmHg"]
                        }
                    ],
                    "priority_checks": [
                        {
                            "name": "心电图",
                            "urgency": "urgent",
                            "reason": "排除心脏并发症",
                            "expected_days": 1
                        }
                    ],
                    "differential_diagnosis": "鉴别诊断说明",
                    "next_steps": ["进行基础检查"],
                    "disclaimer": "此建议仅供参考，不能替代医生诊断。",
                    "generated_at": "2024-12-25T10:00:00Z"
                }
            )()

            response = client.post(
                "/api/v1/diagnosis/recommendations",
                json=diagnostic_advice_payload
            )

            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == "user_123"
            assert "recommendations" in data
            assert "disclaimer" in data

    @pytest.mark.asyncio
    async def test_medication_advice_endpoint_success(
        self,
        client,
        medication_advice_payload,
    ):
        """测试用药建议 API 端点成功响应"""
        with patch("app.api.v1.diagnosis.diagnosis_service.generate_medication_advice") as mock:
            mock.return_value = AsyncMock(
                return_value={
                    "user_id": "user_123",
                    "medication_plan": "针对高血压和糖尿病的联合治疗方案",
                    "recommendations": [
                        {
                            "drug": "硝苯地平缓释片",
                            "indication": "高血压",
                            "dosage": "30mg",
                            "frequency": "每天两次"
                        }
                    ],
                    "drug_interactions": ["避免与某些降糖药物同时使用"],
                    "precautions": ["餐前半小时服用"],
                    "disclaimer": "此建议仅供参考，必须遵医嘱用药。",
                    "generated_at": "2024-12-25T10:00:00Z"
                }
            )()

            response = client.post(
                "/api/v1/diagnosis/medication-advice",
                json=medication_advice_payload
            )

            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == "user_123"
            assert "medication_plan" in data
            assert "disclaimer" in data

    @pytest.mark.asyncio
    async def test_lifestyle_advice_endpoint_success(
        self,
        client,
        lifestyle_advice_payload,
    ):
        """测试生活方式建议 API 端点成功响应"""
        with patch("app.api.v1.diagnosis.diagnosis_service.generate_lifestyle_advice") as mock:
            mock.return_value = AsyncMock(
                return_value={
                    "user_id": "user_123",
                    "diet_advice": {
                        "recommendations": ["减少盐分摄入"],
                        "foods_to_eat": ["绿叶蔬菜"],
                        "foods_to_avoid": ["腌制食品"]
                    },
                    "exercise_advice": {
                        "type": "有氧运动",
                        "frequency": "每周5次",
                        "duration": "30分钟/次",
                        "intensity": "中等强度"
                    },
                    "sleep_advice": {
                        "target_hours": "7-9",
                        "bedtime": "23:00",
                        "wake_time": "07:00"
                    },
                    "improvement_plan": "整体改善计划",
                    "implementation_tips": ["制定计划", "记录进度"],
                    "generated_at": "2024-12-25T10:00:00Z"
                }
            )()

            response = client.post(
                "/api/v1/diagnosis/lifestyle-advice",
                json=lifestyle_advice_payload
            )

            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == "user_123"
            assert "diet_advice" in data
            assert "exercise_advice" in data
            assert "sleep_advice" in data

    @pytest.mark.asyncio
    async def test_comprehensive_report_endpoint_success(
        self,
        client,
        comprehensive_report_payload,
    ):
        """测试综合诊断报告 API 端点成功响应"""
        with patch("app.api.v1.diagnosis.diagnosis_service.generate_comprehensive_report") as mock:
            mock.return_value = AsyncMock(
                return_value={
                    "user_id": "user_123",
                    "health_summary": "健康摘要",
                    "risk_assessment": {"risk_level": "high"},
                    "diagnostic_recommendations": [{"condition": "高血压"}],
                    "medication_advice": {"medication_plan": "方案"},
                    "lifestyle_advice": {"diet_advice": {}},
                    "report_type": "comprehensive",
                    "generated_at": "2024-12-25T10:00:00Z",
                    "validity_days": 30
                }
            )()

            response = client.post(
                "/api/v1/diagnosis/report",
                json=comprehensive_report_payload
            )

            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == "user_123"
            assert data["report_type"] == "comprehensive"

    @pytest.mark.asyncio
    async def test_health_summary_invalid_age(self, client):
        """测试健康摘要请求年龄验证"""
        invalid_payload = {
            "user_id": "user_123",
            "age": 150,  # 超出范围
            "gender": "male",
            "recent_metrics": []
        }

        response = client.post(
            "/api/v1/diagnosis/health-summary",
            json=invalid_payload
        )

        assert response.status_code == 422  # 验证错误

    @pytest.mark.asyncio
    async def test_risk_assessment_missing_required_fields(self, client):
        """测试风险评估缺少必需字段"""
        invalid_payload = {
            "user_id": "user_123",
            "age": 60,
            # 缺少 health_metrics
        }

        response = client.post(
            "/api/v1/diagnosis/risk-assessment",
            json=invalid_payload
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_api_error_response(
        self,
        client,
        health_summary_payload,
    ):
        """测试 API 错误响应"""
        with patch("app.api.v1.diagnosis.diagnosis_service.generate_health_summary") as mock:
            mock.side_effect = Exception("服务错误")

            response = client.post(
                "/api/v1/diagnosis/health-summary",
                json=health_summary_payload
            )

            assert response.status_code == 500
            data = response.json()
            assert "detail" in data

    @pytest.mark.asyncio
    async def test_endpoint_documentation(self, client):
        """测试 API 文档是否可访问"""
        response = client.get("/docs")

        # 如果在生产环境，文档应该被禁用
        # 在非生产环境，文档应该可访问
        assert response.status_code in [200, 404]


class TestDiagnosisModels:
    """诊断数据模型测试"""

    def test_health_metric_validation(self):
        """测试健康指标模型验证"""
        # 有效数据
        metric = HealthMetric(
            name="血压",
            value=150,
            unit="mmHg",
            status="abnormal"
        )
        assert metric.name == "血压"

    def test_risk_assessment_request_validation(self):
        """测试风险评估请求模型验证"""
        request = RiskAssessmentRequest(
            user_id="user_123",
            age=60,
            diseases=["高血压"],
            health_metrics={"systolic": 150}
        )
        assert request.age == 60
        assert request.health_metrics["systolic"] == 150

    def test_diagnostic_advice_request_validation(self):
        """测试诊断建议请求模型验证"""
        request = DiagnosticAdviceRequest(
            user_id="user_123",
            age=55,
            diseases=["高血压"],
            health_metrics={"systolic": 160}
        )
        assert request.user_id == "user_123"
        assert request.age == 55

    def test_medication_advice_request_validation(self):
        """测试用药建议请求模型验证"""
        request = MedicationAdviceRequest(
            user_id="user_123",
            age=60,
            diseases=["高血压"],
            health_metrics={"systolic": 150}
        )
        assert request.age == 60
        assert "高血压" in request.diseases

    def test_lifestyle_advice_request_validation(self):
        """测试生活方式建议请求模型验证"""
        request = LifestyleAdviceRequest(
            user_id="user_123",
            age=55,
            diseases=["高血压"],
            current_lifestyle={"diet": "高盐"},
            health_metrics={"bmi": 28}
        )
        assert request.age == 55
        assert request.current_lifestyle["diet"] == "高盐"
