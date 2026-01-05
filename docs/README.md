# 项目文档目录

本目录存放智慧慢病管理系统的所有项目文档（不包括核心规约文档）。

## 📁 目录结构

```
docs/
├── README.md                           # 本文件：文档导航
├── NAMING-CONVENTIONS.md               # 文档命名规范
├── guides/                             # 📖 操作指南
│   ├── quick-start.md                  # 快速入门
│   ├── worktree-guide.md               # Git Worktree 使用指南
│   ├── docker-deployment.md            # Docker 部署指南
│   └── windows-development.md          # Windows 开发环境配置
├── reference/                          # 📚 参考文档
│   ├── architecture/                   # 架构设计
│   │   ├── review-report.md            # 架构审查报告
│   │   ├── review-request.md           # 架构审查请求
│   │   └── review-summary.md           # 架构审查总结
│   └── api/                            # API 文档（预留）
├── reports/                            # 📊 项目报告
│   ├── completion/                     # 完成报告
│   │   ├── modules/                    # 模块完成报告
│   │   │   ├── admin-frontend.md       # 管理端完成报告
│   │   │   ├── ai-service.md           # AI 服务完成报告
│   │   │   ├── patient-frontend.md     # 患者端完成报告
│   │   │   ├── encryption-implementation.md # 加密实现报告
│   │   │   └── jwt-auth-implementation.md  # JWT 认证实现报告
│   │   ├── stages/                     # 阶段总结报告
│   │   │   └── stage1-summary.md       # 第一阶段总结
│   │   └── tasks/                      # 任务完成报告
│   │       ├── backend/                # 后端任务（4个）
│   │       ├── frontend-patient/       # 患者端任务（7个）
│   │       ├── frontend-web/           # 管理端任务（1个）
│   │       └── infrastructure/         # 基础设施任务（2个）
│   ├── progress/                       # 进度报告
│   │   ├── 2025-12-30.md               # 2025-12-30 进度
│   │   ├── 2025-12-31.md               # 2025-12-31 进度
│   │   ├── project-completion-summary.md    # 项目完成总结
│   │   └── project-management-summary.md    # 项目管理总结
│   └── parallel/                       # 并行开发报告（含 Worktree 管理）
│       ├── kickoff.md                  # 并行开发启动
│       ├── tasks-analysis.md           # 任务分析
│       ├── execution-plan.md           # 执行计划
│       ├── parallel-tasks-execution-plan.md # 并行任务执行计划
│       ├── stage3-ai-service-implementation.md # Stage3 AI 服务实施计划
│       ├── stage3-ai-features-reference.md # Stage3 AI 功能参考文档
│       ├── worktree-consolidation.md   # Worktree 整合报告
│       ├── worktree-consolidation-review.md # Worktree 整合审查
│       ├── worktree-cleanup-strategy.md # Worktree 清理策略
│       ├── worktree-cleanup-report-2026-01-01.md # 2026-01-01 清理报告
│       └── worktree-status-report.md   # Worktree 状态报告
└── development/                        # 🛠️ 开发文档
    └── prisma-7-upgrade.md             # Prisma 7 升级指南
```

## 📝 文档分类说明

### 核心规约文档（存放于 `.claude/specs/chronic-disease-management/`）

这些文档是项目的核心规约，**只应包含三个文件**：

- `requirements.md` - 需求文档（19个功能需求及验收标准）
- `design.md` - 系统设计文档（技术架构、数据库设计、API 规范）
- `tasks.md` - 任务清单（MVP阶段 8 个开发阶段、46 个任务组）

### 操作指南（`guides/`）

面向开发者的操作指南和教程：

- **快速入门**：项目快速上手指南
- **Worktree 指南**：Git Worktree 并行开发工作流
- **Docker 部署**：容器化部署配置和流程
- **Windows 开发**：Windows 环境开发注意事项

### 参考文档（`reference/`）

技术参考和架构设计文档：

- **架构设计**：系统架构审查、评估和设计决策
- **API 文档**：API 接口规范（预留，未来使用 Swagger/OpenAPI）

### 项目报告（`reports/`）

由 PM Agent 和技术 Agents 生成的项目报告：

- **完成报告**（`completion/`）：
  - `modules/`：功能模块完成报告（前端、后端、AI 服务等）
  - `stages/`：阶段总结报告（Stage 1, Stage 2 等）
  - `tasks/`：具体任务完成报告（按技术栈分类）
- **进度报告**（`progress/`）：项目整体进度和管理总结
- **并行开发**（`parallel/`）：并行开发过程的规划、总结和 Git Worktree 管理报告

### 开发文档（`development/`）

开发环境配置和技术升级指南：

- **Prisma 7 升级**：Prisma ORM 升级指南和注意事项

## 📐 文档命名规范

本项目采用统一的文档命名规范，详见 **[NAMING-CONVENTIONS.md](./NAMING-CONVENTIONS.md)**。

**核心规则**：

- 根目录重要文件使用大写（`README.md`, `CHANGELOG.md`）
- 所有其他文档使用小写 kebab-case（`quick-start.md`, `docker-deployment.md`）
- 日期格式使用 ISO 8601（`2025-12-30.md`）

## 🔄 文档更新规则

### 由 PM Agent 自动维护

- ✅ 进度报告（任务完成后生成）
- ✅ 阶段总结报告（阶段完成后生成）
- ✅ 任务完成报告（任务完成后生成）
- ✅ CHANGELOG.md（任务完成后立即更新）

### 由技术 Agents 协作维护

- ✅ README.md（新增模块/依赖时更新）
- ✅ Swagger/OpenAPI 文档（自动生成 + 手动注解）
- ✅ design.md 架构演进记录（重大变更时更新）
- ✅ 操作指南（guides/）：按需更新

## 📌 注意事项

1. **不要在 `.claude/specs/` 目录下创建新文档**
   - 该目录只保留三个核心规约文档
   - 所有其他文档都应放到 `docs/` 目录下

2. **遵循命名规范**
   - 新建文档前请阅读 [NAMING-CONVENTIONS.md](./NAMING-CONVENTIONS.md)
   - 使用小写 kebab-case 命名（除根目录重要文件）
   - 使用 `git mv` 重命名文件以保留历史

3. **文档版本控制**
   - 所有文档都纳入 Git 版本控制
   - 重要变更需要提交 commit message

4. **文档存放位置**
   - 模块内的 README.md 保留在各模块目录下
   - 所有报告和总结文档统一存放在 `docs/reports/` 下
   - 操作指南存放在 `docs/guides/` 下
   - 技术参考存放在 `docs/reference/` 下

---

**文档管理负责人**：PM Agent
**最后更新时间**：2026-01-05
**最近更新**：

- 合并 worktree-management 文件夹到 parallel 文件夹
- 统一任务报告命名规范（添加功能描述）
- 优化 completion 文件夹结构（分离 modules/stages/tasks）
- 添加任务索引文件（4个子文件夹）
