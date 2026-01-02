# Docker 容器化部署指南

## 概述

本文档详细说明如何使用 Docker 和 Docker Compose 部署智慧慢病管理系统。

## 架构说明

### 服务组成（11个服务）

**基础设施服务（7个）**：
1. PostgreSQL - 主数据库
2. Redis - 缓存和会话存储
3. InfluxDB - 时序数据库（血压、血糖）
4. Qdrant - 向量数据库（RAG知识库）
5. MongoDB - 消息存储
6. EMQX - MQTT消息代理
7. MinIO - 对象存储

**应用服务（4个）**：
1. Backend - NestJS后端服务
2. AI Service - Python AI服务
3. Frontend Web - React医生/管理端
4. Frontend Patient - Uni-app患者端（H5）

### 网络架构

```
┌─────────────────────────────────────────┐
│         health-mgmt-frontend            │
│  (前端网络 - 172.21.0.0/16)              │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ frontend-web │  │ frontend-patient│ │
│  └──────┬───────┘  └────────┬────────┘ │
│         │                   │          │
└─────────┼───────────────────┼──────────┘
          │                   │
          └───────┬───────────┘
                  │
          ┌───────▼────────┐
          │    backend     │
          └───────┬────────┘
                  │
┌─────────────────┼─────────────────────────┐
│         health-mgmt-backend               │
│  (后端网络 - 172.20.0.0/16)                │
│                 │                         │
│  ┌──────────────┼──────────────────────┐  │
│  │              │                      │  │
│  │  ┌───────────▼──────┐  ┌──────────┐│  │
│  │  │   ai-service     │  │ postgres ││  │
│  │  └──────────────────┘  └──────────┘│  │
│  │  ┌──────────┐  ┌──────────┐        │  │
│  │  │  redis   │  │ influxdb │        │  │
│  │  └──────────┘  └──────────┘        │  │
│  │  ┌──────────┐  ┌──────────┐        │  │
│  │  │  qdrant  │  │ mongodb  │        │  │
│  │  └──────────┘  └──────────┘        │  │
│  │  ┌──────────┐  ┌──────────┐        │  │
│  │  │   emqx   │  │  minio   │        │  │
│  │  └──────────┘  └──────────┘        │  │
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

## 前置要求

### 系统要求

- **操作系统**：Linux (Ubuntu 20.04+) / macOS / Windows 10+
- **CPU**：最低 4核，推荐 8核
- **内存**：最低 8GB，推荐 16GB
- **磁盘**：最低 50GB 可用空间

### 软件要求

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

### 安装 Docker

**Ubuntu/Debian**：
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**macOS**：
```bash
brew install --cask docker
```

**Windows**：
下载并安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)

## 部署步骤

### 1. 克隆代码仓库

```bash
git clone <repository-url>
cd intl-health-mgmt
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.production.example .env.production

# 编辑环境变量（必须修改所有密码和密钥）
vim .env.production
```

**重要**：必须修改以下配置项：
- 所有数据库密码
- JWT_SECRET（至少32位随机字符串）
- ENCRYPTION_KEY（32字节随机密钥）
- DEEPSEEK_API_KEY（DeepSeek API密钥）
- MINIO_USER 和 MINIO_PASSWORD

生成随机密钥：
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### 3. 构建镜像

```bash
# 使用生产配置构建所有镜像
docker-compose -f docker-compose.prod.yml build

# 查看构建的镜像
docker images | grep health-mgmt
```

**预期镜像大小**：
- backend: < 500MB
- ai-service: < 1GB
- frontend-web: < 50MB
- frontend-patient: < 50MB

### 4. 启动服务

```bash
# 启动所有服务
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. 初始化数据库

```bash
# 等待 PostgreSQL 启动完成
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# 运行数据库迁移
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:migrate:deploy

# 初始化种子数据（可选）
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:seed
```

### 6. 验证部署

```bash
# 检查所有服务健康状态
docker-compose -f docker-compose.prod.yml ps

# 测试后端 API
curl http://localhost:5000/health

# 测试 AI 服务
curl http://localhost:8001/health

# 访问前端
# 医生/管理端：http://localhost:3000
# 患者端：http://localhost:3001
```

## 服务端口映射

