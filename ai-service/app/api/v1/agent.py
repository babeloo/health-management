"""
Agent API 端点

提供 AI Agent 对话和会话管理接口
"""

from fastapi import APIRouter, HTTPException, status
from loguru import logger

from app.models.agent_models import (
    ChatRequest,
    ChatResponse,
    SessionInfoResponse,
    SessionHistoryResponse,
    MessageHistoryItem,
    CheckinRequest,
    CheckinResponse,
)
from app.services.agent_service import get_agent_service

router = APIRouter(prefix="/agent", tags=["Agent"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI 对话

    支持多轮对话、意图识别、RAG 增强回答
    """
    try:
        agent = get_agent_service()

        # 如果没有提供 session_id，会自动创建新会话
        session_id = request.session_id or ""

        result = await agent.chat(
            user_id=request.user_id,
            session_id=session_id,
            message=request.message,
            use_rag=request.use_rag,
            patient_context=request.patient_context,
        )

        return ChatResponse(**result)

    except Exception as e:
        logger.error(f"Chat failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {str(e)}",
        )


@router.get("/sessions/{session_id}", response_model=SessionInfoResponse)
async def get_session_info(session_id: str):
    """
    获取会话信息

    返回会话的基本信息，包括消息数量、创建时间等
    """
    try:
        agent = get_agent_service()
        info = await agent.get_session_info(session_id)

        if not info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        return SessionInfoResponse(**info)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get session info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session info: {str(e)}",
        )


@router.get("/sessions/{session_id}/history", response_model=SessionHistoryResponse)
async def get_session_history(session_id: str, limit: int = 50):
    """
    获取会话历史

    返回会话的消息历史记录
    """
    try:
        agent = get_agent_service()
        messages = await agent.get_session_history(session_id, limit=limit)

        if messages is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        history_items = [MessageHistoryItem(**msg) for msg in messages]

        return SessionHistoryResponse(
            session_id=session_id,
            messages=history_items,
            count=len(history_items),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get session history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session history: {str(e)}",
        )


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """
    删除会话

    删除指定的会话及其所有消息
    """
    try:
        agent = get_agent_service()
        success = await agent.delete_session(session_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        return {"message": f"Session {session_id} deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}",
        )


@router.post("/checkin", response_model=CheckinResponse)
async def checkin(request: CheckinRequest):
    """
    自然语言打卡

    用户可以用自然语言描述打卡内容，AI 会解析并记录

    注意：此功能需要与后端服务集成，当前仅返回解析结果
    """
    try:
        # TODO: 实现打卡解析逻辑
        # 这里需要调用 checkin_parser 服务解析自然语言
        # 然后调用后端 API 记录打卡数据

        return CheckinResponse(
            success=False,
            message="自然语言打卡功能正在开发中",
            parsed_data=None,
        )

    except Exception as e:
        logger.error(f"Checkin failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Checkin failed: {str(e)}",
        )
