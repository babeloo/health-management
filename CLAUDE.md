# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本代码库中工作时提供指导。

## 项目概述

**智慧慢病管理系统** - 深度融合 DeepSeek 大模型的 AI 健康管理平台

本系统提供"院内+院外"、"线上+线下"一体化慢病管理服务，覆盖患者、医生、健康管理师三个角色。采用渐进式演进架构：

- **MVP阶段**（当前）：Node.js + Python 微服务，3-4个月快速上线
- **企业级阶段**（未来）：Java Spring Cloud，支持大规模医疗机构

## 技术架构（MVP阶段）

### Monorepo 结构

```
intl-health-mgmt/
├── backend/              # NestJS 后端服务（Node.js 18 + TypeScript）
├── ai-service/           # AI 服务（Python 3.11 + FastAPI）
├── frontend-patient/     # 患者端（Uni-app Vue 3）
├── frontend-web/         # 医生/管理端（React 18 + TypeScript）
└── .claude/              # Claude Code 配置和文档
    ├── agents/           # 专业化 AI agents 配置
    └── specs/            # 需求、设计、任务文档
```

### 核心技术栈

**后端**：

- 框架：NestJS（单体架构，模块化设计）
- ORM：Prisma
- 认证：JWT + Passport.js + RBAC
- 实时通信：Socket.io
- 任务队列：Bull（基于 Redis）

**数据库**：

- PostgreSQL 15（主数据库）
- InfluxDB 2.7（时序数据：血压、血糖）
- Redis 7（缓存、Session、消息队列）
- Qdrant（向量数据库，RAG 知识库）
- MongoDB（消息存储）

**AI 服务**：

- Python FastAPI + LangChain + LlamaIndex
- DeepSeek API 集成
- RAG（检索增强生成）知识库

**前端**：

- 患者端：Uni-app（编译为微信小程序/H5/App）
- 医生/管理端：React 18 + Ant Design Pro + Zustand

**物联网**：

- MQTT 协议 + EMQX Broker
- 支持血压计、血糖仪等设备数据自动同步

**工具链**：

- 包管理：Node.js 用 **pnpm**，Python 用 **uv**
- 容器化：Docker + Docker Compose
- CI/CD：GitHub Actions

## 开发命令

### 环境准备

```bash
# 启动所有基础设施服务（PostgreSQL, Redis, InfluxDB, Qdrant, EMQX, MinIO）
docker-compose up -d

# 停止所有服务
docker-compose down

# 查看服务日志
docker-compose logs -f [service-name]
```

### 后端开发（NestJS）

```bash
cd backend

# 安装依赖
pnpm install

# 数据库迁移
pnpm prisma migrate dev        # 开发环境迁移
pnpm prisma migrate deploy     # 生产环境迁移
pnpm prisma studio             # 打开 Prisma 数据库 GUI

# 生成 Prisma Client
pnpm prisma generate

# 运行开发服务器
pnpm dev                       # 热重载模式
pnpm start                     # 生产模式

# 代码检查和格式化
pnpm lint                      # ESLint 检查
pnpm format                    # Prettier 格式化

# 测试
pnpm test                      # 运行所有测试
pnpm test:watch                # 监听模式
pnpm test:cov                  # 测试覆盖率
pnpm test:e2e                  # E2E 测试
```

### AI 服务开发（Python FastAPI）

```bash
cd ai-service

# 安装依赖（使用 uv）
uv pip install -r requirements.txt

# 运行开发服务器
uvicorn app.main:app --reload --port 8001

# 运行生产服务器
uvicorn app.main:app --host 0.0.0.0 --port 8001

# 测试
pytest                         # 运行所有测试
pytest tests/test_rag.py       # 运行特定测试
pytest --cov                   # 测试覆盖率
```

### 前端开发

**患者端（Uni-app）：**

```bash
cd frontend-patient

# 安装依赖
pnpm install

# 运行微信小程序
pnpm dev:mp-weixin

# 运行 H5
pnpm dev:h5

# 运行 App
pnpm dev:app

# 构建
pnpm build:mp-weixin
pnpm build:h5
```

**医生/管理端（React）：**

```bash
cd frontend-web

# 安装依赖
pnpm install

# 运行开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 测试
pnpm test
```

### CI/CD 自动化流程

代码推送到 GitHub 后，会自动触发以下检查：

**Pull Request 检查**：

- ✅ 所有单元测试通过
- ✅ 测试覆盖率 ≥ 70%
- ✅ ESLint/Flake8 无错误
- ✅ TypeScript/mypy 类型检查通过
- ✅ Prettier/Black 格式正确
- ✅ 构建成功（Docker 镜像构建）

