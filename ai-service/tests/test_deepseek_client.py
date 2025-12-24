"""
DeepSeek 客户端单元测试
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from openai import APITimeoutError, RateLimitError, OpenAIError

from app.services.deepseek_client import DeepSeekClient, DeepSeekAPIError


class TestDeepSeekClient:
    """DeepSeek 客户端测试类"""

    @pytest.fixture
    def client(self):
        """创建测试客户端"""
        return DeepSeekClient()

    @pytest.fixture
    def mock_response(self):
        """模拟 API 响应"""
        mock = MagicMock()
        mock.choices = [MagicMock()]
        mock.choices[0].message.content = "这是测试响应"
        mock.choices[0].finish_reason = "stop"
        mock.usage = MagicMock()
        mock.usage.prompt_tokens = 50
        mock.usage.completion_tokens = 100
        mock.usage.total_tokens = 150
        mock.model = "deepseek-chat"
        return mock

    @pytest.mark.asyncio
    async def test_chat_success(self, client, mock_response):
        """测试成功的对话请求"""
        with patch.object(
            client.client.chat.completions,
            "create",
            new=AsyncMock(return_value=mock_response)
        ):
            messages = [{"role": "user", "content": "你好"}]
            response = await client.chat(messages)

            assert response["content"] == "这是测试响应"
            assert response["finish_reason"] == "stop"
            assert response["usage"]["total_tokens"] == 150
            assert client._total_requests == 1

    @pytest.mark.asyncio
    async def test_chat_with_custom_params(self, client, mock_response):
        """测试自定义参数的对话请求"""
        with patch.object(
            client.client.chat.completions,
            "create",
            new=AsyncMock(return_value=mock_response)
        ) as mock_create:
            messages = [{"role": "user", "content": "你好"}]
            await client.chat(
                messages,
                temperature=0.5,
                max_tokens=500
            )

            mock_create.assert_called_once()
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs["temperature"] == 0.5
            assert call_kwargs["max_tokens"] == 500

    @pytest.mark.asyncio
    async def test_chat_retry_on_timeout(self, client, mock_response):
        """测试超时重试"""
        with patch.object(
            client.client.chat.completions,
            "create",
            new=AsyncMock(
                side_effect=[
                    APITimeoutError("Timeout"),
                    APITimeoutError("Timeout"),
                    mock_response
                ]
            )
        ):
            messages = [{"role": "user", "content": "你好"}]
            response = await client.chat(messages)

            assert response["content"] == "这是测试响应"
            # 确认重试了 2 次后成功
            assert client.client.chat.completions.create.call_count == 3

    @pytest.mark.asyncio
    async def test_chat_max_retries_exceeded(self, client):
        """测试超过最大重试次数"""
        with patch.object(
            client.client.chat.completions,
            "create",
            new=AsyncMock(side_effect=APITimeoutError("Timeout"))
        ):
            messages = [{"role": "user", "content": "你好"}]

            with pytest.raises(DeepSeekAPIError) as exc_info:
                await client.chat(messages)

            assert "超时" in str(exc_info.value)
            # 确认重试了最大次数
            assert client.client.chat.completions.create.call_count == client.max_retries + 1

    @pytest.mark.asyncio
    async def test_chat_rate_limit_error(self, client, mock_response):
        """测试频率限制错误"""
        with patch.object(
            client.client.chat.completions,
            "create",
            new=AsyncMock(
                side_effect=[
                    RateLimitError("Rate limit exceeded"),
                    mock_response
                ]
            )
        ):
            messages = [{"role": "user", "content": "你好"}]
            response = await client.chat(messages)

            assert response["content"] == "这是测试响应"

    @pytest.mark.asyncio
    async def test_chat_openai_error(self, client):
        """测试 OpenAI API 错误"""
        with patch.object(
            client.client.chat.completions,
            "create",
            new=AsyncMock(side_effect=OpenAIError("API error"))
        ):
            messages = [{"role": "user", "content": "你好"}]

            with pytest.raises(DeepSeekAPIError) as exc_info:
                await client.chat(messages)

            assert "调用失败" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_chat_stream(self, client):
        """测试流式响应"""
        # 模拟流式响应
        async def mock_stream():
            chunks = [
                MagicMock(choices=[MagicMock(delta=MagicMock(content="你"))]),
                MagicMock(choices=[MagicMock(delta=MagicMock(content="好"))]),
                MagicMock(choices=[MagicMock(delta=MagicMock(content="！"))]),
            ]
            for chunk in chunks:
                yield chunk

        with patch.object(
            client.client.chat.completions,
            "create",
            new=AsyncMock(return_value=mock_stream())
        ):
            messages = [{"role": "user", "content": "你好"}]
            result = []

            async for chunk in client.chat_stream(messages):
                result.append(chunk)

            assert "".join(result) == "你好！"

    def test_get_usage_stats(self, client, mock_response):
        """测试使用统计"""
        # 模拟一些 token 使用
        client._update_usage_stats(100, 200)
        client._update_usage_stats(50, 150)

        stats = client.get_usage_stats()

        assert stats["prompt_tokens"] == 150
        assert stats["completion_tokens"] == 350
        assert stats["total_tokens"] == 500
        assert stats["requests"] == 2

    def test_reset_usage_stats(self, client):
        """测试重置使用统计"""
        # 先增加一些使用
        client._update_usage_stats(100, 200)

        # 重置
        client.reset_usage_stats()

        stats = client.get_usage_stats()
        assert stats["prompt_tokens"] == 0
        assert stats["completion_tokens"] == 0
        assert stats["total_tokens"] == 0
        assert stats["requests"] == 0

    def test_singleton_pattern(self):
        """测试单例模式"""
        from app.services.deepseek_client import get_deepseek_client

        client1 = get_deepseek_client()
        client2 = get_deepseek_client()

        assert client1 is client2
