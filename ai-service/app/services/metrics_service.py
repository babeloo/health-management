"""
性能监控模块

使用 Prometheus 记录关键性能指标：
- API 响应时间
- 错误率
- DeepSeek API Token 使用量
- 向量检索次数
"""

import time
from contextlib import contextmanager
from typing import Optional

from prometheus_client import Counter, Histogram, start_http_server
from loguru import logger

from app.core.config import settings


class MetricsService:
    """
    Prometheus 监控服务类

    记录应用性能指标
    """

    def __init__(self):
        """初始化监控指标"""
        # API 响应时间直方图（单位：秒）
        self.api_request_duration = Histogram(
            name="api_request_duration_seconds",
            documentation="API 请求响应时间（单位：秒）",
            buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0),
            labelnames=["method", "endpoint", "status"],
        )

        # API 错误计数器
        self.api_errors_total = Counter(
            name="api_errors_total",
            documentation="API 请求错误总数",
            labelnames=["method", "endpoint", "error_type"],
        )

        # DeepSeek API Token 使用计数器
        self.deepseek_tokens_total = Counter(
            name="deepseek_tokens_total",
            documentation="DeepSeek API 使用的 Token 总数",
            labelnames=["model", "type"],  # token_type: prompt or completion
        )

        # 向量检索次数计数器
        self.vector_search_total = Counter(
            name="vector_search_total",
            documentation="向量检索次数",
            labelnames=["collection"],
        )

        # 向量检索响应时间直方图
        self.vector_search_duration = Histogram(
            name="vector_search_duration_seconds",
            documentation="向量检索响应时间（单位：秒）",
            buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0),
            labelnames=["collection"],
        )

        # 缓存命中计数器
        self.cache_hits_total = Counter(
            name="cache_hits_total",
            documentation="缓存命中总数",
            labelnames=["cache_type"],
        )

        # 缓存未命中计数器
        self.cache_misses_total = Counter(
            name="cache_misses_total",
            documentation="缓存未命中总数",
            labelnames=["cache_type"],
        )

        # RAG 检索次数计数器
        self.rag_retrievals_total = Counter(
            name="rag_retrievals_total",
            documentation="RAG 检索次数",
            labelnames=["query_type"],
        )

        # RAG 检索响应时间直方图
        self.rag_retrieval_duration = Histogram(
            name="rag_retrieval_duration_seconds",
            documentation="RAG 检索响应时间（单位：秒）",
            buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0),
            labelnames=["query_type"],
        )

        logger.info("Metrics service initialized")

    def record_api_request(
        self,
        method: str,
        endpoint: str,
        duration: float,
        status_code: int,
    ) -> None:
        """
        记录 API 请求指标

        Args:
            method: HTTP 方法（GET, POST 等）
            endpoint: API 端点
            duration: 请求耗时（秒）
            status_code: HTTP 状态码
        """
        self.api_request_duration.labels(
            method=method,
            endpoint=endpoint,
            status=status_code,
        ).observe(duration)

    def record_api_error(
        self,
        method: str,
        endpoint: str,
        error_type: str,
    ) -> None:
        """
        记录 API 错误

        Args:
            method: HTTP 方法
            endpoint: API 端点
            error_type: 错误类型（e.g., validation_error, timeout, internal_error）
        """
        self.api_errors_total.labels(
            method=method,
            endpoint=endpoint,
            error_type=error_type,
        ).inc()

    def record_deepseek_tokens(
        self,
        model: str,
        token_type: str,
        count: int,
    ) -> None:
        """
        记录 DeepSeek API Token 使用

        Args:
            model: 模型名称
            token_type: Token 类型（prompt 或 completion）
            count: Token 数量
        """
        self.deepseek_tokens_total.labels(
            model=model,
            type=token_type,
        ).inc(count)

    def record_vector_search(
        self,
        collection: str,
        duration: float,
    ) -> None:
        """
        记录向量检索指标

        Args:
            collection: 集合名称
            duration: 检索耗时（秒）
        """
        self.vector_search_total.labels(collection=collection).inc()
        self.vector_search_duration.labels(collection=collection).observe(duration)

    def record_cache_hit(self, cache_type: str) -> None:
        """
        记录缓存命中

        Args:
            cache_type: 缓存类型（e.g., rag_answer, search_result, health_advice）
        """
        self.cache_hits_total.labels(cache_type=cache_type).inc()

    def record_cache_miss(self, cache_type: str) -> None:
        """
        记录缓存未命中

        Args:
            cache_type: 缓存类型
        """
        self.cache_misses_total.labels(cache_type=cache_type).inc()

    def record_rag_retrieval(
        self,
        query_type: str,
        duration: float,
    ) -> None:
        """
        记录 RAG 检索指标

        Args:
            query_type: 查询类型（e.g., health_advice, symptom_analysis, faq）
            duration: 检索耗时（秒）
        """
        self.rag_retrievals_total.labels(query_type=query_type).inc()
        self.rag_retrieval_duration.labels(query_type=query_type).observe(duration)

    @contextmanager
    def measure_duration(self):
        """
        测量代码块执行时间的上下文管理器

        Usage:
            with metrics.measure_duration() as timer:
                # 执行操作
                pass
            duration = timer.elapsed()
        """
        start_time = time.time()

        class Timer:
            def elapsed(self) -> float:
                return time.time() - start_time

        yield Timer()


# 全局单例
_metrics_service: Optional[MetricsService] = None


def get_metrics_service() -> MetricsService:
    """
    获取 Metrics 服务实例（单例模式）

    Returns:
        MetricsService: Metrics 服务实例
    """
    global _metrics_service
    if _metrics_service is None:
        _metrics_service = MetricsService()
    return _metrics_service


def start_metrics_server(port: int = 8000) -> None:
    """
    启动 Prometheus metrics HTTP 服务器

    Args:
        port: Prometheus metrics 服务器端口
    """
    try:
        start_http_server(port)
        logger.info(f"Prometheus metrics server started on port {port}")
    except Exception as e:
        logger.error(f"Failed to start metrics server: {str(e)}")
        # 不中断主应用
