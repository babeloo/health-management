"""
AI 服务核心逻辑

提供基于 DeepSeek 的 AI 功能，包括：
- 健康对话
- 健康建议生成
- 症状分析
- 用药指导
"""

from typing import Dict, Any, List, Optional, AsyncIterator
from loguru import logger

from app.services.deepseek_client import get_deepseek_client, DeepSeekAPIError
from app.services.prompt_templates import PromptTemplate, PromptType


class AIService:
    """
    AI 服务类

    封装 DeepSeek 客户端，提供高级 AI 功能接口
    """

    def __init__(self):
        """初始化 AI 服务"""
        self.deepseek_client = get_deepseek_client()
        self.prompt_template = PromptTemplate()

    async def chat(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        stream: bool = False,
    ) -> Dict[str, Any]:
        """
        普通对话接口

        Args:
            message: 用户消息
            conversation_history: 对话历史
            stream: 是否使用流式响应

        Returns:
            包含 AI 回复和使用信息的字典

        Raises:
            AIServiceError: AI 服务调用失败
        """
        try:
            # 构建消息列表
            messages = self.prompt_template.build_messages(
                prompt_type=PromptType.CHAT,
                user_prompt=message,
                conversation_history=conversation_history,
            )

            logger.info(f"AI chat request: message_length={len(message)}, history_count={len(conversation_history) if conversation_history else 0}")

            # 调用 DeepSeek API
            response = await self.deepseek_client.chat(
                messages=messages,
                stream=stream,
            )

            if stream:
                # 流式响应直接返回
                return response

            # 添加免责声明
            content_with_disclaimer = self.prompt_template.add_disclaimer(response["content"])

            result = {
                "content": content_with_disclaimer,
                "finish_reason": response["finish_reason"],
                "usage": response["usage"],
            }

            logger.info(f"AI chat success: tokens={response['usage']['total_tokens']}")

            return result

        except DeepSeekAPIError as e:
            logger.error(f"DeepSeek API error in chat: {str(e)}")
            raise AIServiceError(f"AI 对话失败: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error in chat: {str(e)}")
            raise AIServiceError(f"AI 对话发生未知错误: {str(e)}") from e

    async def chat_stream(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """
        流式对话接口

        Args:
            message: 用户消息
            conversation_history: 对话历史

        Yields:
            生成的文本片段

        Raises:
            AIServiceError: AI 服务调用失败
        """
        try:
            # 构建消息列表
            messages = self.prompt_template.build_messages(
                prompt_type=PromptType.CHAT,
                user_prompt=message,
                conversation_history=conversation_history,
            )

            logger.info(f"AI chat stream request: message_length={len(message)}")

            # 调用流式接口
            async for chunk in self.deepseek_client.chat_stream(messages=messages):
                yield chunk

            # 在流的最后添加免责声明
            yield self.prompt_template.add_disclaimer("")

        except DeepSeekAPIError as e:
            logger.error(f"DeepSeek API error in chat stream: {str(e)}")
            raise AIServiceError(f"AI 流式对话失败: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error in chat stream: {str(e)}")
            raise AIServiceError(f"AI 流式对话发生未知错误: {str(e)}") from e

    async def generate_health_advice(
        self,
        health_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        生成健康建议

        Args:
            health_data: 患者健康数据（打卡记录、检测数据等）

        Returns:
            包含健康建议和使用信息的字典

        Raises:
            AIServiceError: AI 服务调用失败
        """
        try:
            # 构建生活方式建议 Prompt
            user_prompt = self.prompt_template.build_lifestyle_advice_prompt(health_data)

            # 构建消息列表
            messages = self.prompt_template.build_messages(
                prompt_type=PromptType.LIFESTYLE_ADVICE,
                user_prompt=user_prompt,
            )

            logger.info(f"AI health advice request: patient_age={health_data.get('age')}, diseases={health_data.get('diseases')}")

            # 调用 DeepSeek API
            response = await self.deepseek_client.chat(messages=messages)

            # 添加免责声明
            content_with_disclaimer = self.prompt_template.add_disclaimer(response["content"])

            result = {
                "advice": content_with_disclaimer,
                "finish_reason": response["finish_reason"],
                "usage": response["usage"],
            }

            logger.info(f"AI health advice success: tokens={response['usage']['total_tokens']}")

            return result

        except DeepSeekAPIError as e:
            logger.error(f"DeepSeek API error in health advice: {str(e)}")
            raise AIServiceError(f"生成健康建议失败: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error in health advice: {str(e)}")
            raise AIServiceError(f"生成健康建议发生未知错误: {str(e)}") from e

    async def analyze_symptoms(
        self,
        symptoms: str,
        patient_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        分析症状

        Args:
            symptoms: 症状描述
            patient_data: 患者数据

        Returns:
            包含症状分析和使用信息的字典

        Raises:
            AIServiceError: AI 服务调用失败
        """
        try:
            # 构建症状分析 Prompt
            user_prompt = self.prompt_template.build_symptom_analysis_prompt(symptoms, patient_data)

            # 构建消息列表
            messages = self.prompt_template.build_messages(
                prompt_type=PromptType.SYMPTOM_ANALYSIS,
                user_prompt=user_prompt,
            )

            logger.info(f"AI symptom analysis request: symptoms_length={len(symptoms)}")

            # 调用 DeepSeek API
            response = await self.deepseek_client.chat(messages=messages)

            # 添加免责声明
            content_with_disclaimer = self.prompt_template.add_disclaimer(response["content"])

            result = {
                "analysis": content_with_disclaimer,
                "finish_reason": response["finish_reason"],
                "usage": response["usage"],
            }

            logger.info(f"AI symptom analysis success: tokens={response['usage']['total_tokens']}")

            return result

        except DeepSeekAPIError as e:
            logger.error(f"DeepSeek API error in symptom analysis: {str(e)}")
            raise AIServiceError(f"症状分析失败: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error in symptom analysis: {str(e)}")
            raise AIServiceError(f"症状分析发生未知错误: {str(e)}") from e

    async def generate_medication_guide(
        self,
        medication_name: str,
        patient_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        生成用药指导

        Args:
            medication_name: 药物名称
            patient_info: 患者信息（可选）

        Returns:
            包含用药指导和使用信息的字典

        Raises:
            AIServiceError: AI 服务调用失败
        """
        try:
            # 构建用药指导 Prompt
            user_prompt = self.prompt_template.build_medication_guide_prompt(medication_name, patient_info)

            # 构建消息列表
            messages = self.prompt_template.build_messages(
                prompt_type=PromptType.MEDICATION_GUIDE,
                user_prompt=user_prompt,
            )

            logger.info(f"AI medication guide request: medication={medication_name}")

            # 调用 DeepSeek API
            response = await self.deepseek_client.chat(messages=messages)

            # 添加免责声明
            content_with_disclaimer = self.prompt_template.add_disclaimer(response["content"])

            result = {
                "guide": content_with_disclaimer,
                "finish_reason": response["finish_reason"],
                "usage": response["usage"],
            }

            logger.info(f"AI medication guide success: tokens={response['usage']['total_tokens']}")

            return result

        except DeepSeekAPIError as e:
            logger.error(f"DeepSeek API error in medication guide: {str(e)}")
            raise AIServiceError(f"生成用药指导失败: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error in medication guide: {str(e)}")
            raise AIServiceError(f"生成用药指导发生未知错误: {str(e)}") from e

    async def generate_health_education(
        self,
        topic: str,
        patient_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        生成健康科普内容

        Args:
            topic: 科普主题
            patient_context: 患者上下文信息（可选）

        Returns:
            包含科普内容和使用信息的字典

        Raises:
            AIServiceError: AI 服务调用失败
        """
        try:
            # 构建健康科普 Prompt
            user_prompt = self.prompt_template.build_health_education_prompt(topic, patient_context)

            # 构建消息列表
            messages = self.prompt_template.build_messages(
                prompt_type=PromptType.HEALTH_EDUCATION,
                user_prompt=user_prompt,
            )

            logger.info(f"AI health education request: topic={topic}")

            # 调用 DeepSeek API
            response = await self.deepseek_client.chat(messages=messages)

            # 添加免责声明
            content_with_disclaimer = self.prompt_template.add_disclaimer(response["content"])

            result = {
                "content": content_with_disclaimer,
                "finish_reason": response["finish_reason"],
                "usage": response["usage"],
            }

            logger.info(f"AI health education success: tokens={response['usage']['total_tokens']}")

            return result

        except DeepSeekAPIError as e:
            logger.error(f"DeepSeek API error in health education: {str(e)}")
            raise AIServiceError(f"生成健康科普失败: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error in health education: {str(e)}")
            raise AIServiceError(f"生成健康科普发生未知错误: {str(e)}") from e

    async def assess_risk(
        self,
        health_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        评估健康风险

        Args:
            health_data: 患者健康数据

        Returns:
            包含风险评估和使用信息的字典

        Raises:
            AIServiceError: AI 服务调用失败
        """
        try:
            # 构建风险评估 Prompt
            user_prompt = self.prompt_template.build_risk_assessment_prompt(health_data)

            # 构建消息列表
            messages = self.prompt_template.build_messages(
                prompt_type=PromptType.RISK_ASSESSMENT,
                user_prompt=user_prompt,
            )

            logger.info(f"AI risk assessment request: patient_age={health_data.get('age')}")

            # 调用 DeepSeek API
            response = await self.deepseek_client.chat(messages=messages)

            # 添加免责声明
            content_with_disclaimer = self.prompt_template.add_disclaimer(response["content"])

            result = {
                "assessment": content_with_disclaimer,
                "finish_reason": response["finish_reason"],
                "usage": response["usage"],
            }

            logger.info(f"AI risk assessment success: tokens={response['usage']['total_tokens']}")

            return result

        except DeepSeekAPIError as e:
            logger.error(f"DeepSeek API error in risk assessment: {str(e)}")
            raise AIServiceError(f"风险评估失败: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error in risk assessment: {str(e)}")
            raise AIServiceError(f"风险评估发生未知错误: {str(e)}") from e

    def get_usage_stats(self) -> Dict[str, int]:
        """
        获取 Token 使用统计

        Returns:
            使用统计字典
        """
        return self.deepseek_client.get_usage_stats()

    def reset_usage_stats(self):
        """重置使用统计"""
        self.deepseek_client.reset_usage_stats()


class AIServiceError(Exception):
    """AI 服务异常"""
    pass


# 全局单例
_ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """
    获取 AI 服务单例

    Returns:
        AI 服务实例
    """
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
