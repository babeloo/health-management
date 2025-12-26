"""
诊断服务单元测试

测试 AI 辅助诊断功能，包括：
- 健康摘要生成
- 风险评估
- 诊断建议生成
- 用药建议生成
- 生活方式建议生成
"""

import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime

from app.services.diagnosis_service import DiagnosticService
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
def diagnosis_service():
    """创建诊断服务实例"""
    service = DiagnosticService()
    return service


@pytest.fixture
def sample_health_metric():
    """示例健康指标"""
    return HealthMetric(
        name="收缩压",
        value=145,
        unit="mmHg",
        normal_range={"min": 90, "max": 120},
        status="abnormal"
    )


@pytest.fixture
def sample_health_summary_request(sample_health_metric):
    """示例健康摘要请求"""
    return HealthSummaryRequest(
        user_id="user_123",
        age=55,
        gender="male",
        diseases=["高血压", "糖尿病"],
        recent_metrics=[sample_health_metric],
        checkin_stats={
            "blood_pressure": 5,
            "blood_sugar": 3,
            "medication": 7
        },
        trends=[
            TrendData(
                metric_name="血压",
                trend="declined",
                change_percentage=-5.5,
                days=30
            )
        ]
    )


@pytest.fixture
def sample_risk_assessment_request():
    """示例风险评估请求"""
    return RiskAssessmentRequest(
        user_id="user_123",
        age=60,
        gender="male",
        diseases=["高血压", "糖尿病"],
        family_history=["心脏病"],
        health_metrics={
            "systolic": 150,
            "diastolic": 95,
            "blood_sugar": 180
        },
        lifestyle={
            "smoking": True,
            "exercise_frequency": "1-2次/周"
        }
    )


@pytest.fixture
def sample_diagnostic_advice_request():
    """示例诊断建议请求"""
    return DiagnosticAdviceRequest(
        user_id="user_123",
        age=55,
        gender="male",
        diseases=["高血压"],
        current_symptoms=["头晕", "头痛"],
        health_metrics={
            "systolic": 160,
            "diastolic": 100,
            "blood_sugar": 110
        },
        current_medications=["硝苯地平缓释片"]
    )


@pytest.fixture
def sample_medication_advice_request():
    """示例用药建议请求"""
    return MedicationAdviceRequest(
        user_id="user_123",
        age=60,
        diseases=["高血压", "糖尿病"],
        allergies=["青霉素"],
        current_medications=[
            {
                "name": "硝苯地平缓释片",
                "dosage": "30mg",
                "frequency": "每天两次"
            }
        ],
        health_metrics={
            "systolic": 150,
            "diastolic": 95,
            "blood_sugar": 180
        }
    )


@pytest.fixture
def sample_lifestyle_advice_request():
    """示例生活方式建议请求"""
    return LifestyleAdviceRequest(
        user_id="user_123",
        age=55,
        gender="male",
        diseases=["高血压", "糖尿病"],
        current_lifestyle={
            "diet": "高盐高油",
            "exercise_frequency": "1次/周",
            "sleep_hours": "6小时"
        },
        health_metrics={
            "bmi": 28,
            "blood_pressure": "150/95"
        }
    )


