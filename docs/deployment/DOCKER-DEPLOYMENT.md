# Docker 容器化部署指南

本文档提供智慧慢病管理系统的完整 Docker 容器化部署方案。

## 目录

- [架构概览](#架构概览)
- [环境准备](#环境准备)
- [快速开始](#快速开始)
- [构建镜像](#构建镜像)
- [运行服务](#运行服务)
- [环境变量配置](#环境变量配置)
- [服务管理](#服务管理)
- [日志查看](#日志查看)
- [健康检查](#健康检查)
- [故障排查](#故障排查)
- [生产环境部署](#生产环境部署)
- [性能优化](#性能优化)

## 架构概览

### 服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Network                        │
│                        (health-mgmt)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ frontend-web │  │frontend-     │  │   backend    │      │
│  │   (React)    │  │  patient     │  │  (NestJS)    │      │
│  │  Port: 3000  │  │  (Uni-app)   │  │  Port: 5000  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────┴────────┐                        │
│                    │   ai-service   │                        │
│                    │   (FastAPI)    │                        │
│                    │   Port: 8001   │                        │
│                    └───────┬────────┘                        │
│                            │                                 │
│  ┌─────────────────────────┴──────────────────────────┐     │
│  │              基础设施服务层                         │     │
│  ├────────────┬──────────┬──────────┬──────────┬──────┤     │
│  │ PostgreSQL │  Redis   │ InfluxDB │  Qdrant  │ EMQX │     │
│  │  (5432)    │  (6379)  │  (8086)  │  (6333)  │(1883)│     │
│  ├────────────┼──────────┴──────────┴──────────┴──────┤     │
│  │  MongoDB   │              MinIO                     │     │
│  │  (27017)   │         (9000/9001)                    │     │
│  └────────────┴────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 端口映射

| 服务             | 容器端口 | 主机端口 | 说明                |
| ---------------- | -------- | -------- | ------------------- |
| backend          | 5000     | 5000     | NestJS 后端 API     |
| ai-service       | 8001     | 8001     | Python AI 服务      |
| frontend-web     | 80       | 3000     | React 管理端        |
| frontend-patient | 80       | 3001     | Uni-app 患者端 (H5) |
| postgres         | 5432     | 5432     | PostgreSQL 数据库   |
| redis            | 6379     | 6379     | Redis 缓存          |
| influxdb         | 8086     | 8086     | InfluxDB 时序数据库 |
| qdrant           | 6333     | 6333     | Qdrant 向量数据库   |
| mongodb          | 27017    | 27017    | MongoDB 消息存储    |
| emqx             | 1883     | 1883     | MQTT Broker         |
| emqx (Dashboard) | 18083    | 18083    | EMQX 管理界面       |
| minio            | 9000     | 9000     | MinIO API           |
| minio (Console)  | 9001     | 9001     | MinIO 管理界面      |

## 环境准备

### 系统要求

- **操作系统**: Linux / macOS / Windows (WSL2)
- **Docker**: >= 20.10
- **Docker Compose**: >= 2.0
- **内存**: >= 8GB (推荐 16GB)
- **磁盘空间**: >= 20GB

### 安装 Docker

**Linux (Ubuntu/Debian)**:

```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

**macOS**:

```bash
# 使用 Homebrew 安装
brew install --cask docker

# 或下载 Docker Desktop
# https://www.docker.com/products/docker-desktop
```

**Windows**:

```bash
# 安装 WSL2
wsl --install

# 下载并安装 Docker Desktop for Windows
# https://www.docker.com/products/docker-desktop
```

### 配置 Docker

**Linux 用户权限**:

```bash
# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker
```

**Docker 资源限制** (Docker Desktop):

- CPU: >= 4 核
- Memory: >= 8GB
- Swap: >= 2GB
- Disk: >= 20GB

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd intl-health-mgmt
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量（必须配置 DEEPSEEK_API_KEY）
vim .env
```

**必须配置的环境变量**:

```bash
# DeepSeek API Key（必填）
DEEPSEEK_API_KEY=your-deepseek-api-key

# JWT Secret（生产环境必须修改）
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# 数据库密码（生产环境建议修改）
DB_PASSWORD=admin123
REDIS_PASSWORD=redis123
INFLUX_PASSWORD=influx123
INFLUX_TOKEN=my-super-secret-auth-token
MONGO_PASSWORD=mongo123
MINIO_PASSWORD=minio123
EMQX_PASSWORD=emqx123
```

### 3. 启动所有服务

```bash
# 构建并启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 4. 验证部署

```bash
# 检查所有服务健康状态
docker compose ps

# 访问服务
# 后端 API: http://localhost:5000/health
# AI 服务: http://localhost:8001/health
# 医生/管理端: http://localhost:3000
# 患者端: http://localhost:3001
# EMQX Dashboard: http://localhost:18083 (admin/emqx123)
# MinIO Console: http://localhost:9001 (admin/minio123)
```

## 构建镜像

### 构建所有镜像

```bash
# 构建所有服务镜像
docker compose build

# 构建时不使用缓存
docker compose build --no-cache

# 并行构建（加速）
docker compose build --parallel
```

### 构建单个服务

```bash
# 构建后端服务
docker compose build backend

# 构建 AI 服务
docker compose build ai-service

# 构建前端服务
docker compose build frontend-web frontend-patient
```

### 查看镜像

```bash
# 查看所有镜像
docker images | grep intl-health-mgmt

# 查看镜像大小
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

### 镜像优化

所有 Dockerfile 已采用以下优化策略:

1. **多阶段构建**: 分离构建和运行环境，减小镜像体积
2. **Alpine 基础镜像**: 使用轻量级 Alpine Linux
3. **依赖缓存**: 优化 COPY 顺序，利用 Docker 层缓存
4. **非 root 用户**: 提高安全性
5. **健康检查**: 内置健康检查机制

**预期镜像大小**:

- backend: ~200MB
- ai-service: ~500MB
- frontend-web: ~50MB
- frontend-patient: ~50MB

## 运行服务

### 启动服务

```bash
# 启动所有服务（后台运行）
docker compose up -d

# 启动指定服务
docker compose up -d backend ai-service

# 启动并查看日志
docker compose up

# 重新创建容器
docker compose up -d --force-recreate
```

### 停止服务

```bash
# 停止所有服务
docker compose stop

# 停止指定服务
docker compose stop backend

# 停止并删除容器
docker compose down

# 停止并删除容器、网络、卷
docker compose down -v
```

### 重启服务

```bash
# 重启所有服务
docker compose restart

# 重启指定服务
docker compose restart backend

# 重启并重新构建
docker compose up -d --build
```

### 扩展服务

```bash
# 扩展后端服务到 3 个实例
docker compose up -d --scale backend=3

# 注意：需要配置负载均衡器（如 Nginx）
```

## 环境变量配置

### .env 文件结构

```bash
# ================================
# 数据库配置
# ================================
DB_PASSWORD=admin123
REDIS_PASSWORD=redis123
INFLUX_PASSWORD=influx123
INFLUX_TOKEN=my-super-secret-auth-token
MONGO_PASSWORD=mongo123

# ================================
# 应用配置
# ================================
# JWT Secret（生产环境必须修改）
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# DeepSeek API Key（必填）
DEEPSEEK_API_KEY=your-deepseek-api-key

# ================================
# 对象存储配置
# ================================
MINIO_USER=admin
MINIO_PASSWORD=minio123

# ================================
# MQTT 配置
# ================================
MQTT_USERNAME=admin
MQTT_PASSWORD=emqx123
EMQX_HOST=emqx
EMQX_PASSWORD=emqx123
```

### 生产环境配置建议

⚠️ **安全警告**: 生产环境必须修改所有默认密码！

```bash
# 生成强密码
openssl rand -base64 32

# 生成 JWT Secret
openssl rand -hex 64
```

**生产环境检查清单**:

- [ ] 修改所有数据库密码
- [ ] 修改 JWT_SECRET
- [ ] 配置 DEEPSEEK_API_KEY
- [ ] 启用 HTTPS（使用 Nginx 反向代理）
- [ ] 配置防火墙规则
- [ ] 启用日志轮转
- [ ] 配置备份策略
- [ ] 设置资源限制

## 服务管理

### 查看服务状态

```bash
# 查看所有服务状态
docker compose ps

# 查看详细信息
docker compose ps -a

# 查看服务资源使用
docker stats
```

### 进入容器

```bash
# 进入后端容器
docker compose exec backend sh

# 进入 AI 服务容器
docker compose exec ai-service sh

# 以 root 用户进入
docker compose exec -u root backend sh
```

### 执行命令

```bash
# 在后端容器中执行 Prisma 迁移
docker compose exec backend pnpm prisma migrate deploy

# 在 AI 服务容器中执行 Python 脚本
docker compose exec ai-service python scripts/init_rag.py

# 查看 PostgreSQL 数据库
docker compose exec postgres psql -U admin -d health_mgmt
```

### 数据库管理

**PostgreSQL**:

```bash
# 连接数据库
docker compose exec postgres psql -U admin -d health_mgmt

# 备份数据库
docker compose exec postgres pg_dump -U admin health_mgmt > backup.sql

# 恢复数据库
docker compose exec -T postgres psql -U admin health_mgmt < backup.sql
```

**Redis**:

```bash
# 连接 Redis
docker compose exec redis redis-cli -a redis123

# 查看所有键
docker compose exec redis redis-cli -a redis123 --no-auth-warning KEYS '*'

# 清空缓存
docker compose exec redis redis-cli -a redis123 FLUSHALL
```

**InfluxDB**:

```bash
# 进入 InfluxDB CLI
docker compose exec influxdb influx

# 查询数据
docker compose exec influxdb influx query 'from(bucket:"health_data") |> range(start: -1h)'
```

## 日志查看

### 查看日志

```bash
# 查看所有服务日志
docker compose logs

# 实时跟踪日志
docker compose logs -f

# 查看指定服务日志
docker compose logs backend
docker compose logs ai-service

# 查看最近 100 行日志
docker compose logs --tail=100 backend

# 查看带时间戳的日志
docker compose logs -t backend
```

### 日志文件位置

应用日志挂载到主机:

- 后端日志: `./backend/logs/`
- AI 服务日志: `./ai-service/logs/`

```bash
# 查看后端日志文件
tail -f backend/logs/app.log

# 查看 AI 服务日志
tail -f ai-service/logs/app.log
```

### 日志轮转配置

生产环境建议配置日志轮转（logrotate）:

```bash
# /etc/logrotate.d/intl-health-mgmt
/path/to/intl-health-mgmt/*/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```

## 健康检查

### 内置健康检查

所有服务都配置了健康检查:

```bash
# 查看健康状态
docker compose ps

# 健康状态说明
# healthy: 服务正常
# unhealthy: 服务异常
# starting: 服务启动中
```

### 手动健康检查

```bash
# 后端服务
curl http://localhost:5000/health

# AI 服务
curl http://localhost:8001/health

# 前端服务
curl http://localhost:3000/health
curl http://localhost:3001/health

# PostgreSQL
docker compose exec postgres pg_isready -U admin

# Redis
docker compose exec redis redis-cli -a redis123 --no-auth-warning ping
```

### 健康检查配置

健康检查参数说明:

- `interval`: 检查间隔（默认 30s）
- `timeout`: 超时时间（默认 10s）
- `start_period`: 启动宽限期（默认 40s）
- `retries`: 重试次数（默认 3 次）

## 故障排查

### 常见问题

#### 1. 服务启动失败

**问题**: 容器启动后立即退出

```bash
# 查看容器日志
docker compose logs backend

# 查看容器退出状态
docker compose ps -a
```

**可能原因**:

- 环境变量配置错误
- 依赖服务未就绪
- 端口被占用
- 资源不足

**解决方案**:

```bash
# 检查环境变量
docker compose config

# 检查端口占用
netstat -tuln | grep 5000

# 增加启动宽限期
# 修改 docker-compose.yml 中的 start_period
```

#### 2. 数据库连接失败

**问题**: 应用无法连接数据库

```bash
# 检查数据库是否运行
docker compose ps postgres

# 检查数据库日志
docker compose logs postgres

# 测试数据库连接
docker compose exec backend node -e "require('pg').Client({connectionString: process.env.DATABASE_URL}).connect().then(() => console.log('OK')).catch(console.error)"
```

**解决方案**:

- 确认数据库服务已启动
- 检查 DATABASE_URL 配置
- 确认网络连通性
- 等待数据库初始化完成

#### 3. 镜像构建失败

**问题**: Docker 构建过程出错

```bash
# 清理构建缓存
docker builder prune

# 重新构建（不使用缓存）
docker compose build --no-cache backend

# 查看详细构建日志
docker compose build --progress=plain backend
```

#### 4. 容器内存不足

**问题**: 容器因内存不足被杀死

```bash
# 查看容器资源使用
docker stats

# 增加内存限制（docker-compose.yml）
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

#### 5. 网络连接问题

**问题**: 容器间无法通信

```bash
# 检查网络
docker network ls
docker network inspect intl-health-mgmt_health-mgmt

# 测试网络连通性
docker compose exec backend ping postgres
docker compose exec backend nc -zv postgres 5432
```

### 调试技巧

**1. 查看容器详细信息**:

```bash
docker inspect <container_name>
```

**2. 查看容器进程**:

```bash
docker compose top backend
```

**3. 查看容器文件系统变化**:

```bash
docker diff <container_name>
```

**4. 导出容器日志**:

```bash
docker compose logs backend > backend.log 2>&1
```

**5. 临时禁用健康检查**:

```yaml
# docker-compose.yml
services:
  backend:
    # healthcheck:
    #   disable: true
```

## 生产环境部署

### 部署前检查

```bash
# 1. 检查配置
docker compose config

# 2. 验证环境变量
docker compose config | grep -E "PASSWORD|SECRET|KEY"

# 3. 测试构建
docker compose build

# 4. 运行测试
docker compose run --rm backend pnpm test
docker compose run --rm ai-service pytest
```

### 部署步骤

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 构建镜像
docker compose build --no-cache

# 3. 停止旧服务
docker compose down

# 4. 启动新服务
docker compose up -d

# 5. 运行数据库迁移
docker compose exec backend pnpm prisma migrate deploy

# 6. 验证部署
docker compose ps
curl http://localhost:5000/health
```

### 零停机部署

使用 Docker Swarm 或 Kubernetes 实现零停机部署:

**Docker Swarm**:

```bash
# 初始化 Swarm
docker swarm init

# 部署 Stack
docker stack deploy -c docker-compose.yml health-mgmt

# 更新服务
docker service update --image backend:latest health-mgmt_backend
```

### 反向代理配置（Nginx）

```nginx
# /etc/nginx/sites-available/health-mgmt
upstream backend {
    server localhost:5000;
}

upstream frontend_web {
    server localhost:3000;
}

upstream frontend_patient {
    server localhost:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://frontend_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name app.yourdomain.com;

    location / {
        proxy_pass http://frontend_patient;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### SSL/TLS 配置

使用 Let's Encrypt 配置 HTTPS:

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com -d app.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

## 性能优化

### 资源限制

在 `docker-compose.yml` 中配置资源限制:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 数据库优化

**PostgreSQL**:

```bash
# 调整 PostgreSQL 配置
docker compose exec postgres psql -U admin -d health_mgmt -c "ALTER SYSTEM SET shared_buffers = '256MB';"
docker compose exec postgres psql -U admin -d health_mgmt -c "ALTER SYSTEM SET effective_cache_size = '1GB';"
docker compose restart postgres
```

**Redis**:

```bash
# 配置 Redis 最大内存
docker compose exec redis redis-cli -a redis123 CONFIG SET maxmemory 512mb
docker compose exec redis redis-cli -a redis123 CONFIG SET maxmemory-policy allkeys-lru
```

### 镜像优化

```bash
# 清理未使用的镜像
docker image prune -a

# 清理构建缓存
docker builder prune

# 清理所有未使用资源
docker system prune -a --volumes
```

### 监控和告警

推荐使用以下工具:

- **Prometheus + Grafana**: 指标监控
- **ELK Stack**: 日志聚合
- **cAdvisor**: 容器监控
- **Portainer**: Docker 管理界面

## 备份和恢复

### 数据备份

```bash
# 备份所有数据卷
docker run --rm -v intl-health-mgmt_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data

# 备份数据库
docker compose exec postgres pg_dump -U admin health_mgmt | gzip > backup_$(date +%Y%m%d).sql.gz

# 备份 InfluxDB
docker compose exec influxdb influx backup /tmp/backup
docker compose cp influxdb:/tmp/backup ./influxdb_backup
```

### 数据恢复

```bash
# 恢复数据卷
docker run --rm -v intl-health-mgmt_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /

# 恢复数据库
gunzip < backup_20250101.sql.gz | docker compose exec -T postgres psql -U admin health_mgmt
```

## 附录

### 常用命令速查

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 重新构建
docker compose build --no-cache

# 进入容器
docker compose exec backend sh

# 执行命令
docker compose exec backend pnpm prisma migrate deploy

# 清理资源
docker system prune -a --volumes
```

### 环境变量参考

完整的环境变量列表请参考 `.env.example` 文件。

### 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [NestJS 部署指南](https://docs.nestjs.com/deployment)
- [FastAPI 部署指南](https://fastapi.tiangolo.com/deployment/)

---

**文档版本**: v1.0.0
**最后更新**: 2025-12-31
**维护者**: Vakyi Health Team
