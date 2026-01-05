"""
Agent 数据模型

定义 Agent 相关的请求和响应模型
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class ChatRequest(BaseModel):
    """对话请求"""
    user_id: str = Field(..., description="用户 ID")
    session_id: Optional[str] = Field(default=None, description="会话 ID，不提供则创建新会话")
    message: str = Field(..., description="用户消息")
    use_rag: bool = Field(default=True, description="是否使用 RAG")
    patient_context: Optional[Dict[str, Any]] = Field(default=None, description="患者上下文信息")


class ChatResponse(BaseModel):
    """对话响应"""
    session_id: str = Field(..., description="会话 ID")
    message: str = Field(..., description="AI 回复")
    intent: str = Field(..., description="识别的意图")
    confidence: float = Field(..., description="意图置信度")
    sources: Optional[List[Dict[str, Any]]] = Field(default=None, description="参考来源（RAG）")
    usage: Optional[Dict[str, Any]] = Field(default=None, description="Token 使用统计")


class SessionInfoResponse(BaseModel):
    """会话信息响应"""
    id: str = Field(..., description="会话 ID")
    user_id: str = Field(..., description="用户 ID")
    message_count: int = Field(..., description="消息数量")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    last_message: Optional[str] = Field(default=None, description="最后一条消息")


class MessageHistoryItem(BaseModel):
    """消息历史项"""
    role: str = Field(..., description="角色（user/assistant）")
    content: str = Field(..., description="消息内容")
    timestamp: Optional[datetime] = Field(default=None, description="时间戳")


class SessionHistoryResponse(BaseModel):
    """会话历史响应"""
    session_id: str = Field(..., description="会话 ID")
    messages: List[MessageHistoryItem] = Field(..., description="消息列表")
    count: int = Field(..., description="消息数量")


class CheckinRequest(BaseModel):
    """自然语言打卡请求"""
    user_id: str = Field(..., description="用户 ID")
    content: str = Field(..., description="打卡内容（自然语言）")


class CheckinResponse(BaseModel):
    """打卡响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    parsed_data: Optional[Dict[str, Any]] = Field(default=None, description="解析的打卡数据")
