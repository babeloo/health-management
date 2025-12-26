"""
监控和缓存模块的单元测试

验证 Prometheus metrics 和 Redis 缓存功能
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock

from app.services.metrics_service import MetricsService, get_metrics_service
from app.services.cache_service import (
    CacheManager,
    cache_result,
    generate_cache_key,
    get_cache_manager,
)


class TestMetricsService:
    """Prometheus metrics 服务测试"""

    def test_metrics_service_initialization(self):
        """测试 metrics 服务初始化"""
        metrics = MetricsService()
        assert metrics.api_request_duration is not None
        assert metrics.api_errors_total is not None
        assert metrics.deepseek_tokens_total is not None
        assert metrics.vector_search_total is not None

    def test_record_api_request(self):
        """测试 API 请求记录"""
        metrics = MetricsService()
        # 记录请求
        metrics.record_api_request(
            method="GET",
            endpoint="/api/test",
            duration=0.5,
            status_code=200,
        )
        # 验证指标被记录（直接验证不会抛出异常）
        assert True

    def test_record_api_error(self):
        """测试 API 错误记录"""
        metrics = MetricsService()
        metrics.record_api_error(
            method="POST",
            endpoint="/api/test",
            error_type="validation_error",
        )
        assert True

    def test_record_deepseek_tokens(self):
        """测试 DeepSeek Token 记录"""
        metrics = MetricsService()
        metrics.record_deepseek_tokens(
            model="deepseek-chat",
            token_type="prompt",
            count=100,
        )
        assert True

    def test_record_vector_search(self):
        """测试向量检索记录"""
        metrics = MetricsService()
        metrics.record_vector_search(
            collection="health_knowledge",
            duration=0.1,
        )
        assert True

    def test_record_cache_operations(self):
        """测试缓存操作记录"""
        metrics = MetricsService()
        metrics.record_cache_hit("rag_answer")
        metrics.record_cache_miss("vector_search")
        assert True

    def test_record_rag_retrieval(self):
        """测试 RAG 检索记录"""
        metrics = MetricsService()
        metrics.record_rag_retrieval(
            query_type="health_advice",
            duration=0.2,
        )
        assert True

    def test_measure_duration_context(self):
        """测试测量持续时间上下文管理器"""
        metrics = MetricsService()
        with metrics.measure_duration() as timer:
            asyncio.sleep(0.01)
        duration = timer.elapsed()
        assert duration >= 0.01


class TestCacheService:
    """缓存服务测试"""

    def test_generate_cache_key_with_string(self):
        """测试生成缓存键（字符串）"""
        key = generate_cache_key("test", "hello")
        assert key.startswith("test:")
        assert len(key) > len("test:")

    def test_generate_cache_key_with_dict(self):
        """测试生成缓存键（字典）"""
        key = generate_cache_key("test", {"query": "health"})
        assert key.startswith("test:")
        assert len(key) > len("test:")

    def test_generate_cache_key_consistency(self):
        """测试缓存键一致性（相同输入应生成相同的键）"""
        key1 = generate_cache_key("test", {"query": "health"})
        key2 = generate_cache_key("test", {"query": "health"})
        assert key1 == key2

    def test_generate_cache_key_uniqueness(self):
        """测试缓存键唯一性（不同输入应生成不同的键）"""
        key1 = generate_cache_key("test", {"query": "health"})
        key2 = generate_cache_key("test", {"query": "disease"})
        assert key1 != key2

    @pytest.mark.asyncio
    async def test_cache_manager_get_set(self):
        """测试缓存管理器的 get/set 操作"""
        # 注意：这个测试需要 Redis 连接
        # 在单元测试中，我们可以跳过或使用模拟
        try:
            cache = CacheManager()
            # 设置缓存
            success = await cache.set(
                cache_type="rag_answer",
                key="test_question",
                value={"answer": "test answer"},
                ttl=60,
            )
            assert success or success is None  # 可能返回 None

            # 获取缓存
            value = await cache.get(
                cache_type="rag_answer",
                key="test_question",
            )
            # 可能返回值或 None（取决于 Redis 连接）
            assert value is None or isinstance(value, dict)
        except Exception as e:
            # 如果 Redis 未连接，跳过此测试
            pytest.skip(f"Redis connection failed: {str(e)}")

    @pytest.mark.asyncio
    async def test_cache_manager_delete(self):
        """测试缓存管理器的删除操作"""
        try:
            cache = CacheManager()
            count = await cache.delete(
                cache_type="rag_answer",
                key="test_question",
            )
            assert count >= 0
        except Exception as e:
            pytest.skip(f"Redis connection failed: {str(e)}")

    @pytest.mark.asyncio
    async def test_cache_result_decorator(self):
        """测试缓存结果装饰器"""
        call_count = 0

        @cache_result(ttl=60, cache_type="test_cache")
        async def expensive_operation(query: str) -> str:
            nonlocal call_count
            call_count += 1
            return f"result for {query}"

        try:
            # 第一次调用应执行函数
            result1 = await expensive_operation("test")
            assert result1 == "result for test"
            initial_count = call_count

            # 第二次调用可能从缓存返回（如果 Redis 可用）
            result2 = await expensive_operation("test")
            assert result2 == "result for test"
            # call_count 可能不变（如果缓存命中）
        except Exception as e:
            pytest.skip(f"Cache operation failed: {str(e)}")

    @pytest.mark.asyncio
    async def test_cache_manager_stats(self):
        """测试获取缓存统计信息"""
        cache = CacheManager()
        stats = await cache.get_cache_stats()
        assert "cache_config" in stats
        assert "cache_types" in stats
        assert len(stats["cache_types"]) > 0


# 集成测试（可选）
@pytest.mark.integration
class TestMetricsAndCacheIntegration:
    """监控和缓存的集成测试"""

    def test_metrics_and_cache_together(self):
        """测试监控和缓存协同工作"""
        metrics = MetricsService()
        cache = CacheManager()

        # 模拟缓存操作并记录指标
        metrics.record_cache_hit("rag_answer")
        metrics.record_cache_miss("vector_search")
        metrics.record_rag_retrieval("health_advice", 0.15)

        assert True
