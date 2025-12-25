"""
Agent 模块的 Pydantic 模型定义

定义 API 请求和响应的数据模型
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ==================== 请求模型 ====================


class ChatRequest(BaseModel):
    """对话请求"""

    message: str = Field(..., description="用户消息", min_length=1, max_length=1000)
    session_id: Optional[str] = Field(None, description="会话 ID（可选）")
    user_id: Optional[str] = Field(None, description="用户 ID（可选）")


class CheckinRequest(BaseModel):
    """自然语言打卡请求"""

    message: str = Field(..., description="打卡消息", min_length=1, max_length=500)
    user_id: str = Field(..., description="用户 ID")


# ==================== 响应模型 ====================


class ChatResponse(BaseModel):
    """对话响应"""

    session_id: str = Field(..., description="会话 ID")
    reply: str = Field(..., description="AI 回复")
    intent: str = Field(..., description="识别的用户意图")
    confidence: float = Field(..., description="置信度 (0-1)")
    data: Optional[Dict[str, Any]] = Field(None, description="附加数据（如打卡数据）")


class SessionInfoResponse(BaseModel):
    """会话信息响应"""

    session_id: str = Field(..., description="会话 ID")
    user_id: Optional[str] = Field(None, description="用户 ID")
    state: str = Field(..., description="对话状态")
    message_count: int = Field(..., description="消息数量")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")


class MessageResponse(BaseModel):
    """消息响应"""

    role: str = Field(..., description="消息角色 (user/assistant/system)")
    content: str = Field(..., description="消息内容")
    timestamp: str = Field(..., description="时间戳")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="消息元数据")


class SessionHistoryResponse(BaseModel):
    """会话历史响应"""

    session_id: str = Field(..., description="会话 ID")
    messages: List[MessageResponse] = Field(..., description="消息列表")
    total: int = Field(..., description="消息总数")


class CheckinResponse(BaseModel):
    """打卡响应"""

    success: bool = Field(..., description="打卡是否成功")
    message: str = Field(..., description="响应消息")
    checkin_type: Optional[str] = Field(None, description="打卡类型")
    data: Optional[Dict[str, Any]] = Field(None, description="打卡数据")


class ErrorResponse(BaseModel):
    """错误响应"""

    error: str = Field(..., description="错误类型")
    message: str = Field(..., description="错误消息")
    details: Optional[Dict[str, Any]] = Field(None, description="错误详情")


# ==================== 内部模型（用于服务间通信）====================


class IntentInfo(BaseModel):
    """意图信息"""

    intent: str = Field(..., description="意图类型")
    confidence: float = Field(..., description="置信度")
    entities: Dict[str, Any] = Field(default_factory=dict, description="提取的实体")


class CheckinData(BaseModel):
    """打卡数据"""

    checkin_type: str = Field(..., description="打卡类型")
    data: Dict[str, Any] = Field(..., description="打卡数据")
    notes: Optional[str] = Field(None, description="备注")
    timestamp: str = Field(..., description="打卡时间")
