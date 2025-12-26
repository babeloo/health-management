"""
AI 辅助诊断 API 路由

提供以下端点：
- POST /api/v1/diagnosis/health-summary - 生成健康摘要
- POST /api/v1/diagnosis/risk-assessment - 风险评估
- POST /api/v1/diagnosis/recommendations - 诊断建议
- POST /api/v1/diagnosis/medication-advice - 用药建议
- POST /api/v1/diagnosis/lifestyle-advice - 生活方式建议
- POST /api/v1/diagnosis/report - 生成综合诊断报告
"""

from fastapi import APIRouter, HTTPException, Depends, status
from loguru import logger

from app.models.diagnosis_models import (
    HealthSummaryRequest,
    HealthSummaryResponse,
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    DiagnosticAdviceRequest,
    DiagnosticAdviceResponse,
    MedicationAdviceRequest,
    MedicationAdviceResponse,
    LifestyleAdviceRequest,
    LifestyleAdviceResponse,
    ComprehensiveDiagnosisReportRequest,
    ComprehensiveDiagnosisReportResponse,
    ErrorResponse,
)
from app.services.diagnosis_service import DiagnosticService


# 创建路由
router = APIRouter(
    prefix="/api/v1/diagnosis",
    tags=["诊断"],
    responses={
        400: {"model": ErrorResponse, "description": "请求参数错误"},
        500: {"model": ErrorResponse, "description": "服务器错误"},
    },
)

# 创建诊断服务实例
diagnosis_service = DiagnosticService()


@router.post(
    "/health-summary",
    response_model=HealthSummaryResponse,
    summary="生成健康摘要",
    description="根据患者健康数据生成健康状况摘要，包括关键指标评估和趋势分析。",
)
async def generate_health_summary(
    request: HealthSummaryRequest,
) -> HealthSummaryResponse:
    """
    生成健康摘要

    根据患者的健康指标、打卡数据和趋势信息，生成综合健康状况摘要。
    包含关键指标评估、异常指标识别和健康趋势分析。

    **请求参数：**
    - user_id: 用户 ID
    - age: 年龄（1-120岁）
    - gender: 性别（可选）
    - diseases: 已有疾病列表（可选）
    - recent_metrics: 最近收集的健康指标
    - checkin_stats: 近7天打卡统计（可选）
    - trends: 健康指标趋势数据（可选）
    - medications: 当前用药列表（可选）

    **返回数据：**
    - summary: 健康摘要文字描述
    - key_metrics: 关键健康指标及评估
    - abnormal_indicators: 异常指标列表
    - trends: 健康趋势描述
    - generated_at: 生成时间

    **示例：**
    ```json
    {
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
        ]
    }
    ```
    """
    try:
        logger.info(f"开始生成健康摘要: user_id={request.user_id}")
        result = await diagnosis_service.generate_health_summary(request)
        logger.info(f"健康摘要生成成功: user_id={request.user_id}")
        return result

    except Exception as e:
        logger.error(f"生成健康摘要失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="生成健康摘要失败，请稍后重试"
        )


