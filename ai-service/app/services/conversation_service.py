"""
对话上下文管理服务

提供对话历史存储、上下文管理、会话管理功能
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from loguru import logger
from pydantic import BaseModel, Field

from app.services.redis_service import get_redis_service


class ConversationState(str, Enum):
    """对话状态枚举"""

    WAITING_INPUT = "waiting_input"  # 等待用户输入
    PROCESSING = "processing"  # 处理中
    WAITING_CONFIRMATION = "waiting_confirmation"  # 等待确认
    COMPLETED = "completed"  # 已完成


class MessageRole(str, Enum):
    """消息角色枚举"""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ConversationMessage(BaseModel):
    """对话消息模型"""

    role: MessageRole = Field(..., description="消息角色")
    content: str = Field(..., description="消息内容")
    timestamp: str = Field(
        default_factory=lambda: datetime.now().isoformat(), description="时间戳"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict, description="消息元数据")


class ConversationSession(BaseModel):
    """对话会话模型"""

    session_id: str = Field(..., description="会话 ID")
    user_id: Optional[str] = Field(None, description="用户 ID")
    state: ConversationState = Field(
        default=ConversationState.WAITING_INPUT, description="对话状态"
    )
    messages: List[ConversationMessage] = Field(
        default_factory=list, description="对话消息列表"
    )
    context: Dict[str, Any] = Field(default_factory=dict, description="对话上下文")
    created_at: str = Field(
        default_factory=lambda: datetime.now().isoformat(), description="创建时间"
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now().isoformat(), description="更新时间"
    )


class ConversationService:
    """
    对话上下文管理服务

    提供对话历史存储、上下文管理、会话管理功能
    使用 Redis 存储对话数据，TTL 24小时
    """

    def __init__(self, max_context_messages: int = 10, ttl: int = 86400):
        """
        初始化对话服务

        Args:
            max_context_messages: 最大上下文消息数量（默认 10 轮）
            ttl: 会话过期时间（秒，默认 24 小时）
        """
        self.redis_service = get_redis_service()
        self.max_context_messages = max_context_messages
        self.ttl = ttl
        self.key_prefix = "conversation:session:"
        logger.info(
            f"ConversationService initialized: max_context={max_context_messages}, ttl={ttl}s"
        )

    def _get_session_key(self, session_id: str) -> str:
        """生成会话 Redis 键"""
        return f"{self.key_prefix}{session_id}"

    async def create_session(
        self,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> ConversationSession:
        """
        创建新对话会话

        Args:
            user_id: 用户 ID（可选）
            session_id: 会话 ID（可选，不提供则自动生成）

        Returns:
            ConversationSession: 对话会话对象
        """
        if not session_id:
            session_id = str(uuid.uuid4())

        session = ConversationSession(
            session_id=session_id,
            user_id=user_id,
        )

        # 保存到 Redis
        key = self._get_session_key(session_id)
        await self.redis_service.set(key, session.model_dump(), ttl=self.ttl)

        logger.info(f"Created conversation session: {session_id}")
        return session

    async def get_session(self, session_id: str) -> Optional[ConversationSession]:
        """
        获取对话会话

        Args:
            session_id: 会话 ID

        Returns:
            ConversationSession: 对话会话对象，不存在返回 None
        """
        key = self._get_session_key(session_id)
        data = await self.redis_service.get(key)

        if not data:
            logger.warning(f"Session not found: {session_id}")
            return None

        return ConversationSession(**data)

    async def update_session(self, session: ConversationSession) -> bool:
        """
        更新对话会话

        Args:
            session: 对话会话对象

        Returns:
            bool: 更新成功返回 True
        """
        session.updated_at = datetime.now().isoformat()
        key = self._get_session_key(session.session_id)
        success = await self.redis_service.set(key, session.model_dump(), ttl=self.ttl)

        if success:
            logger.debug(f"Updated session: {session.session_id}")
        return success

    async def delete_session(self, session_id: str) -> bool:
        """
        删除对话会话

        Args:
            session_id: 会话 ID

        Returns:
            bool: 删除成功返回 True
        """
        key = self._get_session_key(session_id)
        count = await self.redis_service.delete(key)
        success = count > 0

        if success:
            logger.info(f"Deleted session: {session_id}")
        return success

    async def add_message(
        self,
        session_id: str,
        role: MessageRole,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[ConversationSession]:
        """
        添加消息到会话

        Args:
            session_id: 会话 ID
            role: 消息角色
            content: 消息内容
            metadata: 消息元数据（可选）

        Returns:
            ConversationSession: 更新后的会话对象，失败返回 None
        """
        session = await self.get_session(session_id)
        if not session:
            logger.error(f"Cannot add message: session not found {session_id}")
            return None

        # 创建消息
        message = ConversationMessage(
            role=role,
            content=content,
            metadata=metadata or {},
        )

        # 添加到消息列表
        session.messages.append(message)

        # 限制上下文长度（保留最近的消息）
        if len(session.messages) > self.max_context_messages:
            # 保留 system 消息和最近的对话
            system_messages = [m for m in session.messages if m.role == MessageRole.SYSTEM]
            recent_messages = [
                m for m in session.messages if m.role != MessageRole.SYSTEM
            ][-self.max_context_messages :]
            session.messages = system_messages + recent_messages
            logger.debug(
                f"Trimmed session messages: kept {len(session.messages)} messages"
            )

        # 更新会话
        await self.update_session(session)
        return session

    async def get_messages(
        self,
        session_id: str,
        limit: Optional[int] = None,
    ) -> List[ConversationMessage]:
        """
        获取会话消息列表

        Args:
            session_id: 会话 ID
            limit: 最大返回数量（可选）

        Returns:
            List[ConversationMessage]: 消息列表
        """
        session = await self.get_session(session_id)
        if not session:
            return []

        messages = session.messages
        if limit:
            messages = messages[-limit:]

        return messages

    async def get_context_messages(
        self, session_id: str
    ) -> List[Dict[str, str]]:
        """
        获取上下文消息（用于 LLM API 调用）

        Args:
            session_id: 会话 ID

        Returns:
            List[Dict[str, str]]: 格式化的消息列表 [{"role": "user", "content": "..."}]
        """
        messages = await self.get_messages(session_id)
        return [{"role": m.role.value, "content": m.content} for m in messages]

    async def update_state(
        self, session_id: str, state: ConversationState
    ) -> Optional[ConversationSession]:
        """
        更新对话状态

        Args:
            session_id: 会话 ID
            state: 新状态

        Returns:
            ConversationSession: 更新后的会话对象，失败返回 None
        """
        session = await self.get_session(session_id)
        if not session:
            logger.error(f"Cannot update state: session not found {session_id}")
            return None

        old_state = session.state
        session.state = state
        await self.update_session(session)

        logger.info(f"Session state changed: {session_id} {old_state} -> {state}")
        return session

    async def update_context(
        self, session_id: str, context_updates: Dict[str, Any]
    ) -> Optional[ConversationSession]:
        """
        更新对话上下文

        Args:
            session_id: 会话 ID
            context_updates: 上下文更新字典

        Returns:
            ConversationSession: 更新后的会话对象，失败返回 None
        """
        session = await self.get_session(session_id)
        if not session:
            logger.error(f"Cannot update context: session not found {session_id}")
            return None

        session.context.update(context_updates)
        await self.update_session(session)

        logger.debug(f"Session context updated: {session_id}")
        return session

    async def clear_messages(self, session_id: str) -> bool:
        """
        清空会话消息（保留会话）

        Args:
            session_id: 会话 ID

        Returns:
            bool: 清空成功返回 True
        """
        session = await self.get_session(session_id)
        if not session:
            return False

        session.messages = []
        await self.update_session(session)

        logger.info(f"Cleared session messages: {session_id}")
        return True

    async def session_exists(self, session_id: str) -> bool:
        """
        检查会话是否存在

        Args:
            session_id: 会话 ID

        Returns:
            bool: 存在返回 True
        """
        key = self._get_session_key(session_id)
        return await self.redis_service.exists(key)


# 全局单例
_conversation_service: Optional[ConversationService] = None


def get_conversation_service() -> ConversationService:
    """
    获取对话服务实例（单例模式）

    Returns:
        ConversationService: 对话服务实例
    """
    global _conversation_service
    if _conversation_service is None:
        _conversation_service = ConversationService()
    return _conversation_service