**部署流程**（合并到 main 分支后）：

```bash
1. 运行所有测试套件
2. 构建 Docker 镜像
3. 推送到 Docker Hub
4. 部署到 Staging 环境
5. 运行 E2E 测试
6. 部署到 Production（需要手动批准）
```

**查看 CI/CD 状态**：

- GitHub Actions 页面：`https://github.com/{org}/{repo}/actions`
- 检查失败时会在 PR 中显示详细错误信息

## 架构关键点

### 1. 微服务通信架构

```
患者端/医生端/管理端
        ↓
  NestJS 后端 (Node.js)
   ↓          ↓
   ↓      Python AI 服务
   ↓         (FastAPI)
   ↓          ↓
PostgreSQL  Qdrant
InfluxDB    DeepSeek API
Redis
```

- **后端 ↔ AI 服务**：通过 HTTP RESTful API 通信
- **前端 ↔ 后端**：RESTful API + WebSocket（实时消息）
- **设备 ↔ 后端**：MQTT 协议（通过 EMQX Broker）

### 2. 数据存储策略

| 数据类型           | 存储方案   | 说明                   |
| ------------------ | ---------- | ---------------------- |
| 用户信息、健康档案 | PostgreSQL | 关系型数据，支持事务   |
| 血压、血糖时序数据 | InfluxDB   | 高效时序数据存储和查询 |
| 消息记录           | MongoDB    | 灵活的文档存储         |
| 向量化知识库       | Qdrant     | RAG 检索，语义搜索     |
| 缓存、排行榜       | Redis      | 高性能缓存，Sorted Set |
| 医疗文档、图片     | MinIO/OSS  | 对象存储               |

### 3. 认证授权流程

- **JWT Token 认证**：24小时有效期
- **RBAC 权限控制**：四种角色（patient, doctor, health_manager, admin）
- **敏感数据加密**：身份证号、病历等字段使用 AES-256-GCM 加密存储
- **跨服务认证**：JWT 在 NestJS 和 Python 服务间透传

### 4. AI 功能集成

- **RAG 知识库**：Qdrant 向量检索 + DeepSeek 生成
- **AI Agent 对话**：支持自然语言打卡、症状咨询
- **辅助诊断**：分析患者数据，生成健康摘要和建议
- **重试机制**：DeepSeek API 调用失败自动重试 3 次
- **免责声明**：所有 AI 建议必须包含"此建议仅供参考，请咨询专业医生"

### 5. 性能优化策略

- **数据库索引**：在高频查询字段上创建索引（role, status, created_at）
- **Redis 缓存**：用户信息缓存 5 分钟，排行榜缓存实时更新
- **分页查询**：所有列表接口支持分页（默认 20 条/页）
- **异步处理**：通知推送、数据同步使用 Bull 队列异步执行
- **前端优化**：React 代码分割（lazy load），图片懒加载

## 关键约束

### 技术约束

⚠️ **重要**：MVP 阶段严格遵守以下约束，不可违反：

1. **后端必须使用 Node.js + NestJS**，禁止引入 Java/Spring Cloud
2. **数据库使用 PostgreSQL**，企业版才迁移 MySQL
3. **Node.js 必须用 pnpm**，Python 必须用 uv
4. **所有 API 响应必须符合 ErrorResponse 格式**（参考 design.md 第 5 章）
5. **TypeScript 必须开启 Strict Mode**
6. **数据库访问仅限 Prisma**，除非复杂聚合分析才手写 SQL

### 安全约束

1. **数据加密**：身份证号、病历必须加密存储
2. **JWT 认证**：所有 API（除登录/注册）必须验证 Token
3. **输入验证**：所有接口必须定义 DTO 并使用 class-validator
4. **XSS 防护**：用户输入必须清理（sanitize-html）
5. **审计日志**：敏感操作（健康数据访问、用户管理）必须记录

### 业务约束

1. **积分规则**：血压打卡 +10 分，用药 +5 分，连续 7 天额外 +20 分
2. **文件大小**：医疗文档单个文件不超过 10MB
3. **打卡限制**：每天每种类型只能打卡一次
4. **AI 免责**：所有 AI 输出必须包含免责声明

## Claude Code Agents 配置

本项目配置了 6 个专业化 AI agents，位于 `.claude/agents/`：