| 服务 | 内部端口 | 外部端口 | 说明 |
|------|---------|---------|------|
| PostgreSQL | 5432 | 5432 | 主数据库 |
| Redis | 6379 | 6379 | 缓存 |
| InfluxDB | 8086 | 8086 | 时序数据库 |
| Qdrant | 6333 | 6333 | 向量数据库 |
| MongoDB | 27017 | 27017 | 消息存储 |
| EMQX MQTT | 1883 | 1883 | MQTT协议 |
| EMQX Dashboard | 18083 | 18083 | EMQX管理界面 |
| MinIO API | 9000 | 9000 | 对象存储API |
| MinIO Console | 9001 | 9001 | MinIO管理界面 |
| Backend | 5000 | 5000 | 后端API |
| AI Service | 8001 | 8001 | AI服务API |
| Frontend Web | 80 | 3000 | 医生/管理端 |
| Frontend Patient | 80 | 3001 | 患者端 |

## 资源限制

每个服务都配置了资源限制，防止单个服务占用过多资源：

| 服务 | CPU限制 | 内存限制 | CPU预留 | 内存预留 |
|------|---------|---------|---------|---------|
| PostgreSQL | 2核 | 2GB | 0.5核 | 512MB |
| Redis | 1核 | 512MB | 0.25核 | 128MB |
| InfluxDB | 2核 | 2GB | 0.5核 | 512MB |
| Qdrant | 2核 | 2GB | 0.5核 | 512MB |
| MongoDB | 2核 | 2GB | 0.5核 | 512MB |
| EMQX | 2核 | 1GB | 0.5核 | 256MB |
| MinIO | 2核 | 2GB | 0.5核 | 512MB |
| Backend | 2核 | 2GB | 0.5核 | 512MB |
| AI Service | 2核 | 4GB | 1核 | 1GB |
| Frontend Web | 0.5核 | 256MB | 0.1核 | 64MB |
| Frontend Patient | 0.5核 | 256MB | 0.1核 | 64MB |

## 数据持久化

所有数据都存储在 Docker 卷中，确保容器重启后数据不丢失：

```bash
# 查看所有数据卷
docker volume ls | grep task38-docker

# 备份数据卷
docker run --rm -v task38-docker_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data

# 恢复数据卷
docker run --rm -v task38-docker_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

## 常用运维命令

### 查看日志

```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f backend

# 查看最近100行日志
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### 重启服务

```bash
# 重启所有服务
docker-compose -f docker-compose.prod.yml restart

# 重启特定服务
docker-compose -f docker-compose.prod.yml restart backend

# 重新构建并重启
docker-compose -f docker-compose.prod.yml up -d --build backend
```

### 扩容服务

```bash
# 扩展后端服务到3个实例
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# 注意：需要配置负载均衡器（如Nginx）
```

### 停止和清理

```bash
# 停止所有服务
docker-compose -f docker-compose.prod.yml stop

# 停止并删除容器（保留数据卷）
docker-compose -f docker-compose.prod.yml down

# 停止并删除容器和数据卷（危险操作）
docker-compose -f docker-compose.prod.yml down -v

# 清理未使用的镜像
docker image prune -a
```

## 监控和健康检查

### 健康检查端点

所有服务都配置了健康检查：

```bash
# 后端健康检查
curl http://localhost:5000/health

# AI服务健康检查
curl http://localhost:8001/health

# 前端健康检查
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### 查看容器健康状态

```bash
# 查看所有容器健康状态
docker ps --format "table {{.Names}}\t{{.Status}}"

# 查看特定容器详细健康信息
docker inspect --format='{{json .State.Health}}' health-backend | jq
```

## 故障排查

### 服务无法启动

```bash
# 1. 查看服务日志
docker-compose -f docker-compose.prod.yml logs backend

# 2. 检查环境变量
docker-compose -f docker-compose.prod.yml config

# 3. 检查端口占用
netstat -tuln | grep 5000

# 4. 检查磁盘空间
df -h
```

### 数据库连接失败

```bash
# 1. 检查 PostgreSQL 是否启动
docker-compose -f docker-compose.prod.yml ps postgres

# 2. 测试数据库连接
docker-compose -f docker-compose.prod.yml exec postgres psql -U admin -d health_mgmt -c "SELECT 1"

