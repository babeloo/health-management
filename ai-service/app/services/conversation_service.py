"""
Conversation Storage Service (MongoDB)
"""

from typing import List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.models import Conversation, ChatMessage
import uuid


class ConversationService:
    """对话历史存储服务"""

    def __init__(self):
        self.client = AsyncIOMotorClient(settings.mongodb_url)
        self.db = self.client[settings.mongodb_db_name]
        self.collection = self.db["conversations"]

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


# 全局实例
conversation_service = ConversationService()
