"""
API v1 Router

聚合所有 v1 版本的 API 路由
"""

from fastapi import APIRouter

from app.api.v1 import health, ai

api_router = APIRouter(prefix="/api/v1")

# 注册健康检查路由
api_router.include_router(health.router)

# 注册 AI 服务路由
api_router.include_router(ai.router)

__all__ = ["api_router"]
