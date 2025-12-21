# 智慧慢病管理系统

> 深度融合 DeepSeek 大模型的 AI 健康管理平台

## 项目概述

本系统提供"院内+院外"、"线上+线下"一体化慢病管理服务，覆盖患者、医生、健康管理师三个角色。

**当前阶段**：MVP 开发（Node.js + Python 微服务架构）

## 技术栈

- **后端**：Node.js 18 + NestJS + Prisma
- **AI服务**：Python 3.11 + FastAPI + DeepSeek API
- **患者端**：Uni-app (Vue 3) - 微信小程序/H5/App
- **医生/管理端**：React 18 + TypeScript + Ant Design Pro
- **数据库**：PostgreSQL 15 + InfluxDB 2.7 + Redis 7 + Qdrant + MongoDB

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Python >= 3.11
- Docker & Docker Compose

### 安装依赖

```bash
# 安装 pnpm（如果还没有）
npm install -g pnpm

# 安装项目依赖
pnpm install

# 安装 Git hooks
pnpm prepare
```

### 启动开发环境

```bash
# 启动所有基础设施服务（PostgreSQL, Redis, InfluxDB, Qdrant, EMQX, MinIO）
docker-compose up -d

# 后端开发
cd backend
pnpm dev

# AI 服务开发
cd ai-service
uvicorn app.main:app --reload

# 患者端开发（微信小程序）
cd frontend-patient
pnpm dev:mp-weixin

# 医生/管理端开发
cd frontend-web
pnpm dev
```

## 项目结构

```
intl-health-mgmt/
├── backend/              # NestJS 后端服务
├── ai-service/           # Python FastAPI AI 服务
├── frontend-patient/     # Uni-app 患者端
├── frontend-web/         # React 医生/管理端
├── .claude/              # Claude Code 配置和文档
│   ├── agents/           # 专业化 AI agents
│   └── specs/            # 需求、设计、任务文档
├── docs/                 # 项目文档
├── scripts/              # 工具脚本
└── docker-compose.yml    # Docker 编排配置
```

## 开发规范

详见 [CLAUDE.md](./CLAUDE.md) 文档。

### Commit 规范

```bash
feat: 添加血压打卡功能 (#3)
fix: 修复积分计算错误
docs: 更新 API 文档
test: 添加打卡模块单元测试
```

### 代码检查

项目配置了 pre-commit hooks，在提交时自动执行：

- ESLint 代码检查
- Prettier 格式化
- TypeScript 类型检查
- 单元测试（针对修改的文件）

## 文档

- [需求文档](./.claude/specs/chronic-disease-management/requirements.md)
- [设计文档](./.claude/specs/chronic-disease-management/design.md)
- [任务清单](./.claude/specs/chronic-disease-management/tasks.md)
- [开发指南](./CLAUDE.md)

## 里程碑

- [x] Week 1-2: 项目基础设施搭建
- [ ] Week 2-6: 后端核心服务开发
- [ ] Week 4-7: AI 服务开发
- [ ] Week 5-9: 患者端开发
- [ ] Week 7-10: 医生/管理端开发
- [ ] Week 9-10: IoT 设备接入
- [ ] Week 10-12: 部署、测试与上线

## License

Copyright © 2025 智慧慢病管理系统团队
