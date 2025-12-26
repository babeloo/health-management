"""
监控指标 API 端点

暴露 Prometheus metrics
"""

from fastapi import APIRouter, Response

from prometheus_client import generate_latest, CONTENT_TYPE_LATEST


router = APIRouter(tags=["监控"])


@router.get("/metrics", response_class=Response)
async def metrics():
    """
    Prometheus metrics 端点

    返回 Prometheus 格式的监控指标

    Returns:
        Prometheus metrics 文本格式
    """
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
