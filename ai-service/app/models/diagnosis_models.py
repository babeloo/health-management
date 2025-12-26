"""
诊断模块数据模型

定义 AI 辅助诊断功能的请求和响应模型，包括：
- 健康摘要生成
- 风险评估
- 诊断建议
- 用药建议
- 生活方式建议
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, validator
from enum import Enum


# ============================================
# 枚举类型
# ============================================

class RiskLevel(str, Enum):
    """风险等级枚举"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CheckItemUrgency(str, Enum):
    """检查项目紧急程度"""
    ROUTINE = "routine"  # 定期检查
    SOON = "soon"  # 近期内
    URGENT = "urgent"  # 紧急
    EMERGENCY = "emergency"  # 非常紧急


# ============================================
# 健康摘要相关模型
# ============================================

class HealthMetric(BaseModel):
    """健康指标"""
    name: str = Field(..., description="指标名称，如'血压'、'血糖'")
    value: float = Field(..., description="指标数值")
    unit: str = Field(..., description="单位，如'mmHg'、'mg/dL'")
    normal_range: Optional[Dict[str, float]] = Field(
        None,
        description="正常范围"
    )
    status: str = Field(..., description="状态：normal, abnormal, critical")


class TrendData(BaseModel):
    """趋势数据"""
    metric_name: str = Field(..., description="指标名称")
    trend: str = Field(..., description="趋势：improved, stable, declined")
    change_percentage: float = Field(..., description="变化百分比")
    days: int = Field(..., description="数据统计周期（天数）")


class HealthSummaryRequest(BaseModel):
    """健康摘要生成请求"""
    user_id: str = Field(..., description="用户 ID")
    age: int = Field(..., ge=1, le=120, description="年龄")
    gender: Optional[str] = Field(None, description="性别：male/female")
    diseases: Optional[List[str]] = Field(None, description="已有疾病列表")

    # 最近健康数据
    recent_metrics: List[HealthMetric] = Field(
        ...,
        description="最近收集的健康指标"
    )

    # 打卡数据
    checkin_stats: Optional[Dict[str, int]] = Field(
        None,
        description="近7天打卡统计（各类型打卡次数）"
    )

    # 趋势数据
    trends: Optional[List[TrendData]] = Field(
        None,
        description="健康指标趋势数据"
    )

    # 用药数据
    medications: Optional[List[str]] = Field(
        None,
        description="当前用药列表"
    )

    class Config:
        json_schema_extra = {
            "example": {
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
                "medications": ["硝苯地平缓释片"]
            }
        }


class HealthSummaryResponse(BaseModel):
    """健康摘要响应"""
    user_id: str = Field(..., description="用户 ID")
    summary: str = Field(..., description="健康状况摘要描述")
    key_metrics: List[Dict[str, Any]] = Field(
        ...,
        description="关键健康指标及其评估"
    )
    abnormal_indicators: List[str] = Field(
        default_factory=list,
        description="异常指标列表"
    )
    trends: List[str] = Field(
        default_factory=list,
        description="健康趋势描述"
    )
    generated_at: str = Field(..., description="生成时间（ISO 8601 格式）")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_123",
                "summary": "该患者血压控制欠佳，近期血糖波动较大。建议加强用药依从性和饮食管理。",
                "key_metrics": [
                    {
                        "name": "收缩压",
                        "value": 145,
                        "status": "abnormal",
                        "assessment": "血压偏高"
                    }
                ],
                "abnormal_indicators": ["收缩压升高", "血糖波动"],
                "trends": ["血压近30天呈上升趋势", "血糖波动性较大"],
                "generated_at": "2024-12-25T10:30:00Z"
            }
        }


# ============================================
# 风险评估相关模型
# ============================================

class RiskFactor(BaseModel):
    """风险因素"""
    factor: str = Field(..., description="风险因素名称")
    severity: str = Field(..., description="严重程度：low, medium, high")
    description: str = Field(..., description="因素描述")