| Agent          | 职责           | 使用场景                           |
| -------------- | -------------- | ---------------------------------- |
| **pm**         | 项目经理       | 任务跟踪、进度管理、团队协调       |
| **architect**  | 系统架构师     | 架构一致性、API 契约、跨服务集成   |
| **backend-ts** | 全栈 TS 工程师 | NestJS 后端、Prisma、React 管理端  |
| **ai-python**  | AI 算法专家    | RAG 检索、DeepSeek 集成、Qdrant    |
| **mobile**     | Uni-app 专家   | 患者端开发、蓝牙集成、跨平台适配   |
| **data-infra** | 数据运维专家   | PostgreSQL、InfluxDB、Docker、MQTT |

**使用方法**：

```
@pm 当前项目进度如何？
@architect 帮我设计用户认证的跨服务调用方案
@backend-ts 创建健康打卡的 Controller 和 Service
@ai-python 实现 RAG 知识库检索功能
@mobile 开发血压打卡页面
@data-infra 编写 InfluxDB 查询最近 7 天血压数据的 Flux 语句
```

## 核心文档

### 必读文档（优先级从高到低）

1. **需求文档**：`.claude/specs/chronic-disease-management/requirements.md`
   - 19 个功能需求，包含验收标准

2. **设计文档**：`.claude/specs/chronic-disease-management/design.md`
   - 技术架构、数据库设计、API 规范、安全方案

3. **任务清单**：`.claude/specs/chronic-disease-management/tasks.md`
   - MVP 阶段 8 个开发阶段、46 个主要任务组
   - 12 周开发计划（Week 1-12）

### 文档优先级规则

在代码实现前，**必须先检查**：

1. `requirements.md` 中的验收标准
2. `design.md` 中对应的技术设计
3. 确认实现符合两份文档的要求

## 开发工作流

### 新功能开发流程

1. **需求分析**（@pm）
   - 在 `tasks.md` 中找到对应任务
   - 在 `requirements.md` 中确认需求编号和验收标准

2. **架构设计**（@architect）
   - 检查 `design.md` 中的设计方案
   - 定义 API 契约和数据模型
   - 确保跨服务调用符合规范

3. **技术实现**（@backend-ts / @ai-python / @mobile / @data-infra）
   - 按照设计文档编写代码
   - 遵循技术约束和安全规范
   - 编写单元测试（覆盖率 > 70%）

4. **任务更新**（@pm）
   - 任务开始时，更新 `tasks.md` 中的任务状态（`- [ ]` → `- [-]`）
   - 记录完成时间和关键决策
   - 确认任务完成并验收后，更新 `tasks.md` 中的任务状态（`- [-]` → `- [x]`）

### Git 工作流

```bash
# 功能分支命名规范
feature/req-{编号}-{简短描述}  # 例：feature/req-3-health-checkin
bugfix/{简短描述}
hotfix/{简短描述}

# Commit 消息规范
feat: 添加血压打卡功能 (#3)
fix: 修复积分计算错误 (#7)
docs: 更新 API 文档
refactor: 重构健康档案查询逻辑
test: 添加打卡模块单元测试
```

### 代码提交前检查

#### Pre-commit Hooks 自动化检查

项目配置了 **husky + lint-staged**，在 `git commit` 时自动执行以下检查：

**后端（NestJS）：**

```bash
# 自动执行的检查（在 git commit 时触发）
1. ESLint 检查 - 代码规范和潜在错误
2. Prettier 格式化 - 代码格式统一
3. TypeScript 类型检查 - 确保类型安全
4. 单元测试（仅针对修改的文件）
```

**AI 服务（Python）：**

```bash
# 自动执行的检查（在 git commit 时触发）
1. Black 格式化 - Python 代码格式
2. Flake8 检查 - 代码规范
3. mypy 类型检查 - 静态类型检查
4. pytest（仅针对修改的文件）
```

**前端（React/Uni-app）：**

```bash
# 自动执行的检查（在 git commit 时触发）
1. ESLint 检查
2. Prettier 格式化
3. TypeScript 类型检查
```

#### 手动检查命令

如果需要手动运行检查（推荐在提交前先执行）：

```bash
# 后端 NestJS
cd backend
pnpm lint          # ESLint 检查
pnpm lint:fix      # 自动修复 ESLint 错误
pnpm format        # Prettier 格式化
pnpm type-check    # TypeScript 类型检查
pnpm test          # 运行所有测试

# AI 服务 Python
cd ai-service
black .            # 格式化代码
flake8 .           # 代码规范检查
mypy .             # 类型检查
pytest             # 运行测试

# 前端 React
cd frontend-web
pnpm lint
pnpm lint:fix
pnpm format
pnpm type-check

# 前端 Uni-app
cd frontend-patient
pnpm lint
pnpm lint:fix
pnpm format
```

