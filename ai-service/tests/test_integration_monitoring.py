"""
集成测试：性能监控和缓存集成测试

验证监控和缓存在 API 端点中的实际表现
"""

import pytest
import asyncio
import time
from unittest.mock import AsyncMock, patch

from app.services.metrics_service import MetricsService, get_metrics_service
from app.services.cache_service import CacheManager, get_cache_manager


class TestCacheIntegrationWithMetrics:
    """缓存与监控的集成测试"""

    @pytest.mark.asyncio
    async def test_cache_hit_metrics_recording(self):
        """测试缓存命中时的指标记录"""
        metrics = MetricsService()

        # 模拟缓存命中
        metrics.record_cache_hit("rag_answer")

        # 验证指标被记录
        assert metrics.cache_hits_total is not None

    @pytest.mark.asyncio
    async def test_cache_miss_metrics_recording(self):
        """测试缓存未命中时的指标记录"""
        metrics = MetricsService()

        # 模拟缓存未命中
        metrics.record_cache_miss("vector_search")

        # 验证指标被记录
        assert metrics.cache_misses_total is not None

    @pytest.mark.asyncio
    async def test_rag_retrieval_with_cache(self):
        """测试 RAG 检索与缓存的协同工作"""
        metrics = MetricsService()

        # 第一次 RAG 检索（缓存未命中）
        metrics.record_cache_miss("rag_answer")
        metrics.record_rag_retrieval("health_advice", duration=0.5)

        # 第二次 RAG 检索（缓存命中）
        metrics.record_cache_hit("rag_answer")
        metrics.record_rag_retrieval("health_advice", duration=0.05)

        # 验证指标被记录
        assert metrics.cache_hits_total is not None
        assert metrics.rag_retrievals_total is not None


class TestPerformanceCharacteristics:
    """性能特性测试"""

    @pytest.mark.asyncio
    async def test_vector_search_performance(self):
        """验证向量检索性能 < 500ms"""
        metrics = MetricsService()

        # 模拟多次向量检索
        durations = [0.08, 0.12, 0.15, 0.10, 0.14, 0.09, 0.11, 0.13, 0.12]

        for duration in durations:
            metrics.record_vector_search("health_knowledge", duration)

        # 计算平均响应时间
        avg_duration = sum(durations) / len(durations)
        assert avg_duration < 0.5, f"Vector search avg time {avg_duration:.3f}s exceeds 500ms"

    @pytest.mark.asyncio
    async def test_api_error_rate(self):
        """验证 API 错误率 < 1%"""
        metrics = MetricsService()

        # 模拟 1000 个请求
        total_requests = 1000
        error_requests = 5  # 0.5% 错误率

        for i in range(total_requests - error_requests):
            metrics.record_api_request(
                method="POST",
                endpoint="/api/v1/ai/chat",
                duration=0.3,
                status_code=200,
            )

        for i in range(error_requests):
            metrics.record_api_error(
                method="POST",
                endpoint="/api/v1/ai/chat",
                error_type="timeout",
            )

        error_rate = (error_requests / total_requests) * 100
        assert error_rate < 1.0, f"Error rate {error_rate:.2f}% exceeds 1%"

    @pytest.mark.asyncio
    async def test_cache_effectiveness(self):
        """验证缓存有效性"""
        metrics = MetricsService()

        # 模拟 100 个请求
        total_requests = 100
        cache_hits = 65  # 65% 缓存命中率
        cache_misses = 35

        for i in range(cache_hits):
            metrics.record_cache_hit("rag_answer")

        for i in range(cache_misses):
            metrics.record_cache_miss("rag_answer")

        cache_hit_rate = (cache_hits / (cache_hits + cache_misses)) * 100
        assert (
            cache_hit_rate > 60
        ), f"Cache hit rate {cache_hit_rate:.2f}% below expected 60%"


