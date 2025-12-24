"""
FastAPI Main Application

AI 服务的主入口文件
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理

    在应用启动和关闭时执行必要的操作
    """
    # 启动时执行
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"Server: {settings.host}:{settings.port}")

    yield

    # 关闭时执行
    logger.info(f"Shutting down {settings.app_name}")


# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.app_name,
    description="提供 RAG 知识库检索、AI 对话、辅助诊断等功能",
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production() else None,  # 生产环境关闭文档
    redoc_url="/redoc" if not settings.is_production() else None,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.is_production() else ["*"],
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)


# 注册路由
app.include_router(api_router)


@app.get("/", tags=["Root"])
async def root():
    """
    根路径端点

    返回服务基本信息
    """
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "healthy",
        "docs": "/docs" if not settings.is_production() else "disabled",
    }


@app.get("/health", tags=["健康检查"])
async def health_check():
    """
    健康检查端点（兼容性端点）

    为了向后兼容，保留根路径下的 /health 端点
    """
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
