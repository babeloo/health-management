# 并行任务执行计划

**创建时间**: 2026-01-01
**项目经理**: @pm
**执行模式**: Git Worktree 并行开发

---

## 任务概览

| 任务ID | 任务名称 | 负责人 | 优先级 | 预计工时 | Worktree路径 |
|--------|---------|--------|--------|----------|--------------|
| 24 | 患者端AI健康科普后端集成 | @ai-python + @mobile | P0 | 0.5天 | `../worktrees/task24-ai-integration` |
| 38 | Docker容器化 | @data-infra | P1 | 2天 | `../worktrees/task38-docker` |

---

## 可行性分析

### ✅ 适合并行开发的理由

1. **技术领域完全独立**
   - 任务24：前端集成（frontend-patient/）
   - 任务38：基础设施（Dockerfile、docker-compose）

2. **无代码冲突风险**
   - 修改的文件路径完全不重叠
   - 无共享配置文件修改

3. **无功能依赖关系**
   - 任务24依赖AI服务API（已完成✅）
   - 任务38是独立的容器化工作

4. **符合tasks.md并行规则**
   - 不同技术agent负责
   - 无前置依赖冲突

---

## 执行计划

### 阶段1：Worktree创建 ✅ 已完成

```bash
# 创建任务24工作区
git worktree add ../worktrees/task24-ai-integration -b feature/task24-ai-integration

# 创建任务38工作区
git worktree add ../worktrees/task38-docker -b feature/task38-docker
```

**验证结果**:
```
D:/Code/ai-gen/intl-health-mgmt-parallel/intl-health-mgmt                 ad60190 [master]
D:/Code/ai-gen/intl-health-mgmt-parallel/worktrees/task24-ai-integration  ad60190 [feature/task24-ai-integration]
D:/Code/ai-gen/intl-health-mgmt-parallel/worktrees/task38-docker          ad60190 [feature/task38-docker]
```

---

### 阶段2：任务24执行（@ai-python + @mobile）

**工作目录**: `D:\Code\ai-gen\intl-health-mgmt-parallel\worktrees\task24-ai-integration`

#### 子任务24.1：验证AI服务API可用性（0.5小时）

**负责人**: @ai-python

**验收标准**:
- [ ] POST /api/v1/ai/chat 接口返回200
- [ ] GET /api/v1/ai/conversations/:userId 接口返回200
- [ ] POST /api/v1/ai/health-advice 接口返回200
- [ ] JWT认证正常工作
- [ ] 响应格式符合前端预期

**执行步骤**:
```bash
cd worktrees/task24-ai-integration/ai-service

# 1. 启动AI服务
uvicorn app.main:app --reload --port 8001

# 2. 测试API端点
curl -X POST http://localhost:8001/api/v1/ai/chat \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'

# 3. 检查响应格式
# 预期响应: {"success": true, "data": {...}, "message": "..."}
```

#### 子任务24.2：前后端联调测试（1小时）

**负责人**: @mobile

**验收标准**:
- [ ] 前端成功调用AI聊天接口
- [ ] 对话历史正确加载
- [ ] 健康建议接口正常工作
- [ ] 错误处理机制完善
- [ ] 加载状态显示正确

**执行步骤**:
```bash
cd worktrees/task24-ai-integration/frontend-patient

# 1. 更新API配置
# 编辑 src/config/env.ts
# AI_SERVICE_URL: 'http://localhost:8001'

# 2. 启动前端开发服务器
pnpm dev:h5

# 3. 测试对话流程
# - 打开AI聊天页面
# - 发送测试消息
# - 验证响应显示
# - 检查对话历史加载
```

#### 子任务24.3：E2E测试验收（0.5小时）

**负责人**: @mobile + @ai-python

**验收标准**:
- [ ] 完整对话流程测试通过
- [ ] 科普内容推荐正常
- [ ] AI Agent自然语言打卡测试通过
- [ ] 错误场景处理正确
- [ ] 性能指标达标（响应时间<2秒）

**执行步骤**:
```bash
# 1. 运行E2E测试套件
cd worktrees/task24-ai-integration/frontend-patient
pnpm test:e2e

# 2. 手动测试关键场景
# - 场景1：AI问答对话
# - 场景2：查看对话历史
# - 场景3：获取健康建议
# - 场景4：网络错误处理
```

---

### 阶段3：任务38执行（@data-infra）

**工作目录**: `D:\Code\ai-gen\intl-health-mgmt-parallel\worktrees\task38-docker`

#### 子任务38.1：编写Dockerfile（4小时）