class TestDiagnosticService:
    """诊断服务测试类"""

    @pytest.mark.asyncio
    async def test_generate_health_summary_success(
        self,
        diagnosis_service,
        sample_health_summary_request,
        mock_deepseek_client,
    ):
        """测试成功生成健康摘要"""
        with patch.object(
            diagnosis_service,
            "deepseek_client",
            mock_deepseek_client
        ):
            mock_deepseek_client.chat.return_value = {
                "choices": [
                    {
                        "message": {
                            "content": "该患者血压控制欠佳，需要加强用药依从性。此建议仅供参考。"
                        }
                    }
                ]
            }

            result = await diagnosis_service.generate_health_summary(
                sample_health_summary_request
            )

            assert result.user_id == "user_123"
            assert "血压" in result.summary
            assert len(result.key_metrics) > 0
            assert len(result.abnormal_indicators) > 0
            assert result.generated_at is not None

    @pytest.mark.asyncio
    async def test_assess_risk_success(
        self,
        diagnosis_service,
        sample_risk_assessment_request,
        mock_deepseek_client,
    ):
        """测试成功进行风险评估"""
        with patch.object(
            diagnosis_service,
            "deepseek_client",
            mock_deepseek_client
        ):
            mock_deepseek_client.chat.return_value = {
                "choices": [
                    {
                        "message": {
                            "content": "该患者属于高风险人群，需要加强健康管理。"
                        }
                    }
                ]
            }

            result = await diagnosis_service.assess_risk(
                sample_risk_assessment_request
            )

            assert result.user_id == "user_123"
            assert result.risk_score >= 0
            assert result.risk_score <= 100
            assert result.risk_level is not None
            assert len(result.primary_risks) > 0
            assert len(result.recommendations) > 0
            assert result.generated_at is not None

    @pytest.mark.asyncio
    async def test_generate_diagnostic_advice_success(
        self,
        diagnosis_service,
        sample_diagnostic_advice_request,
        mock_deepseek_client,
    ):
        """测试成功生成诊断建议"""
        with patch.object(
            diagnosis_service,
            "deepseek_client",
            mock_deepseek_client
        ):
            mock_deepseek_client.chat.return_value = {
                "choices": [
                    {
                        "message": {
                            "content": """诊断方向：高血压控制不佳
依据：血压 160/100 mmHg，伴有头晕头痛症状
建议检查：心电图、肾功能检查"""
                        }
                    }
                ]
            }

            result = await diagnosis_service.generate_diagnostic_advice(
                sample_diagnostic_advice_request
            )

            assert result.user_id == "user_123"
            assert len(result.recommendations) > 0
            assert len(result.priority_checks) > 0
            assert result.differential_diagnosis is not None
            assert len(result.next_steps) > 0
            assert "此建议仅供参考" in result.disclaimer
            assert result.generated_at is not None

    @pytest.mark.asyncio
    async def test_generate_medication_advice_success(
        self,
        diagnosis_service,
        sample_medication_advice_request,
        mock_deepseek_client,
    ):
        """测试成功生成用药建议"""
        with patch.object(
            diagnosis_service,
            "deepseek_client",
            mock_deepseek_client
        ):
            mock_deepseek_client.chat.return_value = {
                "choices": [
                    {
                        "message": {
                            "content": """推荐用药方案：
1. 硝苯地平缓释片 30mg 每天两次
注意事项：餐前半小时服用，避免高脂饮食"""
                        }
                    }
                ]
            }

            result = await diagnosis_service.generate_medication_advice(
                sample_medication_advice_request
            )

            assert result.user_id == "user_123"
            assert result.medication_plan is not None
            assert len(result.recommendations) > 0
            assert len(result.precautions) > 0
            assert "此建议仅供参考" in result.disclaimer
            assert result.generated_at is not None

    @pytest.mark.asyncio
    async def test_generate_lifestyle_advice_success(
        self,
        diagnosis_service,
        sample_lifestyle_advice_request,
        mock_deepseek_client,
    ):
        """测试成功生成生活方式建议"""
        with patch.object(
            diagnosis_service,
            "deepseek_client",
            mock_deepseek_client
        ):
            mock_deepseek_client.chat.return_value = {
                "choices": [
                    {
                        "message": {
                            "content": """饮食建议：减少盐分，增加纤维素
运动建议：每周150分钟中等强度有氧运动
睡眠建议：保证7-9小时睡眠"""
                        }
                    }
                ]
            }

            result = await diagnosis_service.generate_lifestyle_advice(
                sample_lifestyle_advice_request
            )

            assert result.user_id == "user_123"
            assert result.diet_advice is not None
            assert result.exercise_advice is not None
            assert result.sleep_advice is not None
            assert result.improvement_plan is not None
            assert len(result.implementation_tips) > 0
            assert result.generated_at is not None

    @pytest.mark.asyncio
    async def test_generate_comprehensive_report_success(
        self,
        diagnosis_service,
        sample_health_metric,
        mock_deepseek_client,
    ):
        """测试成功生成综合诊断报告"""
        request = ComprehensiveDiagnosisReportRequest(
            user_id="user_123",
            age=55,
            gender="male",
            diseases=["高血压"],
            recent_metrics=[sample_health_metric],
            checkin_stats={
                "blood_pressure": 5,
                "blood_sugar": 3,
                "medication": 7
            }
        )

        with patch.object(
            diagnosis_service,
            "deepseek_client",
            mock_deepseek_client
        ):
            mock_deepseek_client.chat.return_value = {
                "choices": [
                    {
                        "message": {
                            "content": "测试建议内容。此建议仅供参考，请咨询专业医生。"
                        }
                    }
                ]
            }

            result = await diagnosis_service.generate_comprehensive_report(request)

            assert result.user_id == "user_123"
            assert result.health_summary is not None
            assert result.risk_assessment is not None
            assert len(result.diagnostic_recommendations) > 0
            assert result.medication_advice is not None
            assert result.lifestyle_advice is not None
            assert result.report_type == "comprehensive"
            assert result.generated_at is not None
            assert result.validity_days == 30

    def test_build_health_summary_prompt(
        self,
        diagnosis_service,
        sample_health_summary_request,
    ):
        """测试构建健康摘要 prompt"""
        prompt = diagnosis_service._build_health_summary_prompt(
            sample_health_summary_request
        )

        assert "年龄" in prompt
        assert "55" in prompt
        assert "高血压" in prompt
        assert "糖尿病" in prompt
        assert "收缩压" in prompt

    def test_build_risk_assessment_prompt(
        self,
        diagnosis_service,
        sample_risk_assessment_request,
    ):
        """测试构建风险评估 prompt"""
        score = diagnosis_service._calculate_risk_score(sample_risk_assessment_request)
        prompt = diagnosis_service._build_risk_assessment_prompt(
            sample_risk_assessment_request,
            score
        )

        assert "患者基本信息" in prompt
        assert "高血压" in prompt
        assert "糖尿病" in prompt
        assert "150" in prompt

    def test_calculate_risk_score(
        self,
        diagnosis_service,
        sample_risk_assessment_request,
    ):
        """测试风险评分计算"""
        score = diagnosis_service._calculate_risk_score(sample_risk_assessment_request)

        # 验证风险评分在合理范围内
        assert 0 <= score <= 100

        # 验证高血压和高龄增加分数
        assert score > 0

    def test_determine_risk_level(self, diagnosis_service):
        """测试风险等级判断"""
        # 低风险
        level = diagnosis_service._determine_risk_level(20)
        assert level.value == "low"

        # 中风险
        level = diagnosis_service._determine_risk_level(40)
        assert level.value == "medium"

        # 高风险
        level = diagnosis_service._determine_risk_level(60)
        assert level.value == "high"

        # 极高风险
        level = diagnosis_service._determine_risk_level(80)
        assert level.value == "critical"

    def test_identify_risk_factors(
        self,
        diagnosis_service,
        sample_risk_assessment_request,
    ):
        """测试风险因素识别"""
        factors = diagnosis_service._identify_risk_factors(
            sample_risk_assessment_request
        )

        assert len(factors) > 0
        # 验证识别到血压和血糖风险因素
        factor_names = [f.factor for f in factors]
        assert any("血压" in name for name in factor_names)

    def test_extract_key_metrics(
        self,
        diagnosis_service,
        sample_health_metric,
    ):
        """测试关键指标提取"""
        metrics = diagnosis_service._extract_key_metrics([sample_health_metric])

        assert len(metrics) == 1
        assert metrics[0]["name"] == "收缩压"
        assert metrics[0]["value"] == 145
        assert metrics[0]["unit"] == "mmHg"
        assert metrics[0]["status"] == "abnormal"

    def test_identify_abnormal_indicators(
        self,
        diagnosis_service,
        sample_health_metric,
    ):
        """测试异常指标识别"""
        abnormal = diagnosis_service._identify_abnormal_indicators([sample_health_metric])

        assert len(abnormal) == 1
        assert "收缩压" in abnormal

    def test_analyze_trends(self, diagnosis_service):
        """测试趋势分析"""
        trends = [
            TrendData(
                metric_name="血压",
                trend="declined",
                change_percentage=-5.5,
                days=30
            )
        ]

        result = diagnosis_service._analyze_trends(trends)

        assert len(result) == 1
        assert "血压" in result[0]
        assert "declined" in result[0]
        assert "-5.5%" in result[0]

    def test_parse_medication_recommendations(self, diagnosis_service):
        """测试用药建议解析"""
        content = """推荐用药方案：
1. 硝苯地平缓释片 30mg 每天两次"""

        recommendations = diagnosis_service._parse_medication_recommendations(content)

        assert len(recommendations) > 0
        assert recommendations[0]["drug"] == "硝苯地平缓释片"

    def test_extract_priority_checks(self, diagnosis_service):
        """测试优先级检查项目提取"""
        content = """建议检查：
1. 心电图（紧急）
2. 肾功能检查（近期内）"""

        checks = diagnosis_service._extract_priority_checks(content)

        assert len(checks) > 0
        assert checks[0].name == "心电图"

    def test_extract_diet_advice(self, diagnosis_service):
        """测试饮食建议提取"""
        content = "建议减少盐分，增加纤维素"

        diet_advice = diagnosis_service._extract_diet_advice(content)

        assert diet_advice is not None
        assert "recommendations" in diet_advice
        assert "foods_to_eat" in diet_advice
        assert "foods_to_avoid" in diet_advice

    def test_extract_exercise_advice(self, diagnosis_service):
        """测试运动建议提取"""
        content = "每周5次30分钟的中等强度有氧运动"

        exercise_advice = diagnosis_service._extract_exercise_advice(content)

        assert exercise_advice is not None
        assert "type" in exercise_advice
        assert "frequency" in exercise_advice
        assert "duration" in exercise_advice
        assert "intensity" in exercise_advice

    def test_extract_sleep_advice(self, diagnosis_service):
        """测试睡眠建议提取"""
        content = "保证7-9小时睡眠"

        sleep_advice = diagnosis_service._extract_sleep_advice(content)

        assert sleep_advice is not None
        assert "target_hours" in sleep_advice
        assert "tips" in sleep_advice

    def test_extract_implementation_tips(self, diagnosis_service):
        """测试实施建议提取"""
        content = "制定运动计划并记录进度"

        tips = diagnosis_service._extract_implementation_tips(content)

        assert len(tips) > 0
        assert isinstance(tips, list)
        assert all(isinstance(tip, str) for tip in tips)

    @pytest.mark.asyncio
    async def test_api_error_handling(
        self,
        diagnosis_service,
        sample_health_summary_request,
    ):
        """测试 API 错误处理"""
        with patch.object(
            diagnosis_service,
            "deepseek_client"
        ) as mock_client:
            from app.services.deepseek_client import DeepSeekAPIError
            mock_client.chat.side_effect = DeepSeekAPIError("API 调用失败")

            with pytest.raises(DeepSeekAPIError):
                await diagnosis_service.generate_health_summary(
                    sample_health_summary_request
                )

    @pytest.mark.asyncio
    async def test_predict_complications(
        self,
        diagnosis_service,
        sample_risk_assessment_request,
    ):
        """测试并发症预测"""
        complications = await diagnosis_service._predict_complications(
            sample_risk_assessment_request
        )

        assert len(complications) > 0
        # 验证预测到了与高血压相关的并发症
        assert any("卒" in c or "梗" in c or "肾" in c for c in complications)

    @pytest.mark.asyncio
    async def test_generate_risk_recommendations(
        self,
        diagnosis_service,
        sample_risk_assessment_request,
    ):
        """测试风险预防建议生成"""
        factors = diagnosis_service._identify_risk_factors(sample_risk_assessment_request)
        recommendations = await diagnosis_service._generate_risk_recommendations(
            sample_risk_assessment_request,
            factors
        )

        assert len(recommendations) > 0
        assert all(isinstance(r, str) for r in recommendations)
