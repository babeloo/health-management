"""
AI API 路由

提供 AI 相关的 API 端点：
- POST /api/v1/ai/chat - 对话接口
- POST /api/v1/ai/health-advice - 健康建议
- POST /api/v1/ai/symptom-analysis - 症状分析
- POST /api/v1/ai/medication-guide - 用药指导
- POST /api/v1/ai/health-education - 健康科普
- POST /api/v1/ai/risk-assessment - 风险评估
- GET /api/v1/ai/usage - Token 使用统计
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from loguru import logger

from app.models.ai_models import (
    ChatRequest,
    ChatResponse,
    HealthAdviceRequest,
    HealthAdviceResponse,
    SymptomAnalysisRequest,
    SymptomAnalysisResponse,
    MedicationGuideRequest,
    MedicationGuideResponse,
    HealthEducationRequest,
    HealthEducationResponse,
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    UsageStatsResponse,
)
from app.services.ai_service import get_ai_service, AIServiceError


router = APIRouter(prefix="/ai", tags=["AI 服务"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="AI 对话",
    description="与 AI 助手进行对话，支持多轮对话和流式响应"
)
async def chat(request: ChatRequest):
    """
    AI 对话接口

    支持：
    - 普通对话
    - 多轮对话（传入 conversation_history）
    - 流式响应（设置 stream=true）
    """
    try:
        ai_service = get_ai_service()

        # 转换对话历史格式
        conversation_history = None
        if request.conversation_history:
            conversation_history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]

        # 流式响应
        if request.stream:
            async def generate():
                try:
                    async for chunk in ai_service.chat_stream(
                        message=request.message,
                        conversation_history=conversation_history,
                    ):
                        yield chunk
                except AIServiceError as e:
                    logger.error(f"Error in chat stream: {str(e)}")
                    yield f"\n\n[错误] {str(e)}"

            return StreamingResponse(
                generate(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )

        # 普通响应
        response = await ai_service.chat(
            message=request.message,
            conversation_history=conversation_history,
            stream=False,
        )

        return ChatResponse(**response)

    except AIServiceError as e:
        logger.error(f"AI service error in chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in chat endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )


@router.post(
    "/health-advice",
    response_model=HealthAdviceResponse,
    summary="生成健康建议",
    description="基于患者健康数据生成个性化的健康建议"
)
async def health_advice(request: HealthAdviceRequest):
    """
    生成健康建议接口

    根据患者的健康数据（打卡记录、检测数据等）生成个性化的饮食、运动、作息建议
    """
    try:
        ai_service = get_ai_service()

        # 转换健康数据格式
        health_data = request.health_data.dict(exclude_none=True)

        response = await ai_service.generate_health_advice(health_data)

        return HealthAdviceResponse(**response)

    except AIServiceError as e:
        logger.error(f"AI service error in health advice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in health advice endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )


@router.post(
    "/symptom-analysis",
    response_model=SymptomAnalysisResponse,
    summary="症状分析",
    description="分析患者症状，提供初步建议（不能替代医生诊断）"
)
async def symptom_analysis(request: SymptomAnalysisRequest):
    """
    症状分析接口

    根据症状描述和患者数据进行初步分析，评估风险等级并提供建议
    """
    try:
        ai_service = get_ai_service()

        # 转换患者数据格式
        patient_data = request.patient_data.dict(exclude_none=True)

        response = await ai_service.analyze_symptoms(
            symptoms=request.symptoms,
            patient_data=patient_data,
        )

        return SymptomAnalysisResponse(**response)

    except AIServiceError as e:
        logger.error(f"AI service error in symptom analysis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in symptom analysis endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )


@router.post(
    "/medication-guide",
    response_model=MedicationGuideResponse,
    summary="用药指导",
    description="提供药物的用法用量、注意事项等信息"
)
async def medication_guide(request: MedicationGuideRequest):
    """
    用药指导接口

    提供药物的作用、用法用量、注意事项、副作用等信息
    """
    try:
        ai_service = get_ai_service()

        response = await ai_service.generate_medication_guide(
            medication_name=request.medication_name,
            patient_info=request.patient_info,
        )

        return MedicationGuideResponse(**response)

    except AIServiceError as e:
        logger.error(f"AI service error in medication guide: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in medication guide endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )


@router.post(
    "/health-education",
    response_model=HealthEducationResponse,
    summary="健康科普",
    description="提供慢性病相关的健康科普内容"
)
async def health_education(request: HealthEducationRequest):
    """
    健康科普接口

    提供通俗易懂的健康科普内容，帮助患者了解慢性病相关知识
    """
    try:
        ai_service = get_ai_service()

        response = await ai_service.generate_health_education(
            topic=request.topic,
            patient_context=request.patient_context,
        )

        return HealthEducationResponse(**response)

    except AIServiceError as e:
        logger.error(f"AI service error in health education: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in health education endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )


@router.post(
    "/risk-assessment",
    response_model=RiskAssessmentResponse,
    summary="风险评估",
    description="评估患者的慢性病风险等级"
)
async def risk_assessment(request: RiskAssessmentRequest):
    """
    风险评估接口

    基于患者的健康数据评估风险等级，并提供预防建议
    """
    try:
        ai_service = get_ai_service()

        # 转换健康数据格式
        health_data = request.health_data.dict(exclude_none=True)

        response = await ai_service.assess_risk(health_data)

        return RiskAssessmentResponse(**response)

    except AIServiceError as e:
        logger.error(f"AI service error in risk assessment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in risk assessment endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )


@router.get(
    "/usage",
    response_model=UsageStatsResponse,
    summary="Token 使用统计",
    description="获取 DeepSeek API 的 Token 使用统计"
)
async def get_usage():
    """
    Token 使用统计接口

    返回当前服务的 Token 使用情况
    """
    try:
        ai_service = get_ai_service()
        stats = ai_service.get_usage_stats()

        return UsageStatsResponse(**stats)

    except Exception as e:
        logger.error(f"Error in usage stats endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )


@router.post(
    "/usage/reset",
    summary="重置使用统计",
    description="重置 Token 使用统计（仅用于测试）"
)
async def reset_usage():
    """
    重置使用统计接口（仅用于测试环境）

    将 Token 使用统计重置为 0
    """
    try:
        ai_service = get_ai_service()
        ai_service.reset_usage_stats()

        return {"message": "使用统计已重置"}

    except Exception as e:
        logger.error(f"Error in reset usage stats endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )
