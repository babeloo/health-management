# 项目文档目录

本目录存放智慧慢病管理系统的所有项目文档（不包括核心规约文档）。

## 📁 目录结构

```
docs/
├── README.md                           # 本文件：文档目录说明
├── reports/                            # 项目报告
│   ├── stage-summaries/               # 阶段总结报告
│   │   ├── stage1-summary-report.md   # 第一阶段总结
│   │   ├── stage2-summary-report.md   # 第二阶段总结（未来）
│   │   └── ...
│   └── weekly/                        # 周报
│       ├── 2025-W51.md                # 2025年第51周周报
│       └── ...
├── architecture/                       # 架构演进文档（未来）
│   └── decisions/                     # 架构决策记录（ADR）
├── deployment/                         # 部署文档（未来）
│   ├── production-deployment.md       # 生产环境部署指南
│   └── troubleshooting.md             # 故障排查指南
└── meeting-notes/                      # 会议纪要（未来）
```

## 📝 文档分类说明

### 核心规约文档（存放于 `.claude/specs/**/`，比如 `.claude/specs/chronic-disease-management/`）

这些文档是项目的核心规约，**只应包含三个文件**：

- `design.md` - 系统设计文档（技术架构、数据库设计、API 规范）
- `requirements.md` - 需求文档（19个功能需求及验收标准）
- `tasks.md` - 任务清单（MVP阶段 8 个开发阶段、46 个任务组）

### 项目报告（存放于 `docs/reports/`）

由 PM Agent 生成的项目进度报告：

- **阶段总结报告**（`stage-summaries/`）：每个开发阶段完成后生成
  - 格式：`stage{N}-summary-report.md`
  - 内容：阶段概览、任务明细、成果交付、问题解决、经验教训

- **周报**（`weekly/`）：每周五自动生成
  - 格式：`YYYY-Wnn.md`（如 `2025-W51.md` 表示 2025 年第 51 周）
  - 内容：本周完成任务、下周计划、风险预警、关键指标

### 架构演进文档（存放于 `docs/architecture/`）

重大架构变更的决策记录：

- **ADR（Architecture Decision Records）**：记录技术选型和架构调整的决策依据
- **演进历史**：记录系统架构的演化过程

### 部署文档（存放于 `docs/deployment/`）

生产环境部署和运维文档：

- 部署指南
- 故障排查
- 性能优化

### 会议纪要（存放于 `docs/meeting-notes/`）

重要技术会议和需求评审的记录。

## 🔄 文档更新规则

### 由 PM Agent 自动维护

- ✅ 周报（每周五自动生成）
- ✅ 阶段总结报告（阶段完成后生成）
- ✅ CHANGELOG.md（任务完成后立即更新）

### 由技术 Agents 协作维护

- ✅ README.md（新增模块/依赖时更新）
- ✅ Swagger/OpenAPI 文档（自动生成 + 手动注解）
- ✅ design.md 架构演进记录（重大变更时更新）

### 手动维护

- ✅ 会议纪要
- ✅ ADR（架构决策记录）

## 📌 注意事项

1. **不要在 `.claude/specs/` 目录下创建新文档**
   - 该目录只保留三个核心规约文档
   - 所有其他文档都应放到 `docs/` 目录下

2. **报告命名规范**
   - 阶段报告：`stage{N}-summary-report.md`（N 为阶段编号）
   - 周报：`YYYY-Wnn.md`（ISO 8601 周编号）

3. **文档版本控制**
   - 所有文档都纳入 Git 版本控制
   - 重要变更需要提交 commit message

---

**文档管理负责人**：PM Agent
**最后更新时间**：2025-12-22
