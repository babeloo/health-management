"""
意图识别服务

识别用户意图并分类到不同的处理路径
"""

import re
from enum import Enum
from typing import Dict, List, Optional, Tuple

from loguru import logger
from pydantic import BaseModel, Field

from app.services.deepseek_client import get_deepseek_client


class IntentType(str, Enum):
    """用户意图类型"""

    HEALTH_CONSULT = "health_consult"  # 健康咨询
    SYMPTOM_ANALYSIS = "symptom_analysis"  # 症状分析
    MEDICATION_CONSULT = "medication_consult"  # 用药咨询
    CHECKIN_BLOOD_PRESSURE = "checkin_blood_pressure"  # 血压打卡
    CHECKIN_BLOOD_SUGAR = "checkin_blood_sugar"  # 血糖打卡
    CHECKIN_MEDICATION = "checkin_medication"  # 用药打卡
    CHECKIN_EXERCISE = "checkin_exercise"  # 运动打卡
    CHECKIN_DIET = "checkin_diet"  # 饮食打卡
    COMPLAINT = "complaint"  # 投诉反馈
    GREETING = "greeting"  # 问候
    CHITCHAT = "chitchat"  # 闲聊
    UNKNOWN = "unknown"  # 未知意图


class IntentResult(BaseModel):
    """意图识别结果"""

    intent: IntentType = Field(..., description="识别的意图类型")
    confidence: float = Field(..., description="置信度 (0-1)")
    entities: Dict[str, any] = Field(default_factory=dict, description="提取的实体")
    raw_text: str = Field(..., description="原始文本")


