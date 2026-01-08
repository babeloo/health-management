"""
Conversation Storage Service (MongoDB)

增强版会话管理服务，支持：
- 上下文窗口管理（最近 N 条消息）
- 会话过期清理
- 会话摘要生成
"""

from typing import List, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from loguru import logger
from app.config import settings
from app.models import Conversation, ChatMessage
import uuid


class ConversationService:
    """对话历史存储服务"""

    def __init__(self):
        self.client = AsyncIOMotorClient(settings.mongodb_url)
        self.db = self.client[settings.mongodb_db_name]
        self.collection = self.db["conversations"]
        self.max_context_messages = 10  # 上下文窗口大小
        self.session_expiry_days = 30  # 会话过期天数
        logger.info("Conversation service initialized")

    async def create_conversation(self, user_id: str) -> Conversation:
        """创建新对话"""
        conversation = Conversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        await self.collection.insert_one(conversation.model_dump())
        return conversation

    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """获取对话"""
        doc = await self.collection.find_one({"id": conversation_id})
        if doc:
            return Conversation(**doc)
        return None

    async def get_user_conversations(
        self, user_id: str, limit: int = 20, skip: int = 0
    ) -> List[Conversation]:
        """获取用户的对话列表"""
        cursor = (
            self.collection.find({"user_id": user_id})
            .sort("updated_at", -1)
            .skip(skip)
            .limit(limit)
        )

        conversations = []
        async for doc in cursor:
            conversations.append(Conversation(**doc))

        return conversations

    async def add_message(
        self, conversation_id: str, message: ChatMessage
    ) -> Optional[Conversation]:
        """添加消息到对话"""
        result = await self.collection.update_one(
            {"id": conversation_id},
            {
                "$push": {"messages": message.model_dump()},
                "$set": {"updated_at": datetime.now()},
            },
        )

        if result.modified_count > 0:
            return await self.get_conversation(conversation_id)
        return None

    async def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话"""
        result = await self.collection.delete_one({"id": conversation_id})
        return result.deleted_count > 0

    async def get_context_messages(
        self, conversation_id: str, max_messages: Optional[int] = None
    ) -> List[ChatMessage]:
        """
        获取上下文消息（最近 N 条）

        Args:
            conversation_id: 对话 ID
            max_messages: 最大消息数量，默认使用配置值

        Returns:
            消息列表
        """
        max_messages = max_messages or self.max_context_messages
        conversation = await self.get_conversation(conversation_id)

        if not conversation or not conversation.messages:
            return []

        # 返回最近的 N 条消息
        return conversation.messages[-max_messages:]

    async def clear_old_messages(self, conversation_id: str, keep_recent: int = 10) -> bool:
        """
        清理旧消息，只保留最近的 N 条

        Args:
            conversation_id: 对话 ID
            keep_recent: 保留的消息数量

        Returns:
            是否成功
        """
        conversation = await self.get_conversation(conversation_id)

        if not conversation or len(conversation.messages) <= keep_recent:
            return True

        # 保留最近的消息
        recent_messages = conversation.messages[-keep_recent:]

        result = await self.collection.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "messages": [msg.model_dump() for msg in recent_messages],
                    "updated_at": datetime.now(),
                }
            },
        )

        return result.modified_count > 0

    async def cleanup_expired_sessions(self) -> int:
        """
        清理过期会话

        Returns:
            清理的会话数量
        """
        expiry_date = datetime.now() - timedelta(days=self.session_expiry_days)

        result = await self.collection.delete_many({"updated_at": {"$lt": expiry_date}})

        deleted_count = result.deleted_count
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} expired sessions")

        return deleted_count

    async def get_session_info(self, conversation_id: str) -> Optional[dict]:
        """
        获取会话信息

        Args:
            conversation_id: 对话 ID

        Returns:
            会话信息字典
        """
        conversation = await self.get_conversation(conversation_id)

        if not conversation:
            return None

        return {
            "id": conversation.id,
            "user_id": conversation.user_id,
            "message_count": len(conversation.messages),
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
            "last_message": conversation.messages[-1].content if conversation.messages else None,
        }


# 全局实例
conversation_service = ConversationService()