class RiskAssessmentRequest(BaseModel):
    """风险评估请求"""
    user_id: str = Field(..., description="用户 ID")
    age: int = Field(..., ge=1, le=120, description="年龄")
    gender: Optional[str] = Field(None, description="性别：male/female")

    # 疾病信息
    diseases: Optional[List[str]] = Field(None, description="已有疾病")
    family_history: Optional[List[str]] = Field(None, description="家族史")

    # 健康指标
    health_metrics: Dict[str, float] = Field(
        ...,
        description="关键健康指标（血压、血糖等）"
    )

    # 生活方式
    lifestyle: Optional[Dict[str, Any]] = Field(
        None,
        description="生活方式数据（吸烟、饮酒、运动等）"
    )

    # 检查数据
    physical_exam: Optional[Dict[str, Any]] = Field(
        None,
        description="体检数据"
    )

    class Config:
        json_schema_extra = {
            "example": {
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
                    "smoking": True,
                    "exercise_frequency": "1-2次/周"
                }
            }
        }


class RiskAssessmentResponse(BaseModel):
    """风险评估响应"""
    user_id: str = Field(..., description="用户 ID")
    risk_level: RiskLevel = Field(..., description="风险等级")
    risk_score: int = Field(..., ge=0, le=100, description="风险评分（0-100）")
    primary_risks: List[RiskFactor] = Field(
        ...,
        description="主要风险因素（优先级排序）"
    )
    predicted_complications: List[str] = Field(
        default_factory=list,
        description="预测可能的并发症"
    )
    recommendations: List[str] = Field(
        ...,
        description="预防建议"
    )
    assessment_details: str = Field(
        ...,
        description="风险评估详细说明"
    )
    generated_at: str = Field(..., description="生成时间")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_123",
                "risk_level": "high",
                "risk_score": 75,
                "primary_risks": [
                    {
                        "factor": "血压控制不佳",
                        "severity": "high",
                        "description": "收缩压 150 mmHg，超过目标范围"
                    }
                ],
                "predicted_complications": ["脑卒中", "心肌梗塞"],
                "recommendations": [
                    "加强用药依从性",
                    "增加运动频率",
                    "改善饮食习惯"
                ],
                "assessment_details": "该患者为高风险人群...",
                "generated_at": "2024-12-25T10:30:00Z"
            }
        }


# ============================================
# 诊断建议相关模型
# ============================================

class CheckItem(BaseModel):
    """检查项目"""
    name: str = Field(..., description="项目名称")
    urgency: CheckItemUrgency = Field(..., description="紧急程度")
    reason: str = Field(..., description="建议原因")
    expected_days: int = Field(
        ...,
        description="建议完成周期（天数）"
    )


class DiagnosticRecommendation(BaseModel):
    """诊断建议"""
    condition: str = Field(..., description="诊断方向或疾病")
    likelihood: str = Field(
        ...,
        description="可能性：possible, likely, probable"
    )
    basis: str = Field(..., description="建议依据（基于的指标和数据）")
    supporting_evidence: List[str] = Field(
        ...,
        description="支持证据列表"
    )