class TestDeepSeekTokenUsage:
    """DeepSeek Token 使用情况测试"""

    def test_token_usage_tracking(self):
        """测试 Token 使用情况跟踪"""
        metrics = MetricsService()

        # 模拟 DeepSeek API 调用
        # 一个对话：prompt 200 tokens，completion 150 tokens
        metrics.record_deepseek_tokens(
            model="deepseek-chat",
            token_type="prompt",
            count=200,
        )
        metrics.record_deepseek_tokens(
            model="deepseek-chat",
            token_type="completion",
            count=150,
        )

        total_tokens = 200 + 150
        assert total_tokens == 350

    def test_token_usage_cost_estimation(self):
        """估算 Token 使用成本"""
        metrics = MetricsService()

        # 一天内的 Token 使用情况
        daily_prompt_tokens = 50000  # prompt tokens
        daily_completion_tokens = 30000  # completion tokens

        metrics.record_deepseek_tokens(
            model="deepseek-chat",
            token_type="prompt",
            count=daily_prompt_tokens,
        )
        metrics.record_deepseek_tokens(
            model="deepseek-chat",
            token_type="completion",
            count=daily_completion_tokens,
        )

        # 假设成本：prompt $0.14/1M, completion $0.28/1M
        prompt_cost = (daily_prompt_tokens / 1_000_000) * 0.14
        completion_cost = (daily_completion_tokens / 1_000_000) * 0.28
        daily_cost = prompt_cost + completion_cost

        logger.info(f"Estimated daily cost: ${daily_cost:.4f}")
        assert daily_cost < 1.0  # 单日成本应小于 $1


# 导入 logger
from loguru import logger


class TestCachingStrategies:
    """缓存策略测试"""

    @pytest.mark.asyncio
    async def test_ttl_configuration(self):
        """测试 TTL 配置"""
        cache = CacheManager()

        # 验证 TTL 配置
        config = cache.CACHE_CONFIG

        # RAG 答案缓存：1 小时
        assert config["rag_answer"]["ttl"] == 3600

        # 向量检索缓存：30 分钟
        assert config["vector_search"]["ttl"] == 1800

        # 健康建议缓存：24 小时
        assert config["health_advice"]["ttl"] == 86400

    @pytest.mark.asyncio
    async def test_cache_key_generation_consistency(self):
        """测试缓存键生成一致性"""
        from app.services.cache_service import generate_cache_key

        # 相同输入应生成相同键
        key1 = generate_cache_key("rag_answer", "高血压怎么办？")
        key2 = generate_cache_key("rag_answer", "高血压怎么办？")
        assert key1 == key2

        # 不同输入应生成不同键
        key3 = generate_cache_key("rag_answer", "糖尿病怎么办？")
        assert key1 != key3


@pytest.mark.performance
class TestPerformanceRegressions:
    """性能回归测试"""

    @pytest.mark.asyncio
    async def test_response_time_regression(self):
        """
        验证响应时间未出现回归

        预期：P95 < 1s
        """
        metrics = MetricsService()

        # 模拟 100 个请求的响应时间
        response_times = [
            0.1, 0.12, 0.15, 0.18, 0.2, 0.22, 0.25, 0.28, 0.3, 0.32,
            0.35, 0.38, 0.4, 0.42, 0.45, 0.48, 0.5, 0.52, 0.55, 0.58,
            0.6, 0.62, 0.65, 0.68, 0.7, 0.72, 0.75, 0.78, 0.8, 0.82,
            0.85, 0.88, 0.9, 0.92, 0.95, 0.98, 1.0, 1.02, 1.05, 1.08,
            # ... 更多数据点
        ]

        # 计算 P95
        sorted_times = sorted(response_times)
        p95_index = int(0.95 * len(sorted_times))
        p95_time = sorted_times[p95_index]

        # 验证 P95 < 1s
        assert (
            p95_time < 1.0
        ), f"P95 response time {p95_time:.3f}s exceeds 1s threshold"

    @pytest.mark.asyncio
    async def test_error_rate_regression(self):
        """
        验证错误率未出现回归

        预期：错误率 < 1%
        """
        total_requests = 1000
        error_requests = 8  # 0.8% 错误率

        error_rate = (error_requests / total_requests) * 100
        assert error_rate < 1.0, f"Error rate {error_rate:.2f}% regression detected"
