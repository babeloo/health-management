"""
AI Agent 服务

集成对话管理、意图识别、RAG 检索、打卡解析等功能
提供完整的对话代理能力
"""

from typing import Any, Dict, Optional

from loguru import logger

from app.services.checkin_parser import CheckinType, get_checkin_parser_service
from app.services.conversation_service import (
    ConversationState,
    MessageRole,
    get_conversation_service,
)
from app.services.deepseek_client import get_deepseek_client
from app.services.intent_service import IntentType, get_intent_recognition_service
from app.services.rag_service import get_rag_service


class AgentService:
    """
    AI Agent 服务类

    提供完整的对话代理功能，包括：
    - 对话上下文管理
    - 意图识别和路由
    - RAG 知识库检索
    - 自然语言打卡
    - 对话流程控制
    """

    def __init__(self):
        """初始化 Agent 服务"""
        self.conversation_service = get_conversation_service()
        self.intent_service = get_intent_recognition_service()
        self.rag_service = get_rag_service()
        self.deepseek_client = get_deepseek_client()
        self.checkin_parser = get_checkin_parser_service()

        # 系统提示词
        self.system_prompt = """你是一个专业的健康管理助手，负责帮助用户管理慢性病。

你的职责：
1. 回答健康相关问题（基于知识库）
2. 分析用户症状并给出建议
3. 提供用药咨询
4. 协助用户完成健康打卡
5. 保持友好、专业的对话态度

重要约束：
- 所有医疗建议必须在末尾添加："此建议仅供参考，请咨询专业医生。"
- 回答长度控制在 100-300 字
- 避免重复回答
- 如果信息不足，主动询问澄清
"""

        logger.info("AgentService initialized")

    async def chat(
        self,
        user_input: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        处理对话

        Args:
            user_input: 用户输入
            session_id: 会话 ID（可选，不提供则创建新会话）
            user_id: 用户 ID（可选）

        Returns:
            Dict[str, Any]: 对话响应
        """
        try:
            # 1. 获取或创建会话
            if session_id:
                session = await self.conversation_service.get_session(session_id)
                if not session:
                    logger.warning(f"Session not found, creating new: {session_id}")
                    session = await self.conversation_service.create_session(
                        user_id=user_id, session_id=session_id
                    )
            else:
                session = await self.conversation_service.create_session(user_id=user_id)

            # 2. 添加用户消息
            await self.conversation_service.add_message(
                session_id=session.session_id,
                role=MessageRole.USER,
                content=user_input,
            )

            # 3. 更新状态为处理中
            await self.conversation_service.update_state(
                session_id=session.session_id,
                state=ConversationState.PROCESSING,
            )

            # 4. 意图识别
            intent_result = await self.intent_service.recognize(user_input)
            logger.info(
                f"Intent recognized: {intent_result.intent} (confidence={intent_result.confidence})"
            )

            # 5. 根据意图路由处理
            if intent_result.intent == IntentType.GREETING:
                response = await self._handle_greeting(session.session_id)
            elif intent_result.intent == IntentType.CHITCHAT:
                response = await self._handle_chitchat(session.session_id, user_input)
            elif self.intent_service.is_checkin_intent(intent_result.intent):
                response = await self._handle_checkin(
                    session.session_id, intent_result, user_input
                )
            elif intent_result.intent in [
                IntentType.HEALTH_CONSULT,
                IntentType.SYMPTOM_ANALYSIS,
                IntentType.MEDICATION_CONSULT,
            ]:
                response = await self._handle_knowledge_query(
                    session.session_id, user_input, intent_result.intent
                )
            else:
                response = await self._handle_unknown(session.session_id, user_input)

            # 6. 添加助手消息
            await self.conversation_service.add_message(
                session_id=session.session_id,
                role=MessageRole.ASSISTANT,
                content=response["reply"],
                metadata={
                    "intent": intent_result.intent.value,
                    "confidence": intent_result.confidence,
                },
            )

            # 7. 更新状态为等待输入
            await self.conversation_service.update_state(
                session_id=session.session_id,
                state=ConversationState.WAITING_INPUT,
            )

            return {
                "session_id": session.session_id,
                "reply": response["reply"],
                "intent": intent_result.intent.value,
                "confidence": intent_result.confidence,
                "data": response.get("data"),
            }

        except Exception as e:
            logger.error(f"Error in chat processing: {str(e)}")
            return {
                "session_id": session_id,
                "reply": "抱歉，我遇到了一些问题，请稍后再试。",
                "error": str(e),
            }

    async def _handle_greeting(self, session_id: str) -> Dict[str, Any]:
        """处理问候"""
        greetings = [
            "你好！我是你的健康管理助手，很高兴为你服务。你可以问我健康相关的问题，或者告诉我你今天的健康数据。",
            "你好！有什么可以帮助你的吗？我可以回答健康问题，也可以帮你记录血压、血糖等健康数据。",
        ]
        return {"reply": greetings[0]}

    async def _handle_chitchat(self, session_id: str, user_input: str) -> Dict[str, Any]:
        """处理闲聊"""
        # 获取对话历史
        messages = await self.conversation_service.get_context_messages(session_id)

        # 添加系统提示
        full_messages = [{"role": "system", "content": self.system_prompt}] + messages

        # 调用 LLM
        response = await self.deepseek_client.chat(
            messages=full_messages,
            temperature=0.8,
            max_tokens=300,
        )

        return {"reply": response["content"]}

    async def _handle_checkin(
        self, session_id: str, intent_result, user_input: str
    ) -> Dict[str, Any]:
        """处理打卡"""
        try:
            # 获取打卡类型
            checkin_type_str = self.intent_service.get_checkin_type(intent_result.intent)
            if not checkin_type_str:
                return {"reply": "抱歉，我无法识别您要打卡的类型。"}

            checkin_type = CheckinType(checkin_type_str)

            # 解析打卡数据
            checkin_data = self.checkin_parser.parse(
                checkin_type=checkin_type,
                text=user_input,
                entities=intent_result.entities,
            )

            if not checkin_data:
                # 数据不完整，询问补充信息
                return await self._ask_for_clarification(session_id, checkin_type)

            # 保存到上下文（后续由后端 API 保存到数据库）
            await self.conversation_service.update_context(
                session_id=session_id,
                context_updates={
                    "last_checkin": checkin_data.model_dump(),
                },
            )

            # 生成确认消息
            reply = self._generate_checkin_confirmation(checkin_data)

            return {
                "reply": reply,
                "data": checkin_data.model_dump(),
            }

        except Exception as e:
            logger.error(f"Error handling checkin: {str(e)}")
            return {"reply": "抱歉，打卡记录失败，请稍后再试。"}

    async def _handle_knowledge_query(
        self, session_id: str, user_input: str, intent: IntentType
    ) -> Dict[str, Any]:
        """处理知识查询（RAG）"""
        try:
            # 确定知识库类别
            category = None
            if intent == IntentType.MEDICATION_CONSULT:
                category = "medication"
            elif intent == IntentType.SYMPTOM_ANALYSIS:
                category = "symptom"

            # 使用 RAG 生成答案
            result = await self.rag_service.generate_answer(
                query=user_input,
                category=category,
                include_sources=True,
            )

            # 确保包含免责声明
            answer = result["answer"]
            if "此建议仅供参考" not in answer and "建议仅供参考" not in answer:
                answer += "\n\n此建议仅供参考，请咨询专业医生。"

            return {
                "reply": answer,
                "data": {
                    "sources": result.get("sources", []),
                    "has_context": result.get("has_context", False),
                },
            }

        except Exception as e:
            logger.error(f"Error handling knowledge query: {str(e)}")
            return {
                "reply": "抱歉，我暂时无法回答这个问题。此建议仅供参考，请咨询专业医生。",
            }

    async def _handle_unknown(self, session_id: str, user_input: str) -> Dict[str, Any]:
        """处理未知意图"""
        reply = """抱歉，我不太理解你的意思。

你可以：
1. 询问健康相关问题
2. 告诉我你的健康数据（如"今天血压 130/80"）
3. 咨询用药问题
4. 描述症状寻求建议

请问我可以如何帮助你？"""

        return {"reply": reply}

    async def _ask_for_clarification(
        self, session_id: str, checkin_type: CheckinType
    ) -> Dict[str, Any]:
        """询问澄清信息"""
        clarification_prompts = {
            CheckinType.BLOOD_PRESSURE: "请告诉我您的血压数据，格式如：130/80",
            CheckinType.BLOOD_SUGAR: "请告诉我您的血糖值，例如：空腹血糖 5.6",
            CheckinType.MEDICATION: "请确认您是否已按时服药？",
            CheckinType.EXERCISE: "请告诉我您今天运动了多久，或走了多少步？",
            CheckinType.DIET: "请告诉我您吃的是哪一餐（早餐/午餐/晚餐）？",
        }

        reply = clarification_prompts.get(
            checkin_type, "请提供更详细的打卡信息。"
        )

        # 更新状态为等待确认
        await self.conversation_service.update_state(
            session_id=session_id,
            state=ConversationState.WAITING_CONFIRMATION,
        )

        return {"reply": reply}

    def _generate_checkin_confirmation(self, checkin_data) -> str:
        """生成打卡确认消息"""
        confirmations = {
            CheckinType.BLOOD_PRESSURE: lambda d: f"✅ 血压打卡成功！\n收缩压：{d.data['systolic']} mmHg\n舒张压：{d.data['diastolic']} mmHg\n{'心率：' + str(d.data['heart_rate']) + ' bpm' if d.data.get('heart_rate') else ''}\n\n保持良好的血压监测习惯！",
            CheckinType.BLOOD_SUGAR: lambda d: f"✅ 血糖打卡成功！\n血糖值：{d.data['value']} mmol/L\n测量时机：{self._format_timing(d.data['timing'])}\n\n继续保持血糖监测！",
            CheckinType.MEDICATION: lambda d: f"✅ 用药打卡成功！\n\n按时服药很重要，继续保持！",
            CheckinType.EXERCISE: lambda d: f"✅ 运动打卡成功！\n{f'运动时长：{d.data[\"duration\"]} 分钟' if d.data.get('duration') else ''}\n{f'步数：{d.data[\"steps\"]} 步' if d.data.get('steps') else ''}\n\n坚持运动，健康生活！",
            CheckinType.DIET: lambda d: f"✅ 饮食打卡成功！\n餐次：{self._format_meal_type(d.data.get('meal_type'))}\n\n合理饮食，健康每一天！",
        }

        generator = confirmations.get(checkin_data.checkin_type)
        if generator:
            return generator(checkin_data)
        return "✅ 打卡成功！"

    def _format_timing(self, timing: str) -> str:
        """格式化血糖测量时机"""
        timing_map = {
            "fasting": "空腹",
            "before_meal": "餐前",
            "after_meal": "餐后",
            "before_sleep": "睡前",
            "unknown": "未知",
        }
        return timing_map.get(timing, timing)

    def _format_meal_type(self, meal_type: Optional[str]) -> str:
        """格式化餐次"""
        if not meal_type:
            return "未指定"
        meal_map = {
            "breakfast": "早餐",
            "lunch": "午餐",
            "dinner": "晚餐",
            "snack": "加餐",
        }
        return meal_map.get(meal_type, meal_type)


# 全局单例
_agent_service: Optional[AgentService] = None


def get_agent_service() -> AgentService:
    """
    获取 Agent 服务实例（单例模式）

    Returns:
        AgentService: Agent 服务实例
    """
    global _agent_service
    if _agent_service is None:
        _agent_service = AgentService()
    return _agent_service
