"""
AI Agent API 端点

提供对话、会话管理、自然语言打卡等 API
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, status
from loguru import logger

from app.models.agent_models import (
    ChatRequest,
    ChatResponse,
    CheckinRequest,
    CheckinResponse,
    ErrorResponse,
    MessageResponse,
    SessionHistoryResponse,
    SessionInfoResponse,
)
from app.services.agent_service import get_agent_service
from app.services.conversation_service import get_conversation_service

router = APIRouter(prefix="/agent", tags=["AI Agent"])

# 获取服务实例
agent_service = get_agent_service()
conversation_service = get_conversation_service()


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="AI 对话",
    description="发送消息给 AI Agent，获取智能回复",
)
async def chat(request: ChatRequest):
    """
    AI 对话端点

    支持：
    - 健康咨询
    - 症状分析
    - 用药咨询
    - 自然语言打卡
    - 闲聊

    Args:
        request: 对话请求

    Returns:
        ChatResponse: AI 回复
    """
    try:
        logger.info(
            f"Chat request: message={request.message[:50]}..., session_id={request.session_id}"
        )

        result = await agent_service.chat(
            user_input=request.message,
            session_id=request.session_id,
            user_id=request.user_id,
        )

        return ChatResponse(
            session_id=result["session_id"],
            reply=result["reply"],
            intent=result["intent"],
            confidence=result["confidence"],
            data=result.get("data"),
        )

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"对话处理失败: {str(e)}",
        )


@router.get(
    "/sessions/{session_id}",
    response_model=SessionInfoResponse,
    summary="获取会话信息",
    description="获取指定会话的基本信息",
)
async def get_session_info(session_id: str):
    """
    获取会话信息

    Args:
        session_id: 会话 ID

    Returns:
        SessionInfoResponse: 会话信息
    """
    try:
        session = await conversation_service.get_session(session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"会话不存在: {session_id}",
            )

        return SessionInfoResponse(
            session_id=session.session_id,
            user_id=session.user_id,
            state=session.state.value,
            message_count=len(session.messages),
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取会话信息失败: {str(e)}",
        )


@router.get(
    "/sessions/{session_id}/history",
    response_model=SessionHistoryResponse,
    summary="获取会话历史",
    description="获取指定会话的对话历史记录",
)
async def get_session_history(session_id: str, limit: Optional[int] = None):
    """
    获取会话历史

    Args:
        session_id: 会话 ID
        limit: 返回消息数量限制（可选）

    Returns:
        SessionHistoryResponse: 会话历史
    """
    try:
        session = await conversation_service.get_session(session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"会话不存在: {session_id}",
            )

        messages = await conversation_service.get_messages(session_id, limit=limit)

        message_responses = [
            MessageResponse(
                role=msg.role.value,
                content=msg.content,
                timestamp=msg.timestamp,
                metadata=msg.metadata,
            )
            for msg in messages
        ]

        return SessionHistoryResponse(
            session_id=session_id,
            messages=message_responses,
            total=len(session.messages),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session history error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取会话历史失败: {str(e)}",
        )


@router.delete(
    "/sessions/{session_id}",
    summary="清空会话",
    description="清空指定会话的所有消息",
)
async def clear_session(session_id: str):
    """
    清空会话

    Args:
        session_id: 会话 ID

    Returns:
        成功消息
    """
    try:
        success = await conversation_service.clear_messages(session_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"会话不存在: {session_id}",
            )

        return {
            "message": "会话已清空",
            "session_id": session_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clear session error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"清空会话失败: {str(e)}",
        )


@router.delete(
    "/sessions/{session_id}/delete",
    summary="删除会话",
    description="完全删除指定会话",
)
async def delete_session(session_id: str):
    """
    删除会话

    Args:
        session_id: 会话 ID

    Returns:
        成功消息
    """
    try:
        success = await conversation_service.delete_session(session_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"会话不存在: {session_id}",
            )

        return {
            "message": "会话已删除",
            "session_id": session_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete session error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除会话失败: {str(e)}",
        )


@router.post(
    "/checkin",
    response_model=CheckinResponse,
    summary="自然语言打卡",
    description="通过自然语言描述进行健康数据打卡",
)
async def natural_language_checkin(request: CheckinRequest):
    """
    自然语言打卡

    支持：
    - 血压打卡："今天血压 130/80"
    - 血糖打卡："空腹血糖 5.6"
    - 用药打卡："已服药"
    - 运动打卡："跑步 30 分钟"
    - 饮食打卡："吃了早餐"

    Args:
        request: 打卡请求

    Returns:
        CheckinResponse: 打卡结果
    """
    try:
        logger.info(f"Checkin request: user_id={request.user_id}, message={request.message}")

        # 使用 Agent 处理打卡
        result = await agent_service.chat(
            user_input=request.message,
            user_id=request.user_id,
        )

        # 检查是否成功识别为打卡
        is_checkin = result.get("data") is not None
        checkin_type = result.get("data", {}).get("checkin_type") if is_checkin else None

        return CheckinResponse(
            success=is_checkin,
            message=result["reply"],
            checkin_type=checkin_type,
            data=result.get("data"),
        )

    except Exception as e:
        logger.error(f"Checkin error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"打卡处理失败: {str(e)}",
        )


@router.get(
    "/health",
    summary="健康检查",
    description="检查 Agent 服务状态",
)
async def health_check():
    """
    健康检查端点

    Returns:
        服务状态信息
    """
    try:
        # 检查 Redis 连接
        from app.services.redis_service import get_redis_service

        redis_service = get_redis_service()
        redis_ok = await redis_service.ping()

        return {
            "status": "healthy" if redis_ok else "degraded",
            "redis": "ok" if redis_ok else "error",
            "message": "Agent 服务运行正常" if redis_ok else "Redis 连接异常",
        }

    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
        }
