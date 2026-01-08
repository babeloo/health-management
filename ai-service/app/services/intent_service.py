"""
意图识别服务

识别用户输入的意图，支持：
- 健康咨询
- 健康打卡
- 用药咨询
- 饮食建议
- 运动建议
- 闲聊
"""

from typing import Dict, Any, Optional
import json
from loguru import logger

from app.services.deepseek_client import get_deepseek_client
from app.services.prompt_templates import PromptTemplates


class IntentType:
    """意图类型常量"""

    HEALTH_CONSULTATION = "health_consultation"
    CHECKIN = "checkin"
    MEDICATION_CONSULTATION = "medication_consultation"
    DIET_ADVICE = "diet_advice"
    EXERCISE_ADVICE = "exercise_advice"
    CHAT = "chat"
    OTHER = "other"


class IntentService:
    """意图识别服务"""

    def __init__(self):
        self.deepseek = get_deepseek_client()
        logger.info("Intent service initialized")

    async def recognize_intent(self, user_input: str) -> Dict[str, Any]:
        """
        识别用户意图

        Args:
            user_input: 用户输入

        Returns:
            意图识别结果，包含 intent、confidence、entities
        """
        try:
            # 构建意图识别 Prompt
            messages = PromptTemplates.build_intent_recognition_prompt(user_input)

            # 调用 DeepSeek API
            response = await self.deepseek.chat(
                messages=messages,
                temperature=0.3,  # 较低温度，提高准确性
            )

            # 解析响应
            content = response["content"].strip()

            # 尝试提取 JSON
            try:
                # 查找 JSON 内容
                start_idx = content.find("{")
                end_idx = content.rfind("}") + 1

                if start_idx != -1 and end_idx > start_idx:
                    json_str = content[start_idx:end_idx]
                    result = json.loads(json_str)
                else:
                    # 如果没有找到 JSON，使用默认值
                    result = {"intent": IntentType.OTHER, "confidence": 0.5, "entities": {}}
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse intent JSON: {str(e)}, content: {content}")
                result = {"intent": IntentType.OTHER, "confidence": 0.5, "entities": {}}

            # 验证意图类型
            valid_intents = [
                IntentType.HEALTH_CONSULTATION,
                IntentType.CHECKIN,
                IntentType.MEDICATION_CONSULTATION,
                IntentType.DIET_ADVICE,
                IntentType.EXERCISE_ADVICE,
                IntentType.CHAT,
                IntentType.OTHER,
            ]

            if result.get("intent") not in valid_intents:
                logger.warning(f"Invalid intent: {result.get('intent')}, using OTHER")
                result["intent"] = IntentType.OTHER

            logger.info(
                f"Intent recognized: {result['intent']} (confidence: {result.get('confidence', 0)})"
            )
            return result

        except Exception as e:
            logger.error(f"Intent recognition failed: {str(e)}")
            # 返回默认意图
            return {"intent": IntentType.OTHER, "confidence": 0.0, "entities": {}, "error": str(e)}

    async def is_health_related(self, user_input: str) -> bool:
        """
        判断用户输入是否与健康相关

        Args:
            user_input: 用户输入

        Returns:
            是否与健康相关
        """
        result = await self.recognize_intent(user_input)
        intent = result.get("intent")

        health_related_intents = [
            IntentType.HEALTH_CONSULTATION,
            IntentType.CHECKIN,
            IntentType.MEDICATION_CONSULTATION,
            IntentType.DIET_ADVICE,
            IntentType.EXERCISE_ADVICE,
        ]

        return intent in health_related_intents


# 全局单例
_intent_service: Optional[IntentService] = None


def get_intent_service() -> IntentService:
    """
    获取意图识别服务实例（单例模式）

    Returns:
        意图识别服务实例
    """
    global _intent_service
    if _intent_service is None:
        _intent_service = IntentService()
    return _intent_service
