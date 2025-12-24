#!/bin/bash

# DeepSeek API 集成 - 快速启动脚本

set -e

echo "========================================="
echo "DeepSeek API 集成 - 快速启动"
echo "========================================="
echo ""

# 检查虚拟环境
if [ ! -d ".venv" ]; then
    echo "❌ 虚拟环境不存在，请先运行: uv venv"
    exit 1
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，从 .env.example 复制..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请配置 DEEPSEEK_API_KEY"
    echo ""
fi

# 检查 API Key
if grep -q "your_deepseek_api_key_here" .env; then
    echo "⚠️  警告：DeepSeek API Key 未配置"
    echo "请在 .env 文件中设置 DEEPSEEK_API_KEY"
    echo ""
    echo "获取 API Key:"
    echo "1. 访问 https://platform.deepseek.com/"
    echo "2. 注册并登录"
    echo "3. 创建 API Key"
    echo "4. 复制到 .env 文件的 DEEPSEEK_API_KEY"
    echo ""
    read -p "是否继续启动服务？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# 激活虚拟环境
echo "📦 激活虚拟环境..."
source .venv/bin/activate || source .venv/Scripts/activate

# 安装依赖
echo "📦 检查依赖..."
pip list | grep -q "fastapi" || {
    echo "安装依赖..."
    uv pip install -r requirements.txt
}

echo ""
echo "========================================="
echo "启动 AI 服务"
echo "========================================="
echo ""
echo "服务地址: http://localhost:8000"
echo "API 文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 启动服务
uvicorn app.main:app --reload --port 8000