#### 常见检查错误修复

**1. ESLint 错误**

```bash
# 自动修复大部分问题
pnpm lint:fix

# 如果有无法自动修复的错误，查看详细信息
pnpm lint
```

**2. TypeScript 类型错误**

```bash
# 查看类型错误详情
pnpm type-check

# 常见修复：
# - 添加类型注解：const name: string = "test"
# - 使用类型断言：value as SomeType
# - 定义接口：interface User { id: number; name: string; }
```

**3. Prettier 格式问题**

```bash
# 自动格式化所有文件
pnpm format

# 检查哪些文件格式不正确（不修复）
pnpm format:check
```

**4. 测试失败**

```bash
# 运行测试并查看失败原因
pnpm test

# 只运行特定测试文件
pnpm test auth.service.spec.ts

# 监听模式（开发时使用）
pnpm test:watch
```

#### 绕过 Pre-commit Hooks（不推荐）

⚠️ **仅在紧急情况下使用**：

```bash
# 跳过 pre-commit hooks（不推荐）
git commit --no-verify -m "commit message"
```

**注意**：跳过检查会导致：

- CI/CD 流程可能失败
- 代码质量下降
- 团队代码风格不一致
- 潜在的 bug 进入代码库

### 代码审查清单

在提交代码前，确保：

- [ ] DTO 验证已定义（使用 class-validator）
- [ ] 敏感数据已加密（身份证号、病历）
- [ ] API 响应符合 ErrorResponse 格式
- [ ] JWT 认证已应用（除登录/注册接口）
- [ ] 数据库查询使用 Prisma（避免原始 SQL）
- [ ] AI 输出包含免责声明
- [ ] 单元测试覆盖率 > 70%
- [ ] TypeScript 无 any 类型（除非必要）
- [ ] **所有自动化检查已通过**（ESLint、Prettier、TypeScript、测试）
- [ ] **Pre-commit hooks 未被跳过**

## 常见陷阱

### ❌ 避免这些错误

1. **不要跳过文档检查**
   - ❌ 直接写代码
   - ✅ 先查 requirements.md 和 design.md

2. **不要使用错误的工具**
   - ❌ Node.js 用 npm/yarn
   - ✅ Node.js 必须用 pnpm

3. **不要混淆阶段**
   - ❌ 在 MVP 阶段引入 Java/Spring Cloud
   - ✅ MVP 使用 Node.js，企业版才用 Java

4. **不要忽略安全约束**
   - ❌ 明文存储身份证号
   - ✅ 使用 AES-256-GCM 加密

5. **不要遗漏 AI 免责声明**
   - ❌ AI 输出："建议您立即就医"
   - ✅ AI 输出："建议您立即就医。此建议仅供参考，请咨询专业医生。"

6. **不要跳过代码检查**
   - ❌ 使用 `git commit --no-verify` 跳过 pre-commit hooks
   - ❌ 忽略 ESLint/TypeScript 错误
   - ❌ 提交未格式化的代码
   - ✅ 让 pre-commit hooks 自动运行
   - ✅ 修复所有检查错误后再提交
   - ✅ 确保测试覆盖率达标

7. **不要直接提交到 main 分支**
   - ❌ `git push origin main`
   - ✅ 创建 feature 分支 → 提交 PR → 代码审查 → 合并

## 项目里程碑（12 周计划）

| 周次    | 里程碑               | 关键交付物                          |
| ------- | -------------------- | ----------------------------------- |
| Week 2  | 开发环境和数据库完成 | Docker Compose 配置、Prisma Schema  |
| Week 6  | 后端核心服务完成     | 认证、用户、健康、积分、通讯模块    |
| Week 7  | AI 服务完成          | DeepSeek 集成、RAG 知识库、AI Agent |
| Week 9  | 患者端完成           | 健康档案、打卡、评估、AI 科普、积分 |
| Week 10 | 医生/管理端完成      | 患者管理、AI 辅助、消息、数据看板   |
| Week 12 | 测试完成并上线       | E2E 测试、性能优化、生产部署        |

## 资源链接

- **NestJS 文档**：https://docs.nestjs.com
- **Prisma 文档**：https://www.prisma.io/docs
- **Uni-app 文档**：https://uniapp.dcloud.net.cn
- **InfluxDB Flux 语法**：https://docs.influxdata.com/flux
- **DeepSeek API**：https://platform.deepseek.com/docs

---

**注意**：本项目处于 MVP 开发阶段，代码尚未编写。所有开发必须严格遵循 `requirements.md` 和 `design.md` 中的规范。
