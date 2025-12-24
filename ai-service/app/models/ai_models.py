"""
AI API 数据模型

定义 AI 相关 API 的请求和响应模型
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, validator


# ============================================
# 对话相关模型
# ============================================

class ChatMessage(BaseModel):
    """对话消息模型"""
    role: str = Field(..., description="角色：user 或 assistant")
    content: str = Field(..., description="消息内容")

    @validator("role")
    def validate_role(cls, v):
        if v not in ["user", "assistant"]:
            raise ValueError("role 必须是 user 或 assistant")
        return v


class ChatRequest(BaseModel):
    """对话请求模型"""
    message: str = Field(..., min_length=1, max_length=2000, description="用户消息")
    conversation_history: Optional[List[ChatMessage]] = Field(
        default=None,
        description="对话历史（可选），最多保留最近 10 条"
    )
    stream: bool = Field(default=False, description="是否使用流式响应")

    @validator("conversation_history")
    def validate_history_length(cls, v):
        if v and len(v) > 10:
            raise ValueError("对话历史最多保留 10 条")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "message": "高血压患者应该注意什么？",
                "conversation_history": [
                    {"role": "user", "content": "你好"},
                    {"role": "assistant", "content": "你好！我是健康助手，有什么可以帮助你的吗？"}
                ],
                "stream": False
            }
        }


class ChatResponse(BaseModel):
    """对话响应模型"""
    content: str = Field(..., description="AI 回复内容")
    finish_reason: str = Field(..., description="完成原因：stop, length, etc.")
    usage: Dict[str, int] = Field(..., description="Token 使用统计")

    class Config:
        json_schema_extra = {
            "example": {
                "content": "高血压患者需要注意以下几点...\n\n【免责声明】此建议仅供参考，请咨询专业医生。",
                "finish_reason": "stop",
                "usage": {
                    "prompt_tokens": 50,
                    "completion_tokens": 200,
                    "total_tokens": 250
                }
            }
        }


# ============================================
# 健康建议相关模型
# ============================================

class HealthDataInput(BaseModel):
    """健康数据输入模型"""
    age: int = Field(..., ge=1, le=120, description="年龄")
    gender: Optional[str] = Field(None, description="性别：male 或 female")
    diseases: Optional[List[str]] = Field(default=None, description="已有疾病列表")
    recent_check_ins: Optional[Dict[str, int]] = Field(
        default=None,
        description="最近打卡统计（近7天）"
    )
    average_bp: Optional[Dict[str, float]] = Field(
        default=None,
        description="平均血压数据"
    )
    risk_level: Optional[str] = Field(None, description="风险等级：low, medium, high")
    bmi: Optional[float] = Field(None, ge=10, le=60, description="BMI 指数")
    health_metrics: Optional[Dict[str, Any]] = Field(
        default=None,
        description="健康指标（近30天平均）"
    )
    lifestyle: Optional[Dict[str, Any]] = Field(default=None, description="生活方式信息")

    @validator("gender")
    def validate_gender(cls, v):
        if v and v not in ["male", "female"]:
            raise ValueError("gender 必须是 male 或 female")
        return v

    @validator("risk_level")
    def validate_risk_level(cls, v):
        if v and v not in ["low", "medium", "high"]:
            raise ValueError("risk_level 必须是 low, medium 或 high")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "age": 45,
                "gender": "male",
                "diseases": ["高血压"],
                "recent_check_ins": {
                    "blood_pressure": 5,
                    "medication": 7,
                    "exercise": 3
                },
                "average_bp": {
                    "systolic": 145,
                    "diastolic": 90
                },
                "risk_level": "medium"
            }
        }


class HealthAdviceRequest(BaseModel):
    """健康建议请求模型"""
    health_data: HealthDataInput = Field(..., description="患者健康数据")

    class Config:
        json_schema_extra = {
            "example": {
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
        }


class HealthAdviceResponse(BaseModel):
    """健康建议响应模型"""
    advice: str = Field(..., description="健康建议内容")
    finish_reason: str = Field(..., description="完成原因")
    usage: Dict[str, int] = Field(..., description="Token 使用统计")

    class Config:
        json_schema_extra = {
            "example": {
                "advice": "基于您的健康数据，建议：\n1. 饮食方面...\n\n【免责声明】此建议仅供参考，请咨询专业医生。",
                "finish_reason": "stop",
                "usage": {
                    "prompt_tokens": 150,
                    "completion_tokens": 300,
                    "total_tokens": 450
                }
            }
        }


# ============================================
# 症状分析相关模型
# ============================================

class PatientDataInput(BaseModel):
    """患者数据输入模型"""
    age: Optional[int] = Field(None, ge=1, le=120, description="年龄")
    gender: Optional[str] = Field(None, description="性别：male 或 female")
    diseases: Optional[List[str]] = Field(default=None, description="已有疾病")
    recent_data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="最近健康数据"
    )

    @validator("gender")
    def validate_gender(cls, v):
        if v and v not in ["male", "female"]:
            raise ValueError("gender 必须是 male 或 female")
        return v


class SymptomAnalysisRequest(BaseModel):
    """症状分析请求模型"""
    symptoms: str = Field(..., min_length=1, max_length=1000, description="症状描述")
    patient_data: PatientDataInput = Field(..., description="患者数据")

    class Config:
        json_schema_extra = {
            "example": {
                "symptoms": "最近感觉头晕、头痛，特别是早上起床时",
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
        }


class SymptomAnalysisResponse(BaseModel):
    """症状分析响应模型"""
    analysis: str = Field(..., description="症状分析内容")
    finish_reason: str = Field(..., description="完成原因")
    usage: Dict[str, int] = Field(..., description="Token 使用统计")


# ============================================
# 用药指导相关模型
# ============================================

class MedicationGuideRequest(BaseModel):
    """用药指导请求模型"""
    medication_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="药物名称"
    )
    patient_info: Optional[Dict[str, Any]] = Field(
        default=None,
        description="患者信息（可选）"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "medication_name": "硝苯地平缓释片",
                "patient_info": {
                    "age": 55,
                    "diseases": ["高血压"]
                }
            }
        }


class MedicationGuideResponse(BaseModel):
    """用药指导响应模型"""
    guide: str = Field(..., description="用药指导内容")
    finish_reason: str = Field(..., description="完成原因")
    usage: Dict[str, int] = Field(..., description="Token 使用统计")


# ============================================
# 健康科普相关模型
# ============================================

class HealthEducationRequest(BaseModel):
    """健康科普请求模型"""
    topic: str = Field(..., min_length=1, max_length=200, description="科普主题")
    patient_context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="患者上下文信息（可选）"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "topic": "高血压饮食注意事项",
                "patient_context": {
                    "age": 45,
                    "diseases": ["高血压"]
                }
            }
        }


class HealthEducationResponse(BaseModel):
    """健康科普响应模型"""
    content: str = Field(..., description="科普内容")
    finish_reason: str = Field(..., description="完成原因")
    usage: Dict[str, int] = Field(..., description="Token 使用统计")


# ============================================
# 风险评估相关模型
# ============================================

class RiskAssessmentRequest(BaseModel):
    """风险评估请求模型"""
    health_data: HealthDataInput = Field(..., description="患者健康数据")


class RiskAssessmentResponse(BaseModel):
    """风险评估响应模型"""
    assessment: str = Field(..., description="风险评估内容")
    finish_reason: str = Field(..., description="完成原因")
    usage: Dict[str, int] = Field(..., description="Token 使用统计")


# ============================================
# Token 使用统计模型
# ============================================

class UsageStatsResponse(BaseModel):
    """Token 使用统计响应模型"""
    prompt_tokens: int = Field(..., description="Prompt tokens 总数")
    completion_tokens: int = Field(..., description="Completion tokens 总数")
    total_tokens: int = Field(..., description="总 tokens 数")
    requests: int = Field(..., description="请求总数")

    class Config:
        json_schema_extra = {
            "example": {
                "prompt_tokens": 5000,
                "completion_tokens": 10000,
                "total_tokens": 15000,
                "requests": 50
            }
        }