@router.post(
    "/risk-assessment",
    response_model=RiskAssessmentResponse,
    summary="风险评估",
    description="根据患者健康数据评估健康风险等级，识别风险因素并预测可能的并发症。",
)
async def assess_risk(
    request: RiskAssessmentRequest,
) -> RiskAssessmentResponse:
    """
    进行风险评估

    根据患者的健康数据、病史和生活方式，评估健康风险等级、识别主要风险因素
    并预测可能的并发症。

    **请求参数：**
    - user_id: 用户 ID
    - age: 年龄
    - gender: 性别（可选）
    - diseases: 已有疾病列表（可选）
    - family_history: 家族史（可选）
    - health_metrics: 关键健康指标（血压、血糖等）
    - lifestyle: 生活方式数据（可选）
    - physical_exam: 体检数据（可选）

    **返回数据：**
    - risk_level: 风险等级（low/medium/high/critical）
    - risk_score: 风险评分（0-100）
    - primary_risks: 主要风险因素
    - predicted_complications: 预测的并发症
    - recommendations: 预防建议
    - assessment_details: 详细评估说明

    **风险等级定义：**
    - LOW (< 30分): 低风险，保持健康生活方式
    - MEDIUM (30-50分): 中风险，需要加强管理
    - HIGH (50-75分): 高风险，需要积极干预
    - CRITICAL (≥ 75分): 极高风险，需要紧急干预

    **示例：**
    ```json
    {
        "user_id": "user_123",
        "age": 60,
        "gender": "male",
        "diseases": ["高血压", "糖尿病"],
        "health_metrics": {
            "systolic": 150,
            "diastolic": 95,
            "blood_sugar": 180
        },
        "lifestyle": {
            "smoking": true,
            "exercise_frequency": "1-2次/周"
        }
    }
    ```
    """
    try:
        logger.info(f"开始进行风险评估: user_id={request.user_id}")
        result = await diagnosis_service.assess_risk(request)
        logger.info(f"风险评估完成: user_id={request.user_id}, risk_level={result.risk_level}")
        return result

    except Exception as e:
        logger.error(f"风险评估失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="风险评估失败，请稍后重试"
        )


@router.post(
    "/recommendations",
    response_model=DiagnosticAdviceResponse,
    summary="诊断建议",
    description="基于患者临床信息和检查数据，提供诊断建议和优先级检查项目。",
)
async def generate_diagnostic_advice(
    request: DiagnosticAdviceRequest,
) -> DiagnosticAdviceResponse:
    """
    生成诊断建议

    基于患者的临床信息、检查数据和症状，提供可能的诊断方向、鉴别诊断建议
    和优先级检查项目。

    **请求参数：**
    - user_id: 用户 ID
    - age: 年龄
    - gender: 性别（可选）
    - diseases: 已有疾病（可选）
    - current_symptoms: 当前症状（可选）
    - health_metrics: 关键健康指标
    - recent_tests: 最近检查结果（可选）
    - current_medications: 当前用药（可选）

    **返回数据：**
    - recommendations: 诊断建议列表（按优先级排序）
    - priority_checks: 优先级检查项目
    - differential_diagnosis: 鉴别诊断说明
    - next_steps: 下一步诊疗步骤
    - disclaimer: 免责声明

    **诊断建议字段：**
    - condition: 诊断方向或疾病名称
    - likelihood: 可能性（possible/likely/probable）
    - basis: 建议依据
    - supporting_evidence: 支持证据列表

    **检查项目紧急程度：**
    - routine: 定期检查
    - soon: 近期内
    - urgent: 紧急
    - emergency: 非常紧急

    **示例：**
    ```json
    {
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
    ```
    """
    try:
        logger.info(f"开始生成诊断建议: user_id={request.user_id}")
        result = await diagnosis_service.generate_diagnostic_advice(request)
        logger.info(f"诊断建议生成完成: user_id={request.user_id}")
        return result

    except Exception as e:
        logger.error(f"生成诊断建议失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="生成诊断建议失败，请稍后重试"
        )


@router.post(
    "/medication-advice",
    response_model=MedicationAdviceResponse,
    summary="用药建议",
    description="基于患者疾病和健康指标，生成个性化的用药方案和注意事项。",
)
async def generate_medication_advice(
    request: MedicationAdviceRequest,
) -> MedicationAdviceResponse:
    """
    生成用药建议

    基于患者的疾病、过敏信息和健康指标，生成个性化的用药方案、注意事项
    和可能的药物相互作用警示。

    **请求参数：**
    - user_id: 用户 ID
    - age: 年龄
    - diseases: 诊断疾病列表
    - allergies: 药物过敏列表（可选）
    - current_medications: 当前用药列表（可选）
    - health_metrics: 相关健康指标
    - renal_function: 肾功能状态（可选）
    - hepatic_function: 肝功能状态（可选）

    **返回数据：**
    - medication_plan: 用药方案概述
    - recommendations: 具体用药建议
    - drug_interactions: 药物相互作用警示
    - dosage_adjustments: 剂量调整建议
    - precautions: 用药注意事项
    - side_effects: 常见副作用及处理方法
    - disclaimer: 免责声明

    **肝肾功能状态：**
    - normal: 正常
    - impaired: 轻中度受损
    - severe: 重度受损

    **示例：**
    ```json
    {
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
    ```
    """
    try:
        logger.info(f"开始生成用药建议: user_id={request.user_id}")
        result = await diagnosis_service.generate_medication_advice(request)
        logger.info(f"用药建议生成完成: user_id={request.user_id}")
        return result

    except Exception as e:
        logger.error(f"生成用药建议失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="生成用药建议失败，请稍后重试"
        )