class IntentRecognitionService:
    """
    意图识别服务

    使用规则 + LLM 混合方式识别用户意图
    """

    def __init__(self):
        """初始化意图识别服务"""
        self.deepseek_client = get_deepseek_client()

        # 定义关键词规则
        self.keyword_rules = {
            IntentType.CHECKIN_BLOOD_PRESSURE: [
                r"血压.*(\d{2,3})[/／](\d{2,3})",
                r"今天.*血压.*(\d{2,3})[/／](\d{2,3})",
                r"我.*血压.*(\d{2,3})[/／](\d{2,3})",
                r"收缩压.*(\d{2,3}).*舒张压.*(\d{2,3})",
            ],
            IntentType.CHECKIN_BLOOD_SUGAR: [
                r"血糖.*(\d+\.?\d*)",
                r"今天.*血糖.*(\d+\.?\d*)",
                r"我.*血糖.*(\d+\.?\d*)",
                r"空腹.*血糖.*(\d+\.?\d*)",
                r"餐后.*血糖.*(\d+\.?\d*)",
            ],
            IntentType.CHECKIN_MEDICATION: [
                r"吃药",
                r"服药",
                r"已.*服.*药",
                r"药.*吃.*了",
                r"打卡.*药",
            ],
            IntentType.CHECKIN_EXERCISE: [
                r"运动.*(\d+).*分钟",
                r"锻炼.*(\d+).*分钟",
                r"走.*(\d+).*步",
                r"跑步.*(\d+)",
                r"游泳.*(\d+)",
            ],
            IntentType.CHECKIN_DIET: [
                r"吃.*早餐",
                r"吃.*午餐",
                r"吃.*晚餐",
                r"饮食.*打卡",
            ],
            IntentType.GREETING: [
                r"^你好",
                r"^早上好",
                r"^晚上好",
                r"^hi",
                r"^hello",
            ],
            IntentType.COMPLAINT: [
                r"投诉",
                r"反馈",
                r"不满意",
                r"抱怨",
                r"差评",
            ],
        }

        logger.info("IntentRecognitionService initialized")

    async def recognize(self, text: str) -> IntentResult:
        """
        识别用户意图

        Args:
            text: 用户输入文本

        Returns:
            IntentResult: 意图识别结果
        """
        # 1. 先尝试基于规则的识别（快速路径）
        rule_result = self._recognize_by_rules(text)
        if rule_result and rule_result.confidence >= 0.8:
            logger.info(
                f"Intent recognized by rules: {rule_result.intent} (confidence={rule_result.confidence})"
            )
            return rule_result

        # 2. 使用 LLM 识别（慢速路径，但更准确）
        llm_result = await self._recognize_by_llm(text)
        if llm_result:
            logger.info(
                f"Intent recognized by LLM: {llm_result.intent} (confidence={llm_result.confidence})"
            )
            return llm_result

        # 3. 默认返回未知意图
        logger.warning(f"Unable to recognize intent for: {text}")
        return IntentResult(
            intent=IntentType.UNKNOWN,
            confidence=0.0,
            entities={},
            raw_text=text,
        )

    def _recognize_by_rules(self, text: str) -> Optional[IntentResult]:
        """
        基于规则的意图识别

        Args:
            text: 用户输入文本

        Returns:
            IntentResult: 意图识别结果，无匹配返回 None
        """
        text = text.strip()

        for intent_type, patterns in self.keyword_rules.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    entities = {}

                    # 提取实体
                    if intent_type == IntentType.CHECKIN_BLOOD_PRESSURE:
                        if match.groups():
                            entities = {
                                "systolic": int(match.group(1)),
                                "diastolic": int(match.group(2)),
                            }
                    elif intent_type == IntentType.CHECKIN_BLOOD_SUGAR:
                        if match.groups():
                            entities = {"value": float(match.group(1))}
                    elif intent_type in [
                        IntentType.CHECKIN_EXERCISE,
                    ]:
                        if match.groups():
                            entities = {"duration": int(match.group(1))}

                    return IntentResult(
                        intent=intent_type,
                        confidence=0.9,  # 规则匹配的置信度固定为 0.9
                        entities=entities,
                        raw_text=text,
                    )

        return None

    async def _recognize_by_llm(self, text: str) -> Optional[IntentResult]:
        """
        基于 LLM 的意图识别

        Args:
            text: 用户输入文本

        Returns:
            IntentResult: 意图识别结果，失败返回 None
        """
        try:
            # 构建 Prompt
            system_prompt = """你是一个专业的意图识别助手，负责识别用户在健康管理场景中的意图。

请根据用户输入，判断用户的意图类型，并从以下类别中选择一个：
1. health_consult - 健康咨询（询问健康知识、疾病相关问题）
2. symptom_analysis - 症状分析（描述症状、寻求分析）
3. medication_consult - 用药咨询（询问药物用法、副作用等）
4. checkin_blood_pressure - 血压打卡（报告血压数据）
5. checkin_blood_sugar - 血糖打卡（报告血糖数据）
6. checkin_medication - 用药打卡（报告已服药）
7. checkin_exercise - 运动打卡（报告运动情况）
8. checkin_diet - 饮食打卡（报告饮食情况）
9. complaint - 投诉反馈
10. greeting - 问候
11. chitchat - 闲聊
12. unknown - 未知意图

请以 JSON 格式返回结果：
{
  "intent": "意图类型",
  "confidence": 0.0-1.0,
  "entities": {}
}

注意：
- confidence 表示置信度，0.0-1.0 之间
- entities 用于提取关键信息（如血压值、血糖值等）
- 只返回 JSON，不要包含其他文字
"""

            user_prompt = f"用户输入：{text}"

            # 调用 DeepSeek API
            response = await self.deepseek_client.chat(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,  # 低温度，提高准确性
                max_tokens=200,
            )

            # 解析响应
            import json

            result_text = response["content"].strip()

            # 尝试提取 JSON
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()

            result_data = json.loads(result_text)

            # 验证意图类型
            try:
                intent = IntentType(result_data["intent"])
            except ValueError:
                intent = IntentType.UNKNOWN

            return IntentResult(
                intent=intent,
                confidence=result_data.get("confidence", 0.5),
                entities=result_data.get("entities", {}),
                raw_text=text,
            )

        except Exception as e:
            logger.error(f"LLM intent recognition failed: {str(e)}")
            return None

    def is_checkin_intent(self, intent: IntentType) -> bool:
        """
        判断是否为打卡意图

        Args:
            intent: 意图类型

        Returns:
            bool: 是打卡意图返回 True
        """
        return intent in [
            IntentType.CHECKIN_BLOOD_PRESSURE,
            IntentType.CHECKIN_BLOOD_SUGAR,
            IntentType.CHECKIN_MEDICATION,
            IntentType.CHECKIN_EXERCISE,
            IntentType.CHECKIN_DIET,
        ]

    def get_checkin_type(self, intent: IntentType) -> Optional[str]:
        """
        获取打卡类型

        Args:
            intent: 意图类型

        Returns:
            str: 打卡类型（blood_pressure, blood_sugar, medication, exercise, diet）
        """
        mapping = {
            IntentType.CHECKIN_BLOOD_PRESSURE: "blood_pressure",
            IntentType.CHECKIN_BLOOD_SUGAR: "blood_sugar",
            IntentType.CHECKIN_MEDICATION: "medication",
            IntentType.CHECKIN_EXERCISE: "exercise",
            IntentType.CHECKIN_DIET: "diet",
        }
        return mapping.get(intent)


# 全局单例
_intent_recognition_service: Optional[IntentRecognitionService] = None


def get_intent_recognition_service() -> IntentRecognitionService:
    """
    获取意图识别服务实例（单例模式）

    Returns:
        IntentRecognitionService: 意图识别服务实例
    """
    global _intent_recognition_service
    if _intent_recognition_service is None:
        _intent_recognition_service = IntentRecognitionService()
    return _intent_recognition_service
