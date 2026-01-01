"""
性能监控中间件

自动记录每个 API 请求的性能指标
"""

import time
from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from loguru import logger

from app.services.metrics_service import get_metrics_service


class MetricsMiddleware(BaseHTTPMiddleware):
    """
    Prometheus 性能监控中间件

    自动记录 API 请求的响应时间、错误等指标
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        处理请求并记录性能指标

        Args:
            request: HTTP 请求对象
            call_next: 下一个中间件或路由处理器

        Returns:
            HTTP 响应对象
        """
        metrics = get_metrics_service()
        method = request.method
        endpoint = request.url.path

        # 记录开始时间
        start_time = time.time()

        try:
            # 调用下一个中间件或路由处理器
            response = await call_next(request)
            duration = time.time() - start_time

            # 记录成功的请求
            metrics.record_api_request(
                method=method,
                endpoint=endpoint,
                duration=duration,
                status_code=response.status_code,
            )

            logger.debug(
                f"API request: {method} {endpoint} - {response.status_code} ({duration:.3f}s)"
            )

            return response

        except Exception as e:
            duration = time.time() - start_time

            # 记录错误
            error_type = type(e).__name__
            metrics.record_api_error(
                method=method,
                endpoint=endpoint,
                error_type=error_type,
            )

            logger.error(
                f"API error: {method} {endpoint} - {error_type} ({duration:.3f}s): {str(e)}"
            )

            # 重新抛出异常，让 FastAPI 的错误处理器处理
            raise
