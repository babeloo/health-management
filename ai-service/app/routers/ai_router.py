"""
AI Chat Router
"""

from fastapi import APIRouter, HTTPException, Depends
from app.models import ChatRequest, ChatResponse, ChatMessage, Conversation, ErrorResponse
from app.services import ai_service, conversation_service
from app.middleware import get_current_user, JWTUser

router = APIRouter(prefix="/api/v1/ai", tags=["AI"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, current_user: JWTUser = Depends(get_current_user)):
    """
    AI健康问答对话

    - 支持RAG知识库检索
    - 自动添加免责声明
    - 保存对话历史
    - 需要JWT认证
    """
    try:
        user_id = current_user.user_id

        # 获取或创建对话
        if request.conversation_id:
            conversation = await conversation_service.get_conversation(request.conversation_id)
            if not conversation:
                raise HTTPException(status_code=404, detail="对话不存在")
        else:
            conversation = await conversation_service.create_conversation(user_id)

        # 添加用户消息
        user_message = ChatMessage(role="user", content=request.message)
        await conversation_service.add_message(conversation.id, user_message)

        # 构建对话历史
        messages = [ChatMessage(role=m.role, content=m.content) for m in conversation.messages]

        # 调用AI服务
        reply, sources = await ai_service.chat(messages=messages, use_rag=request.use_rag)

        # 保存AI回复
        assistant_message = ChatMessage(role="assistant", content=reply)
        await conversation_service.add_message(conversation.id, assistant_message)

        return ChatResponse(conversation_id=conversation.id, message=reply, sources=sources)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")


@router.get("/conversations")
async def get_conversations(
    current_user: JWTUser = Depends(get_current_user), limit: int = 20, skip: int = 0
):
    """
    获取用户的对话历史列表

    - 按更新时间倒序
    - 支持分页
    - 需要JWT认证
    """
    try:
        user_id = current_user.user_id
        conversations = await conversation_service.get_user_conversations(
            user_id, limit=limit, skip=skip
        )
        return {"conversations": conversations, "total": len(conversations)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取对话历史失败: {str(e)}")


@router.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str, current_user: JWTUser = Depends(get_current_user)):
    """
    获取对话详情

    - 仅允许访问自己的对话
    - 需要JWT认证
    """
    conversation = await conversation_service.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")

    if conversation.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="无权访问该对话")

    return conversation
