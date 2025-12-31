# 项目文档目录

本目录存放智慧慢病管理系统的所有项目文档（不包括核心规约文档）。

## 📁 目录结构

```
docs/
├── README.md                           # 本文件：文档目录说明
├── development/                        # 开发指南和技术文档
│   └── WINDOWS.md                     # Windows 开发环境配置
│   └── PRISMA_7_UPGRADE.md            # Prisma 7 升级指南
├── reports/                            # 项目报告
│   ├── architecture/                  # 架构审查报告
│   ├── parallel/                      # 并行开发报告
│   ├── project-summaries/             # 项目总结报告
│   ├── stage-summaries/               # 阶段总结报告
│   ├── tasks/                         # 任务完成报告
│   │   ├── backend/                   # 后端任务报告
│   │   ├── frontend-patient/          # 患者端任务报告
│   │   └── frontend-web/              # 管理端任务报告
│   ├── weekly/                        # 周报
│   └── GIT-WORKTREE-STATUS-REPORT.md
├── guides/                             # 使用指南（未来）
└── api/                                # API 文档（未来）
```

## 📝 文档分类说明

### 核心规约文档（存放于 `.claude/specs/chronic-disease-management/`）

这些文档是项目的核心规约，**只应包含三个文件**：

- `design.md` - 系统设计文档（技术架构、数据库设计、API 规范）
- `requirements.md` - 需求文档（19个功能需求及验收标准）
- `tasks.md` - 任务清单（MVP阶段 8 个开发阶段、46 个任务组）

### 项目报告（存放于 `docs/reports/`）

由 PM Agent 生成的项目进度报告：

- **架构审查报告**（`architecture/`）：架构设计审查和评估
- **并行开发报告**（`parallel/`）：并行开发过程的规划和总结
- **项目总结报告**（`project-summaries/`）：项目整体进度和管理总结
- **阶段总结报告**（`stage-summaries/`）：每个开发阶段完成后生成
- **任务完成报告**（`tasks/`）：按模块分类的任务完成报告
- **周报**（`weekly/`）：每周五自动生成

### 开发指南（存放于 `docs/development/`）

开发环境配置和技术指南。

### 技术文档（存放于 `docs/` 根目录）

- `PRISMA_7_UPGRADE.md` - Prisma 7 升级指南

## 🔄 文档更新规则

### 由 PM Agent 自动维护

- ✅ 周报（每周五自动生成）
- ✅ 阶段总结报告（阶段完成后生成）
- ✅ 任务完成报告（任务完成后生成）
- ✅ CHANGELOG.md（任务完成后立即更新）

### 由技术 Agents 协作维护

- ✅ README.md（新增模块/依赖时更新）
- ✅ Swagger/OpenAPI 文档（自动生成 + 手动注解）
- ✅ design.md 架构演进记录（重大变更时更新）

## 📌 注意事项

1. **不要在 `.claude/specs/` 目录下创建新文档**
   - 该目录只保留三个核心规约文档
   - 所有其他文档都应放到 `docs/` 目录下

2. **报告命名规范**
   - 阶段报告：`stage{N}-summary-report.md`
   - 周报：`YYYY-Wnn.md`
   - 任务报告：`TASK-{N}-COMPLETION-REPORT.md`

3. **文档版本控制**
   - 所有文档都纳入 Git 版本控制
   - 重要变更需要提交 commit message

4. **文档存放位置**
   - 模块内的 README.md 保留在各模块目录下
   - 所有报告和总结文档统一存放在 `docs/reports/` 下
   - 技术实现文档可保留在模块的 `docs/` 子目录下

---

**文档管理负责人**：PM Agent  
**最后更新时间**：2025-12-31
