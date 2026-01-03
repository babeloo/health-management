"""
FastAPI Main Application

AI 服务的主入口文件
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from app.routers import ai_router, education_router
from app.middleware.metrics_middleware import MetricsMiddleware
from app.api.v1 import metrics
from app.config import settings

app = FastAPI(
    title="智慧慢病管理系统 - AI 服务",
    description="提供 RAG 知识库检索、AI 对话、辅助诊断等功能",
    version="0.1.0",
)

# 配置 HTTPBearer 安全方案（用于 Swagger UI）
security = HTTPBearer()

# CORS 配置
cors_origins = (
    ["*"]
    if (settings.cors_origins or "").strip() == "*"
    else [o.strip() for o in (settings.cors_origins or "").split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    # Bearer Token 不依赖 Cookie，关闭 credentials 可避免与 "*" 组合导致的安全/兼容问题
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 监控中间件
app.add_middleware(MetricsMiddleware)

# 注册路由
app.include_router(ai_router)
app.include_router(education_router)
app.include_router(metrics.router)


@app.get("/")
async def root():
    """健康检查端点"""
    return {
        "service": "AI Service",
        "version": "0.1.0",
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
