# ================================
# Stage 1: 构建阶段
# ================================
FROM python:3.11-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache gcc musl-dev libffi-dev openssl-dev cargo

# 安装 uv
RUN pip install --no-cache-dir uv

# 复制依赖文件
COPY requirements.txt .

# 使用 uv 安装依赖到虚拟环境
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install --no-cache -r requirements.txt

# ================================
# Stage 2: 生产阶段
# ================================
FROM python:3.11-alpine AS production

# 设置工作目录
WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache libffi openssl

# 从构建阶段复制虚拟环境
COPY --from=builder /opt/venv /opt/venv

# 复制应用代码
COPY . .

# 创建非 root 用户
RUN addgroup -g 1001 -S python && \
    adduser -S fastapi -u 1001 && \
    chown -R fastapi:python /app

# 切换到非 root 用户
USER fastapi

# 设置环境变量
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# 暴露端口
EXPOSE 8001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health').read()"

# 启动应用
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
