# ================================
# Stage 1: 构建阶段
# ================================
FROM python:3.11-slim AS builder

WORKDIR /app

# 安装构建依赖和 uv
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    pip install --no-cache-dir uv && \
    rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 使用 uv 创建虚拟环境并安装依赖
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install --no-cache -r requirements.txt

# ================================
# Stage 2: 生产阶段
# ================================
FROM python:3.11-slim AS production

WORKDIR /app

# 安装 dumb-init（优雅处理信号）
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

# 从构建阶段复制虚拟环境
COPY --from=builder /opt/venv /opt/venv

# 复制应用代码
COPY . .

# 创建非 root 用户
RUN groupadd -g 1001 python && \
    useradd -r -u 1001 -g python fastapi && \
    chown -R fastapi:python /app

USER fastapi

# 设置环境变量
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health').read()"

# 使用 dumb-init 启动
CMD ["dumb-init", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
