"""
Health Check Router

健康检查和状态监控端点
"""

from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter, status

from app.core.config import settings

router = APIRouter(tags=["健康检查"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> Dict[str, str]:
    """
    健康检查端点

    返回服务状态信息
    """
    return {"status": "ok"}


@router.get("/status", status_code=status.HTTP_200_OK)
async def get_status() -> Dict:
    """
    获取服务详细状态

    返回：
        - service: 服务名称
        - version: 服务版本
        - environment: 运行环境
        - status: 服务状态
        - timestamp: 当前时间戳
    """
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "debug_mode": settings.debug,
    }
