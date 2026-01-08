"""
健康检查 API 端点

提供服务健康检查和依赖服务状态检查
"""

from fastapi import APIRouter, status
from loguru import logger
from typing import Dict, Any

from app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
async def health_check():
    """
    服务健康检查

    返回服务基本信息和状态
    """
    return {
        "status": "healthy",
        "service": "AI Service",
        "version": "0.1.0",
        "environment": settings.environment,
    }


@router.get("/dependencies")
async def check_dependencies():
    """
    依赖服务状态检查

    检查 Qdrant、Redis、MongoDB 等依赖服务的连接状态
    """
    dependencies_status = {}

    # 检查 Qdrant
    try:
        from app.services.qdrant_service import get_qdrant_service

        qdrant = get_qdrant_service()
        collections = qdrant.list_collections()
        dependencies_status["qdrant"] = {
            "status": "healthy",
            "url": settings.qdrant_url,
            "collections_count": len(collections),
        }
    except Exception as e:
        logger.error(f"Qdrant health check failed: {str(e)}")
        dependencies_status["qdrant"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    # 检查 MongoDB
    try:
        from app.services.conversation_service import conversation_service

        # 尝试执行一个简单的查询
        await conversation_service.collection.find_one({})
        dependencies_status["mongodb"] = {
            "status": "healthy",
            "url": settings.mongodb_url,
            "database": settings.mongodb_db_name,
        }
    except Exception as e:
        logger.error(f"MongoDB health check failed: {str(e)}")
        dependencies_status["mongodb"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    # 检查 Redis
    try:
        from app.services.redis_service import redis_service

        await redis_service.ping()
        dependencies_status["redis"] = {
            "status": "healthy",
            "host": settings.redis_host,
            "port": settings.redis_port,
        }
    except Exception as e:
        logger.error(f"Redis health check failed: {str(e)}")
        dependencies_status["redis"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    # 检查 DeepSeek API
    try:
        from app.services.deepseek_client import get_deepseek_client

        deepseek = get_deepseek_client()
        stats = deepseek.get_usage_stats()
        dependencies_status["deepseek"] = {
            "status": "healthy",
            "model": settings.deepseek_model,
            "total_requests": stats["requests"],
        }
    except Exception as e:
        logger.error(f"DeepSeek health check failed: {str(e)}")
        dependencies_status["deepseek"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    # 判断整体状态
    all_healthy = all(dep.get("status") == "healthy" for dep in dependencies_status.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "dependencies": dependencies_status,
    }
