"""
Test Main Application

测试 FastAPI 主应用的基本功能
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root():
    """测试根路径端点"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert data["status"] == "healthy"
    assert "docs" in data


def test_health_check():
    """测试健康检查端点"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_v1_health():
    """测试 API v1 健康检查端点"""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_v1_status():
    """测试 API v1 状态端点"""
    response = client.get("/api/v1/status")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert "environment" in data
    assert "status" in data
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "debug_mode" in data