**负责人**: @data-infra

**验收标准**:
- [ ] 4个Dockerfile创建完成
- [ ] 多阶段构建优化镜像大小
- [ ] 健康检查配置正确
- [ ] 环境变量配置完整
- [ ] 镜像构建成功

**执行步骤**:
```bash
cd worktrees/task38-docker

# 1. 创建backend/Dockerfile
# - 基础镜像: node:18-alpine
# - 多阶段构建: builder + runner
# - 安装依赖: pnpm install
# - 构建: pnpm build
# - 健康检查: /api/v1/health

# 2. 创建ai-service/Dockerfile
# - 基础镜像: python:3.11-slim
# - 安装依赖: uv pip install
# - 暴露端口: 8001
# - 健康检查: /health

# 3. 创建frontend-patient/Dockerfile
# - 基础镜像: node:18-alpine (builder) + nginx:alpine (runner)
# - 构建: pnpm build:h5
# - Nginx配置: /etc/nginx/conf.d/default.conf

# 4. 创建frontend-web/Dockerfile
# - 基础镜像: node:18-alpine (builder) + nginx:alpine (runner)
# - 构建: pnpm build
# - Nginx配置: /etc/nginx/conf.d/default.conf

# 5. 测试镜像构建
docker build -t chronic-backend:latest ./backend
docker build -t chronic-ai:latest ./ai-service
docker build -t chronic-patient:latest ./frontend-patient
docker build -t chronic-web:latest ./frontend-web
```

#### 子任务38.2：编写docker-compose.prod.yml（2小时）

**负责人**: @data-infra

**验收标准**:
- [ ] 所有服务定义完整
- [ ] 服务依赖关系正确
- [ ] 网络配置合理
- [ ] 数据卷持久化配置
- [ ] 环境变量配置完整

**执行步骤**:
```bash
cd worktrees/task38-docker

# 1. 创建docker-compose.prod.yml
# 包含以下服务:
# - backend (NestJS)
# - ai-service (FastAPI)
# - frontend-patient (Nginx)
# - frontend-web (Nginx)
# - postgres (数据库)
# - redis (缓存)
# - influxdb (时序数据)
# - qdrant (向量数据库)
# - mongodb (消息存储)
# - emqx (MQTT Broker)
# - minio (对象存储)

# 2. 配置网络
# - chronic-network (bridge)

# 3. 配置数据卷
# - postgres-data
# - redis-data
# - influxdb-data
# - qdrant-data
# - mongodb-data
# - minio-data

# 4. 配置健康检查
# - 每个服务添加healthcheck
```

#### 子任务38.3：本地测试容器化部署（2小时）

**负责人**: @data-infra

**验收标准**:
- [ ] 所有容器启动成功
- [ ] 服务间通信正常
- [ ] 健康检查通过
- [ ] 数据持久化验证
- [ ] 性能指标达标

**执行步骤**:
```bash
cd worktrees/task38-docker

# 1. 启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 2. 检查容器状态
docker-compose -f docker-compose.prod.yml ps

# 3. 验证服务健康
curl http://localhost:5000/api/v1/health  # Backend
curl http://localhost:8001/health          # AI Service
curl http://localhost:8080                 # Patient Frontend
curl http://localhost:8081                 # Web Frontend

# 4. 测试服务间通信
# - Backend -> PostgreSQL
# - Backend -> Redis
# - Backend -> InfluxDB
# - AI Service -> Qdrant
# - AI Service -> MongoDB

# 5. 测试数据持久化
# - 停止容器
# - 重新启动
# - 验证数据未丢失

# 6. 性能测试
# - 并发请求测试
# - 响应时间测试
# - 资源占用监控
```

---

## 阶段4：代码合并

### 任务24合并流程

```bash
# 1. 切换到任务24工作区
cd worktrees/task24-ai-integration

# 2. 提交代码
git add frontend-patient/
git commit -m "feat: 实现患者端AI健康科普后端集成 (#24)

- 验证AI服务API可用性
- 前后端联调测试通过
- E2E测试验收通过

关联需求: #5, #6"

# 3. 推送到远程
git push origin feature/task24-ai-integration

# 4. 创建Pull Request
# 标题: feat: 实现患者端AI健康科普后端集成 (#24)
# 描述: 详细说明实现内容和测试结果

# 5. 合并到master
# 等待代码审查通过后合并
```

### 任务38合并流程