# 3. 检查网络连通性
docker-compose -f docker-compose.prod.yml exec backend ping postgres
```

### 内存不足

```bash
# 1. 查看容器资源使用情况
docker stats

# 2. 调整资源限制（编辑 docker-compose.prod.yml）
# 3. 重启服务
docker-compose -f docker-compose.prod.yml up -d
```

## 安全建议

1. **密码管理**：
   - 使用强密码（至少12位，包含大小写字母、数字、特殊字符）
   - 定期轮换密码（建议每3个月）
   - 使用密钥管理工具（如 HashiCorp Vault）

2. **网络安全**：
   - 生产环境不要暴露数据库端口到公网
   - 使用防火墙限制访问
   - 配置 SSL/TLS 加密

3. **镜像安全**：
   - 定期更新基础镜像
   - 扫描镜像漏洞（使用 `docker scan`）
   - 使用私有镜像仓库

4. **日志管理**：
   - 配置日志轮转，防止磁盘占满
   - 敏感信息不要记录到日志
   - 集中化日志管理（如 ELK Stack）

## 性能优化

1. **镜像优化**：
   - 使用多阶段构建减小镜像大小
   - 使用 alpine 基础镜像
   - 合理使用 .dockerignore

2. **缓存优化**：
   - 合理配置 Redis 缓存策略
   - 使用 CDN 加速静态资源

3. **数据库优化**：
   - 定期执行 VACUUM（PostgreSQL）
   - 配置合适的连接池大小
   - 监控慢查询并优化

## 备份和恢复

### 数据库备份

```bash
# PostgreSQL 备份
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U admin health_mgmt > backup_$(date +%Y%m%d).sql

# InfluxDB 备份
docker-compose -f docker-compose.prod.yml exec influxdb influx backup /tmp/backup
docker cp health-influxdb:/tmp/backup ./influxdb_backup_$(date +%Y%m%d)

# MongoDB 备份
docker-compose -f docker-compose.prod.yml exec mongodb mongodump --out /tmp/backup
docker cp health-mongodb:/tmp/backup ./mongodb_backup_$(date +%Y%m%d)
```

### 数据恢复

```bash
# PostgreSQL 恢复
cat backup_20240101.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U admin health_mgmt

# InfluxDB 恢复
docker cp ./influxdb_backup_20240101 health-influxdb:/tmp/backup
docker-compose -f docker-compose.prod.yml exec influxdb influx restore /tmp/backup

# MongoDB 恢复
docker cp ./mongodb_backup_20240101 health-mongodb:/tmp/backup
docker-compose -f docker-compose.prod.yml exec mongodb mongorestore /tmp/backup
```

## 升级和回滚

### 升级流程

```bash
# 1. 备份数据
./scripts/backup.sh

# 2. 拉取最新代码
git pull origin main

# 3. 重新构建镜像
docker-compose -f docker-compose.prod.yml build

# 4. 停止旧服务
docker-compose -f docker-compose.prod.yml stop

# 5. 启动新服务
docker-compose -f docker-compose.prod.yml up -d

# 6. 验证服务
./scripts/health-check.sh
```

### 回滚流程

```bash
# 1. 切换到旧版本
git checkout <old-version-tag>

# 2. 重新构建镜像
docker-compose -f docker-compose.prod.yml build

# 3. 停止当前服务
docker-compose -f docker-compose.prod.yml stop

# 4. 恢复数据（如果需要）
./scripts/restore.sh backup_20240101

# 5. 启动旧版本服务
docker-compose -f docker-compose.prod.yml up -d
```

## 生产环境建议

1. **使用 Kubernetes**：对于大规模部署，建议迁移到 Kubernetes
2. **配置负载均衡**：使用 Nginx 或云服务商的负载均衡器
3. **启用监控**：集成 Prometheus + Grafana
4. **配置告警**：设置关键指标告警（CPU、内存、磁盘、错误率）
5. **自动化部署**：使用 CI/CD 流程（GitHub Actions、GitLab CI）

## 参考资料

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [NestJS 部署指南](https://docs.nestjs.com/deployment)
- [FastAPI 部署指南](https://fastapi.tiangolo.com/deployment/)
