# 更新日志

本文档记录智慧慢病管理系统 MVP 阶段的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [0.1.0] - 2025-12-22

### ✅ 第一阶段完成：项目基础设施（Week 1-2）

**完成进度**: 100% (23/23 任务) | **完成时间**: 2025-12-22 16:30

### 新增 (Added)

#### 开发环境

- **monorepo 结构**: 创建 backend、ai-service、frontend-patient、frontend-web 子项目
- **pnpm workspace**: 配置共享依赖管理
- **Git hooks**: 集成 husky + lint-staged，自动化代码检查
- **EditorConfig 和 Prettier**: 统一代码格式化标准
- **VS Code 工作区**: 配置推荐扩展和调试配置
- **Docker Compose**: 配置 PostgreSQL、Redis、InfluxDB、Qdrant、EMQX、MongoDB、MinIO 开发环境

#### NestJS 后端服务

- **项目初始化**: 创建 NestJS 应用骨架，采用模块化架构
- **多环境配置**: 支持 development、staging、production 环境
  - 环境变量文件: `.env.development`、`.env.staging`、`.env.production`
  - ConfigModule 动态加载配置
- **全局异常过滤器**: 统一错误响应格式（符合 design.md ErrorResponse 规范）
- **Winston 日志系统**:
  - 集成 nest-winston、winston-daily-rotate-file
  - 支持控制台输出和文件轮转（按日期）
  - 错误日志单独存储（30 天保留）
  - 应用日志 14 天保留
  - 请求日志中间件（记录响应时间和状态码）
- **API 版本控制**: 统一使用 `/api/v1` 前缀
- **全局验证管道**: 集成 class-validator，自动 DTO 验证

#### 代码质量工具

- **ESLint**: 集成 Airbnb 规则 + TypeScript 规则
  - 自定义 NestJS 适配规则
  - 安全规则（no-console、no-param-reassign）
  - 自动修复格式问题
- **TypeScript**: 启用 Strict Mode，确保类型安全
- **Prettier**: 自动格式化，配置 endOfLine: auto

#### 数据库设计与迁移

- **Prisma ORM**:
  - 集成 Prisma Client v5.22.0
  - 配置 PostgreSQL 连接
  - 执行数据库 schema 同步（prisma db push）
- **数据库表** (6 个核心表):
  1. `users` - 用户表（患者、医生、健康管理师、管理员）
  2. `health_records` - 健康档案表
  3. `check_ins` - 健康打卡记录表
  4. `risk_assessments` - 风险评估表
  5. `points_transactions` - 积分交易记录表
  6. `doctor_patient_relations` - 医患关系表
- **数据库索引** (26 个索引):
  - 主键索引: 所有表
  - 唯一约束: username、email、phone、userId+type+checkInDate、doctorId+patientId
  - 查询优化索引: role、status、createdAt、type、riskLevel 等
- **数据库约束**:
  - 外键约束: 所有关联表，级联删除/更新
  - 非空约束: 关键字段
  - 枚举约束: user_role、user_status、gender_type 等
  - 唯一约束: 防止重复打卡、重复关系

### 技术债务 (Deferred to Stage 2)

以下任务已标记为第二阶段实现（优先级较低）：

- Prisma 敏感字段加密中间件（AES-256-GCM）
- 数据库种子数据（测试用户）
- user_points_balance 数据库视图
- 积分计算触发器/存储过程
- manager_member_relations 表（健康管理师会员关系）

### 验证结果 (Verified)

- ✅ PostgreSQL 容器健康检查通过
- ✅ 所有 6 个表创建成功
- ✅ 所有 26 个索引创建成功
- ✅ 所有外键约束和唯一约束生效
- ✅ ESLint 检查无错误
- ✅ TypeScript 编译无错误

### 技术栈版本

- **运行时**: Node.js 18.x
- **框架**: NestJS 10.4.20
- **ORM**: Prisma 5.22.0
- **数据库**: PostgreSQL 15-alpine
- **日志**: winston 3.19.0, nest-winston 1.10.2
- **包管理**: pnpm (workspace)

---

## 下一步计划

### 第二阶段：后端核心服务（Week 2-6）

**目标任务**：

1. 实现认证授权模块（JWT + RBAC）
2. 实现用户管理模块（CRUD + 文件上传）
3. 实现健康管理模块（档案、打卡、评估）
4. 实现积分系统模块（获得、消费、排行榜）
5. 实现通讯模块（WebSocket + MongoDB）
6. 实现通知模块（推送 + 任务队列）
7. 实现医患关系管理模块
8. 实现数据分析模块
9. 实现审计日志模块

**关键依赖**:

- 第一阶段所有基础设施已就绪 ✅
- 数据库表已创建并验证 ✅

**预计完成时间**: 2025-01-23 (Week 6)

---

## 链接

- 需求文档: `.claude/specs/chronic-disease-management/requirements.md`
- 设计文档: `.claude/specs/chronic-disease-management/design.md`
- 任务清单: `.claude/specs/chronic-disease-management/tasks.md`
- 阶段报告: `docs/reports/stage-summaries/stage1-summary-report.md`