@router.post(
    "/lifestyle-advice",
    response_model=LifestyleAdviceResponse,
    summary="生活方式建议",
    description="提供个性化的饮食、运动、睡眠和心理健康建议。",
)
async def generate_lifestyle_advice(
    request: LifestyleAdviceRequest,
) -> LifestyleAdviceResponse:
    """
    生成生活方式建议

    基于患者的疾病、健康指标和当前生活方式，提供个性化的改善建议，包括
    饮食、运动、睡眠和心理健康建议。

    **请求参数：**
    - user_id: 用户 ID
    - age: 年龄
    - gender: 性别（可选）
    - diseases: 诊断疾病列表
    - current_lifestyle: 当前生活方式数据
    - health_metrics: 相关健康指标
    - physical_condition: 身体状况（可选）

    **返回数据：**
    - diet_advice: 饮食建议
    - exercise_advice: 运动建议
    - sleep_advice: 睡眠建议
    - mental_health_advice: 心理健康建议
    - improvement_plan: 整体改善计划
    - implementation_tips: 实施技巧和建议

    **身体状况选项：**
    - good: 良好
    - fair: 一般
    - poor: 较差

    **示例：**
    ```json
    {
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
    ```
    """
    try:
        logger.info(f"开始生成生活方式建议: user_id={request.user_id}")
        result = await diagnosis_service.generate_lifestyle_advice(request)
        logger.info(f"生活方式建议生成完成: user_id={request.user_id}")
        return result

    except Exception as e:
        logger.error(f"生成生活方式建议失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="生成生活方式建议失败，请稍后重试"
        )


@router.post(
    "/report",
    response_model=ComprehensiveDiagnosisReportResponse,
    summary="生成综合诊断报告",
    description="综合各类诊断建议生成完整的诊断报告。",
)
async def generate_comprehensive_report(
    request: ComprehensiveDiagnosisReportRequest,
) -> ComprehensiveDiagnosisReportResponse:
    """
    生成综合诊断报告

    综合健康摘要、风险评估、诊断建议、用药建议和生活方式建议，
    生成一份完整的诊断报告。

    **请求参数：**
    - user_id: 用户 ID
    - age: 年龄
    - gender: 性别（可选）
    - diseases: 已有疾病（可选）
    - recent_metrics: 最近健康指标
    - checkin_stats: 打卡统计（可选）
    - trends: 趋势数据（可选）
    - current_medications: 当前用药（可选）
    - current_lifestyle: 当前生活方式（可选）
    - current_symptoms: 当前症状（可选）

    **返回数据：**
    - health_summary: 健康摘要
    - risk_assessment: 风险评估结果
    - diagnostic_recommendations: 诊断建议
    - medication_advice: 用药建议
    - lifestyle_advice: 生活方式建议
    - report_type: 报告类型
    - generated_at: 生成时间
    - validity_days: 有效期（天数）

    **报告有效期：**
    - 综合报告有效期默认为 30 天
    - 建议患者定期更新诊断信息以获得最新建议

    **示例：**
    ```json
    {
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
        ]
    }
    ```

    **注意：**
    此端点会同时调用多个子服务，可能需要较长时间，建议异步调用。
    报告内容包含 AI 分析结果，应由医学专业人员审阅后使用。
    """
    try:
        logger.info(f"开始生成综合诊断报告: user_id={request.user_id}")
        result = await diagnosis_service.generate_comprehensive_report(request)
        logger.info(f"综合诊断报告生成完成: user_id={request.user_id}")
        return result

    except Exception as e:
        logger.error(f"生成综合诊断报告失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="生成综合诊断报告失败，请稍后重试"
        )
