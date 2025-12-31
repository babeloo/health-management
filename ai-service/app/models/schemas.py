"""
Pydantic Models for AI Service
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """聊天消息模型"""
    role: str = Field(..., description="角色: user/assistant/system")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    """AI对话请求"""
    message: str = Field(..., description="用户消息")
    conversation_id: Optional[str] = Field(None, description="对话ID")
    use_rag: bool = Field(True, description="是否使用RAG检索")


class ChatResponse(BaseModel):
    """AI对话响应"""
    conversation_id: str = Field(..., description="对话ID")
    message: str = Field(..., description="AI回复")
    sources: Optional[List[Dict[str, Any]]] = Field(None, description="RAG检索来源")


class Conversation(BaseModel):
    """对话历史"""
    id: str = Field(..., description="对话ID")
    user_id: str = Field(..., description="用户ID")
    messages: List[ChatMessage] = Field(default_factory=list, description="消息列表")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")


class Article(BaseModel):
    """科普文章"""
    id: str = Field(..., description="文章ID")
    title: str = Field(..., description="标题")
    content: str = Field(..., description="内容")
    category: str = Field(..., description="分类")
    tags: List[str] = Field(default_factory=list, description="标签")
    author: str = Field(..., description="作者")
    cover_image: Optional[str] = Field(None, description="封面图")
    views: int = Field(0, description="浏览量")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")


class ArticleListResponse(BaseModel):
    """文章列表响应"""
    total: int = Field(..., description="总数")
    items: List[Article] = Field(..., description="文章列表")
    page: int = Field(..., description="当前页")
    page_size: int = Field(..., description="每页数量")


class FavoriteRequest(BaseModel):
    """收藏请求"""
    pass


class ErrorResponse(BaseModel):
    """错误响应"""
    error: str = Field(..., description="错误类型")
    message: str = Field(..., description="错误信息")
    details: Optional[Dict[str, Any]] = Field(None, description="详细信息")
