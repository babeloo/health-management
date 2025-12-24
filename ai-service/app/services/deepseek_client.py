"""
DeepSeek API 客户端封装

提供 DeepSeek API 的调用接口，包括：
- 文本生成（chat completion）
- 流式响应
- 对话历史管理
- Token 使用统计
- 自动重试和错误处理
"""

from typing import List, Dict, Any, Optional, AsyncIterator
import asyncio
from openai import AsyncOpenAI, OpenAIError, APITimeoutError, RateLimitError
from loguru import logger

from app.core.config import settings


class DeepSeekClient:
    """
    DeepSeek API 客户端

    基于 OpenAI SDK 实现，DeepSeek API 兼容 OpenAI 接口规范
    """

    def __init__(self):
        """初始化 DeepSeek 客户端"""
        self.client = AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_api_base,
            timeout=settings.deepseek_timeout,
            max_retries=0,  # 禁用 SDK 自动重试，使用自定义重试逻辑
        )
        self.model = settings.deepseek_model
        self.temperature = settings.deepseek_temperature
        self.max_tokens = settings.deepseek_max_tokens
        self.max_retries = settings.deepseek_max_retries

        # Token 使用统计
        self._total_prompt_tokens = 0
        self._total_completion_tokens = 0
        self._total_requests = 0

        logger.info(
            f"DeepSeek client initialized: model={self.model}, "
            f"base_url={settings.deepseek_api_base}"
        )

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        发送对话请求到 DeepSeek API

        Args:
            messages: 对话消息列表，格式为 [{"role": "user", "content": "..."}]
            temperature: 生成温度，控制随机性（0.0-2.0）
            max_tokens: 最大生成 token 数
            stream: 是否使用流式响应
            **kwargs: 其他 API 参数

        Returns:
            API 响应字典，包含 content、usage 等字段

        Raises:
            DeepSeekAPIError: API 调用失败
        """
        temperature = temperature if temperature is not None else self.temperature
        max_tokens = max_tokens if max_tokens is not None else self.max_tokens

        # 带重试的 API 调用
        for attempt in range(self.max_retries + 1):
            try:
                logger.debug(
                    f"DeepSeek API request (attempt {attempt + 1}/{self.max_retries + 1}): "
                    f"messages={len(messages)}, temperature={temperature}, max_tokens={max_tokens}"
                )

                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=stream,
                    **kwargs,
                )

                if stream:
                    # 流式响应直接返回
                    return {"stream": response}

                # 提取响应内容
                result = {
                    "content": response.choices[0].message.content,
                    "finish_reason": response.choices[0].finish_reason,
                    "usage": {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens,
                    },
                    "model": response.model,
                }

                # 更新统计
                self._update_usage_stats(
                    response.usage.prompt_tokens,
                    response.usage.completion_tokens,
                )

                logger.info(
                    f"DeepSeek API success: tokens={response.usage.total_tokens}, "
                    f"finish_reason={response.choices[0].finish_reason}"
                )

                return result

            except APITimeoutError as e:
                logger.warning(
                    f"DeepSeek API timeout (attempt {attempt + 1}/{self.max_retries + 1}): {str(e)}"
                )
                if attempt >= self.max_retries:
                    raise DeepSeekAPIError(f"API 请求超时，已重试 {self.max_retries} 次") from e
                await asyncio.sleep(2 ** attempt)  # 指数退避

            except RateLimitError as e:
                logger.warning(
                    f"DeepSeek API rate limit (attempt {attempt + 1}/{self.max_retries + 1}): {str(e)}"
                )
                if attempt >= self.max_retries:
                    raise DeepSeekAPIError(f"API 请求频率限制，请稍后再试") from e
                await asyncio.sleep(5 * (attempt + 1))  # 更长的等待时间

            except OpenAIError as e:
                logger.error(
                    f"DeepSeek API error (attempt {attempt + 1}/{self.max_retries + 1}): {str(e)}"
                )
                if attempt >= self.max_retries:
                    raise DeepSeekAPIError(f"API 调用失败: {str(e)}") from e
                await asyncio.sleep(2 ** attempt)

            except Exception as e:
                logger.error(f"Unexpected error in DeepSeek API call: {str(e)}")
                raise DeepSeekAPIError(f"API 调用发生未知错误: {str(e)}") from e

        raise DeepSeekAPIError("API 调用失败，已达到最大重试次数")

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> AsyncIterator[str]:
        """
        流式对话接口

        Args:
            messages: 对话消息列表
            temperature: 生成温度
            max_tokens: 最大生成 token 数
            **kwargs: 其他 API 参数

        Yields:
            生成的文本片段

        Raises:
            DeepSeekAPIError: API 调用失败
        """
        response = await self.chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
            **kwargs,
        )

        try:
            async for chunk in response["stream"]:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"Error in stream processing: {str(e)}")
            raise DeepSeekAPIError(f"流式响应处理失败: {str(e)}") from e

    def get_usage_stats(self) -> Dict[str, int]:
        """
        获取 Token 使用统计

        Returns:
            包含 prompt_tokens、completion_tokens、total_tokens、requests 的字典
        """
        return {
            "prompt_tokens": self._total_prompt_tokens,
            "completion_tokens": self._total_completion_tokens,
            "total_tokens": self._total_prompt_tokens + self._total_completion_tokens,
            "requests": self._total_requests,
        }

    def reset_usage_stats(self):
        """重置使用统计"""
        self._total_prompt_tokens = 0
        self._total_completion_tokens = 0
        self._total_requests = 0
        logger.info("DeepSeek usage stats reset")

    def _update_usage_stats(self, prompt_tokens: int, completion_tokens: int):
        """更新使用统计"""
        self._total_prompt_tokens += prompt_tokens
        self._total_completion_tokens += completion_tokens
        self._total_requests += 1


class DeepSeekAPIError(Exception):
    """DeepSeek API 调用异常"""
    pass


# 全局单例
_deepseek_client: Optional[DeepSeekClient] = None


def get_deepseek_client() -> DeepSeekClient:
    """
    获取 DeepSeek 客户端单例

    Returns:
        DeepSeek 客户端实例
    """
    global _deepseek_client
    if _deepseek_client is None:
        _deepseek_client = DeepSeekClient()
    return _deepseek_client