class DiagnosticAdviceRequest(BaseModel):
    """诊断建议请求"""
    user_id: str = Field(..., description="用户 ID")
    age: int = Field(..., ge=1, le=120, description="年龄")
    gender: Optional[str] = Field(None, description="性别")

    # 临床信息
    diseases: Optional[List[str]] = Field(None, description="已有疾病")
    current_symptoms: Optional[List[str]] = Field(
        None,
        description="当前症状或不适"
    )

    # 检查数据
    health_metrics: Dict[str, float] = Field(
        ...,
        description="健康指标"
    )

    # 检查结果
    recent_tests: Optional[Dict[str, Any]] = Field(
        None,
        description="最近检查结果"
    )

    # 用药情况
    current_medications: Optional[List[str]] = Field(
        None,
        description="当前用药"
    )

    class Config:
        json_schema_extra = {
            "example": {
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
        }


class DiagnosticAdviceResponse(BaseModel):
    """诊断建议响应"""
    user_id: str = Field(..., description="用户 ID")
    recommendations: List[DiagnosticRecommendation] = Field(
        ...,
        description="诊断建议列表（按优先级排序）"
    )
    priority_checks: List[CheckItem] = Field(
        ...,
        description="优先级检查项目"
    )
    differential_diagnosis: str = Field(
        ...,
        description="鉴别诊断的详细说明"
    )
    next_steps: List[str] = Field(
        ...,
        description="下一步诊疗步骤"
    )
    disclaimer: str = Field(
        default="此建议仅供参考，不能替代医生诊断。请根据患者具体情况和专业医学判断作出最终诊疗决策。",
        description="免责声明"
    )
    generated_at: str = Field(..., description="生成时间")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_123",
                "recommendations": [
                    {
                        "condition": "高血压危象",
                        "likelihood": "probable",
                        "basis": "血压显著升高（160/100 mmHg），伴有头晕头痛症状",
                        "supporting_evidence": ["收缩压 160 mmHg", "舒张压 100 mmHg", "症状性高血压"]
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
                "differential_diagnosis": "患者表现为继发性高血压的可能性...",
                "next_steps": ["立即进行基础检查", "评估用药方案调整"],
                "disclaimer": "此建议仅供参考，不能替代医生诊断...",
                "generated_at": "2024-12-25T10:30:00Z"
            }
        }


# ============================================
# 用药建议相关模型
# ============================================

class MedicationAdviceRequest(BaseModel):
    """用药建议请求"""
    user_id: str = Field(..., description="用户 ID")
    age: int = Field(..., ge=1, le=120, description="年龄")

    # 患者信息
    diseases: List[str] = Field(..., description="诊断疾病")
    allergies: Optional[List[str]] = Field(None, description="药物过敏列表")

    # 当前用药
    current_medications: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="当前用药列表（包括用法用量）"
    )

    # 健康指标
    health_metrics: Dict[str, float] = Field(
        ...,
        description="相关健康指标"
    )

    # 肝肾功能
    renal_function: Optional[str] = Field(
        None,
        description="肾功能状态：normal, impaired, severe"
    )
    hepatic_function: Optional[str] = Field(
        None,
        description="肝功能状态：normal, impaired, severe"
    )

    class Config:
        json_schema_extra = {
            "example": {
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
        }


class MedicationAdviceResponse(BaseModel):
    """用药建议响应"""
    user_id: str = Field(..., description="用户 ID")
    medication_plan: str = Field(..., description="用药方案概述")
    recommendations: List[Dict[str, Any]] = Field(
        ...,
        description="具体用药建议（包括药物、用法用量等）"
    )
    drug_interactions: Optional[List[str]] = Field(
        None,
        description="药物相互作用警示"
    )
    dosage_adjustments: Optional[List[str]] = Field(
        None,
        description="剂量调整建议"
    )
    precautions: List[str] = Field(
        ...,
        description="用药注意事项"
    )
    side_effects: Optional[List[str]] = Field(
        None,
        description="常见副作用及处理方法"
    )
    disclaimer: str = Field(
        default="此建议仅供参考，必须遵医嘱用药。请在医生或药师指导下用药。",
        description="免责声明"
    )
    generated_at: str = Field(..., description="生成时间")

    class Config:
        json_schema_extra = {
            "example": {
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
                "precautions": ["餐前半小时服用", "避免高脂饮食"],
                "generated_at": "2024-12-25T10:30:00Z"
            }
        }


# ============================================
# 生活方式建议相关模型
# ============================================

class LifestyleAdviceRequest(BaseModel):
    """生活方式建议请求"""
    user_id: str = Field(..., description="用户 ID")
    age: int = Field(..., ge=1, le=120, description="年龄")
    gender: Optional[str] = Field(None, description="性别")

    # 疾病信息
    diseases: List[str] = Field(..., description="诊断疾病")

    # 当前生活方式
    current_lifestyle: Dict[str, Any] = Field(
        ...,
        description="当前生活方式（饮食、运动、作息等）"
    )

    # 健康指标
    health_metrics: Dict[str, float] = Field(
        ...,
        description="相关健康指标"
    )

    # 患者条件
    physical_condition: Optional[str] = Field(
        None,
        description="身体状况：good, fair, poor"
    )

    class Config:
        json_schema_extra = {
            "example": {
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
        }


class LifestyleAdviceResponse(BaseModel):
    """生活方式建议响应"""
    user_id: str = Field(..., description="用户 ID")

    # 饮食建议
    diet_advice: Dict[str, Any] = Field(
        ...,
        description="饮食建议"
    )

    # 运动建议
    exercise_advice: Dict[str, Any] = Field(
        ...,
        description="运动建议"
    )

    # 作息建议
    sleep_advice: Dict[str, Any] = Field(
        ...,
        description="睡眠作息建议"
    )

    # 心理健康建议
    mental_health_advice: Optional[Dict[str, Any]] = Field(
        None,
        description="心理健康建议"
    )

    # 整体生活方式改善计划
    improvement_plan: str = Field(
        ...,
        description="整体改善计划描述"
    )

    # 实施建议
    implementation_tips: List[str] = Field(
        ...,
        description="实施建议和技巧"
    )

    generated_at: str = Field(..., description="生成时间")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_123",
                "diet_advice": {
                    "recommendations": ["减少盐分摄入", "增加纤维素"],
                    "foods_to_eat": ["绿叶蔬菜", "全谷物"],
                    "foods_to_avoid": ["腌制食品", "油炸食品"]
                },
                "exercise_advice": {
                    "type": "有氧运动",
                    "frequency": "每周5次",
                    "duration": "30分钟/次",
                    "intensity": "中等强度",
                    "precautions": ["避免剧烈运动"]
                },
                "sleep_advice": {
                    "target_hours": 7-9,
                    "bedtime": "23:00",
                    "wake_time": "07:00",
                    "tips": ["避免睡前喝咖啡"]
                },
                "improvement_plan": "通过系统的饮食调整、适当运动和规律作息...",
                "implementation_tips": ["制定每周运动计划", "记录日常饮食"],
                "generated_at": "2024-12-25T10:30:00Z"
            }
        }


