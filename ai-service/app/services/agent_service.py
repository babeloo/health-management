"""
Agent 服务

AI Agent 核心服务，支持：
- 智能对话管理
- 多轮对话上下文维护
- 意图识别和路由
- RAG 增强回答
"""

from typing import Dict, Any, List, Optional
from loguru import logger

from app.services.deepseek_client import get_deepseek_client
from app.services.intent_service import get_intent_service, IntentType
from app.services.conversation_service import conversation_service
from app.services.rag_service import rag_service
from app.services.prompt_templates import PromptTemplates
from app.models import ChatMessage
from app.config import settings


class AgentService:
    """AI Agent 服务"""

    def __init__(self):
        self.deepseek = get_deepseek_client()
        self.intent_service = get_intent_service()
        self.disclaimer = settings.disclaimer_text
        logger.info("Agent service initialized")

    async def chat(
        self,
        user_id: str,
        session_id: str,
        message: str,
        use_rag: bool = True,
        patient_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        AI 对话

        Args:
            user_id: 用户 ID
            session_id: 会话 ID
            message: 用户消息
            use_rag: 是否使用 RAG
            patient_context: 患者上下文信息

        Returns:
            对话响应
        """
        try:
            # 1. 识别意图
            intent_result = await self.intent_service.recognize_intent(message)
            intent = intent_result.get("intent")
            confidence = intent_result.get("confidence", 0)

            logger.info(f"Intent: {intent}, Confidence: {confidence}")

            # 2. 获取或创建会话
            conversation = await conversation_service.get_conversation(session_id)
            if not conversation:
                conversation = await conversation_service.create_conversation(user_id)
                session_id = conversation.id

            # 3. 添加用户消息
            user_msg = ChatMessage(role="user", content=message)
            await conversation_service.add_message(session_id, user_msg)

            # 4. 获取上下文消息
            context_messages = await conversation_service.get_context_messages(session_id)

            # 5. 根据意图生成回答
            if intent == IntentType.HEALTH_CONSULTATION and use_rag:
                # 健康咨询 - 使用 RAG
                response = await self._handle_health_consultation_with_rag(
                    message, context_messages, patient_context
                )
            elif intent == IntentType.MEDICATION_CONSULTATION:
                # 用药咨询
                response = await self._handle_medication_consultation(
                    message, patient_context
                )
            elif intent == IntentType.DIET_ADVICE:
                # 饮食建议
                response = await self._handle_diet_advice(message, patient_context)
            elif intent == IntentType.EXERCISE_ADVICE:
                # 运动建议
                response = await self._handle_exercise_advice(message, patient_context)
            else:
                # 普通对话
                response = await self._handle_general_chat(
                    message, context_messages, patient_context
                )

            # 6. 添加 AI 回复
            ai_msg = ChatMessage(role="assistant", content=response["content"])
            await conversation_service.add_message(session_id, ai_msg)

            # 7. 返回响应
            return {
                "session_id": session_id,
                "message": response["content"],
                "intent": intent,
                "confidence": confidence,
                "sources": response.get("sources"),
                "usage": response.get("usage"),
            }

        except Exception as e:
            logger.error(f"Chat failed: {str(e)}")
            raise

    async def _handle_health_consultation_with_rag(
        self,
        message: str,
        context_messages: List[ChatMessage],
        patient_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """处理健康咨询（使用 RAG）"""
        try:
            # 1. RAG 检索
            search_results = await rag_service.search_by_text(
                query_text=message,
                top_k=3,
            )

            if search_results:
                # 2. 构建上下文
                context = "\n\n".join([r["content"] for r in search_results])

                # 3. 构建 Prompt
                messages = PromptTemplates.build_rag_query_prompt(message, context)

                # 4. 调用 DeepSeek
                response = await self.deepseek.chat(messages=messages, temperature=0.7)

                return {
                    "content": response["content"],
                    "sources": search_results,
                    "usage": response.get("usage"),
                }
            else:
                # 没有检索到相关知识，使用普通对话
                return await self._handle_general_chat(message, context_messages, patient_context)

        except Exception as e:
            logger.error(f"RAG consultation failed: {str(e)}")
            # 降级到普通对话
            return await self._handle_general_chat(message, context_messages, patient_context)

    async def _handle_medication_consultation(
        self,
        message: str,
        patient_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """处理用药咨询"""
        messages = PromptTemplates.build_medication_consultation_prompt(
            medication_name=message,
            patient_info=patient_context,
        )

        response = await self.deepseek.chat(messages=messages, temperature=0.7)

        return {
            "content": response["content"],
            "usage": response.get("usage"),
        }

    async def _handle_diet_advice(
        self,
        message: str,
        patient_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """处理饮食建议"""
        messages = PromptTemplates.build_diet_advice_prompt(
            patient_data=patient_context or {},
            specific_question=message,
        )

        response = await self.deepseek.chat(messages=messages, temperature=0.7)

        return {
            "content": response["content"],
            "usage": response.get("usage"),
        }

    async def _handle_exercise_advice(
        self,
        message: str,
        patient_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """处理运动建议"""
        messages = PromptTemplates.build_exercise_advice_prompt(
            patient_data=patient_context or {},
            specific_question=message,
        )

        response = await self.deepseek.chat(messages=messages, temperature=0.7)

        return {
            "content": response["content"],
            "usage": response.get("usage"),
        }

    async def _handle_general_chat(
        self,
        message: str,
        context_messages: List[ChatMessage],
        patient_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """处理普通对话"""
        messages = PromptTemplates.build_health_consultation_prompt(
            question=message,
            patient_context=patient_context,
        )

        # 添加历史上下文（最近 5 条）
        if context_messages:
            history = [
                {"role": msg.role, "content": msg.content}
                for msg in context_messages[-5:]
            ]
            # 插入到 system 消息之后
            messages = [messages[0]] + history + [messages[1]]

        response = await self.deepseek.chat(messages=messages, temperature=0.7)

        return {
            "content": response["content"],
            "usage": response.get("usage"),
        }

    async def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        获取会话信息

        Args:
            session_id: 会话 ID

        Returns:
            会话信息
        """
        return await conversation_service.get_session_info(session_id)

    async def get_session_history(
        self, session_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        获取会话历史

        Args:
            session_id: 会话 ID
            limit: 最大消息数量

        Returns:
            消息列表
        """
        conversation = await conversation_service.get_conversation(session_id)

        if not conversation:
            return []

        messages = conversation.messages[-limit:]
        return [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp if hasattr(msg, "timestamp") else None,
            }
            for msg in messages
        ]

    async def delete_session(self, session_id: str) -> bool:
        """
        删除会话

        Args:
            session_id: 会话 ID

        Returns:
            是否成功
        """
        return await conversation_service.delete_conversation(session_id)


# 全局单例
_agent_service: Optional[AgentService] = None


def get_agent_service() -> AgentService:
    """
    获取 Agent 服务实例（单例模式）

    Returns:
        Agent 服务实例
    """
    global _agent_service
    if _agent_service is None:
        _agent_service = AgentService()
    return _agent_service