```bash
# 1. 切换到任务38工作区
cd worktrees/task38-docker

# 2. 提交代码
git add Dockerfile docker-compose.prod.yml
git commit -m "feat: 实现Docker容器化部署 (#38)

- 创建4个Dockerfile（backend、ai-service、frontend-patient、frontend-web）
- 编写生产环境docker-compose.prod.yml
- 本地测试容器化部署通过

关联需求: 无（部署任务）"

# 3. 推送到远程
git push origin feature/task38-docker

# 4. 创建Pull Request
# 标题: feat: 实现Docker容器化部署 (#38)
# 描述: 详细说明实现内容和测试结果

# 5. 合并到master
# 等待代码审查通过后合并
```

---

## 阶段5：清理Worktree

```bash
# 1. 切换回主工作区
cd D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt

# 2. 删除任务24工作区
git worktree remove ../worktrees/task24-ai-integration

# 3. 删除任务38工作区
git worktree remove ../worktrees/task38-docker

# 4. 删除本地分支（可选）
git branch -d feature/task24-ai-integration
git branch -d feature/task38-docker

# 5. 验证清理结果
git worktree list
```

---

## 注意事项

### 1. 代码冲突预防

- ✅ 两个任务修改的文件路径完全不重叠
- ✅ 无共享配置文件修改
- ⚠️ 如果需要修改根目录的 `.env.example`，需要协调

### 2. 测试环境隔离

- 任务24：使用开发环境（localhost:5000, localhost:8001）
- 任务38：使用Docker环境（容器内部网络）
- 建议：任务38测试时停止本地开发服务器

### 3. 依赖管理

- 任务24：无新增依赖
- 任务38：无新增依赖（仅Docker配置）

### 4. 文档更新

- 任务24完成后更新：`frontend-patient/README.md`
- 任务38完成后更新：`docs/deployment/DOCKER.md`

### 5. 进度同步

- 每日站会：汇报各自进度和阻塞问题
- 使用 `tasks.md` 实时更新任务状态
- 遇到阻塞立即通知项目经理

---

## 风险管理

### 风险1：AI服务API不稳定

**影响**: 任务24前后端联调失败
**概率**: 低
**应对**: @ai-python提前验证API稳定性，准备降级方案（Mock数据）

### 风险2：Docker镜像构建失败

**影响**: 任务38延期
**概率**: 中
**应对**: @data-infra提前测试基础镜像，准备多阶段构建优化方案

### 风险3：Worktree合并冲突

**影响**: 代码合并延迟
**概率**: 极低
**应对**: 严格遵循文件路径隔离原则，合并前进行冲突检查

---

## 验收标准

### 任务24验收标准

- [ ] AI聊天接口正常工作
- [ ] 对话历史正确加载
- [ ] 健康建议接口正常工作
- [ ] E2E测试全部通过
- [ ] 代码通过ESLint和TypeScript检查
- [ ] 更新 `tasks.md` 任务状态
- [ ] 更新 `CHANGELOG.md` 变更记录

### 任务38验收标准

- [ ] 4个Dockerfile创建完成
- [ ] docker-compose.prod.yml配置完整
- [ ] 所有容器启动成功
- [ ] 服务间通信正常
- [ ] 健康检查通过
- [ ] 数据持久化验证通过
- [ ] 更新 `tasks.md` 任务状态
- [ ] 更新 `CHANGELOG.md` 变更记录
- [ ] 创建部署文档 `docs/deployment/DOCKER.md`

---

## 时间线

| 时间 | 任务24 | 任务38 |
|------|--------|--------|
| Day 1 上午 | 验证API可用性 | 编写backend/Dockerfile |
| Day 1 下午 | 前后端联调测试 | 编写ai-service/Dockerfile |
| Day 2 上午 | E2E测试验收 | 编写frontend Dockerfile |
| Day 2 下午 | 代码提交和PR | 编写docker-compose.prod.yml |
| Day 3 上午 | - | 本地测试容器化部署 |
| Day 3 下午 | - | 代码提交和PR |

**预计完成时间**: 3天（任务24: 0.5天，任务38: 2天，考虑1天缓冲）

---

## 总结

本次并行开发计划充分利用了Git Worktree的优势，实现了两个独立任务的并行推进。通过严格的文件路径隔离和清晰的责任分工，最大程度降低了代码冲突风险，预计可节省1.5天的开发时间。

**关键成功因素**:
1. 技术领域完全独立
2. 无代码冲突风险
3. 清晰的验收标准
4. 完善的风险管理

**下一步行动**:
1. @ai-python 和 @mobile 开始任务24开发
2. @data-infra 开始任务38开发
3. @pm 每日跟踪进度并更新 `tasks.md`