# ============================================
# 综合诊断报告相关模型
# ============================================

class ComprehensiveDiagnosisReportRequest(BaseModel):
    """综合诊断报告请求"""
    user_id: str = Field(..., description="用户 ID")
    age: int = Field(..., ge=1, le=120, description="年龄")
    gender: Optional[str] = Field(None, description="性别")

    # 完整患者数据
    diseases: Optional[List[str]] = Field(None, description="已有疾病")
    recent_metrics: List[HealthMetric] = Field(
        ...,
        description="最近健康指标"
    )
    checkin_stats: Optional[Dict[str, int]] = Field(None, description="打卡统计")
    trends: Optional[List[TrendData]] = Field(None, description="趋势数据")
    current_medications: Optional[List[str]] = Field(None, description="当前用药")
    current_lifestyle: Optional[Dict[str, Any]] = Field(None, description="生活方式")
    current_symptoms: Optional[List[str]] = Field(None, description="当前症状")


class ComprehensiveDiagnosisReportResponse(BaseModel):
    """综合诊断报告响应"""
    user_id: str = Field(..., description="用户 ID")

    # 各部分内容
    health_summary: str = Field(..., description="健康摘要")
    risk_assessment: Dict[str, Any] = Field(..., description="风险评估结果")
    diagnostic_recommendations: List[Dict[str, Any]] = Field(
        ...,
        description="诊断建议"
    )
    medication_advice: Dict[str, Any] = Field(..., description="用药建议")
    lifestyle_advice: Dict[str, Any] = Field(..., description="生活方式建议")

    # 报告元数据
    report_type: str = Field(default="comprehensive", description="报告类型")
    generated_at: str = Field(..., description="生成时间")
    validity_days: int = Field(default=30, description="有效期（天数）")


# ============================================
# 错误响应模型
# ============================================

class ErrorResponse(BaseModel):
    """错误响应"""
    error: str = Field(..., description="错误信息")
    details: Optional[str] = Field(None, description="错误详情")
    timestamp: str = Field(..., description="错误时间戳")
