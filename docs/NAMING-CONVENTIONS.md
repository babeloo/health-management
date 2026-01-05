# 文档命名规范

## 命名规则

### 1. 大写命名（UPPERCASE）

**适用场景**：

- 项目根目录的重要文件
- 行业约定俗成的文件名

**示例**：

- `README.md` - 项目说明（GitHub 标准）
- `CHANGELOG.md` - 变更日志（Keep a Changelog 标准）
- `CONTRIBUTING.md` - 贡献指南（开源社区标准）
- `LICENSE` - 许可证文件（法律文档标准）

**理由**：这些文件是项目的"门面"，大写命名提高可见性，符合开源社区和 GitHub 的约定。

### 2. 小写 kebab-case（lowercase-with-dashes）

**适用场景**：

- 所有普通文档、指南、报告
- 子目录中的文档文件

**示例**：

- `quick-start.md` - 快速入门指南
- `docker-deployment.md` - Docker 部署文档
- `admin-frontend.md` - 管理端完成报告
- `tasks-analysis.md` - 任务分析文档

**理由**：

1. **可读性**：kebab-case 比 snake_case 更易读（`quick-start` vs `quick_start`）
2. **URL 友好**：适合生成文档网站（如 VuePress、Docusaurus）
3. **跨平台兼容**：避免 Windows/Linux 文件系统大小写敏感问题
4. **现代标准**：符合现代 Web 开发和文档工程的主流实践

### 3. 技术专有名词保持原样

**适用场景**：

- 文件名中包含技术栈、工具、框架名称时

**示例**：

- `prisma-7-upgrade.md` - Prisma（首字母小写）
- `docker-deployment.md` - Docker（首字母小写）
- `git-worktree-management.md` - Git（首字母小写）
- `windows-development.md` - Windows（首字母小写）

**理由**：

- 在 kebab-case 规范下，所有单词统一小写
- 保持命名一致性，避免 `Docker-Deployment.md` 这种混合大小写
- 技术名词在文档内容中可以使用正确大小写（如 "Docker Deployment Guide"）

### 4. 日期格式

**适用场景**：

- 进度报告、周报、时间相关文档

**格式**：`YYYY-MM-DD.md`

**示例**：

- `2025-12-30.md` - 2025年12月30日进度报告
- `2026-01-01.md` - 2026年1月1日周报

**理由**：

1. ISO 8601 标准格式
2. 自然排序友好（按时间顺序排列）
3. 避免地区差异（美国 MM/DD vs 欧洲 DD/MM）

## 文件夹命名规范

### 1. 小写单数/复数

**规则**：

- 使用小写
- 根据语义选择单数或复数

**示例**：

- `guides/` - 复数（包含多个指南）
- `reference/` - 单数（参考资料的集合）
- `reports/` - 复数（包含多个报告）
- `development/` - 单数（开发相关的集合）
- `deployment/` - 单数（部署相关的集合）

### 2. 语义化命名

**规则**：使用清晰的语义，避免缩写

**好的示例**：

- `guides/` ✅（而非 `docs/`）
- `reference/` ✅（而非 `ref/`）
- `completion/` ✅（而非 `done/`）

**理由**：提高可读性，新成员能快速理解文件夹用途

## 重命名检查清单

在重命名文件时，确保：

- [ ] 文件名使用 kebab-case（除根目录重要文件）
- [ ] 技术名词统一小写（prisma, docker, git）
- [ ] 日期格式为 YYYY-MM-DD
- [ ] 文件夹名称语义清晰
- [ ] 更新所有引用该文件的链接（README.md, CLAUDE.md 等）
- [ ] 检查 Git 历史是否需要保留（使用 `git mv` 而非直接重命名）

## 示例对比

### 重命名前（混乱）

```
ARCHITECTURE-REVIEW-REPORT.md
admin-frontend-completion-report.md
WORKTREE-GUIDE.md
worktree-consolidation-report.md
TASK-24-COMPLETION-REPORT.md
influxdb-integration-completion-report.md
```

### 重命名后（规范）

```
architecture-review-report.md
admin-frontend-completion.md
worktree-guide.md
worktree-consolidation.md
task-24-ai-integration.md
influxdb-integration.md
```

## 特殊情况

### 1. 缩写词

**规则**：在 kebab-case 中全部小写

**示例**：

- `api-reference.md` ✅（而非 `API-Reference.md`）
- `jwt-auth-guide.md` ✅（而非 `JWT-Auth-Guide.md`）
- `iot-device-setup.md` ✅（而非 `IoT-Device-Setup.md`）

### 2. 版本号

**规则**：使用连字符分隔

**示例**：

- `prisma-7-upgrade.md` ✅
- `node-18-migration.md` ✅

### 3. 多词组合

**规则**：每个单词用连字符分隔

**示例**：

- `git-worktree-management.md` ✅
- `docker-compose-configuration.md` ✅
- `patient-frontend-completion.md` ✅

## 文件后缀规范

为了保持文档命名的一致性，不同类型的文档应使用统一的后缀。

### 1. 任务完成报告

**格式**：`task-{编号}-{简短描述}.md`

**后缀规则**：使用具体的功能描述，避免使用通用词（如 completion, summary）

**示例**：

- `task-22-health-checkin.md` ✅（健康打卡功能）
- `task-23-health-records.md` ✅（健康档案功能）
- `task-24-ai-integration.md` ✅（AI 集成功能）
- `task-25-points-system.md` ✅（积分系统功能）

**避免**：

- `task-22-completion.md` ❌（过于通用）
- `task-22-summary.md` ❌（不一致）
- `task-22.md` ❌（缺少描述）

### 2. 模块完成报告

**格式**：`{模块名}-completion.md`

**后缀规则**：统一使用 `-completion` 后缀

**示例**：

- `admin-frontend-completion.md` ✅
- `ai-service-completion.md` ✅
- `patient-frontend-completion.md` ✅
- `encryption-implementation-completion.md` ✅

### 3. 阶段总结报告

**格式**：`stage{编号}-summary.md` 或 `{主题}-summary.md`

**后缀规则**：统一使用 `-summary` 后缀

**示例**：

- `stage1-summary.md` ✅
- `stage2-summary.md` ✅
- `project-completion-summary.md` ✅
- `project-management-summary.md` ✅

### 4. 技术实现报告

**格式**：`{技术/功能}-implementation.md`

**后缀规则**：统一使用 `-implementation` 后缀

**示例**：

- `jwt-auth-implementation.md` ✅
- `encryption-implementation.md` ✅
- `rag-implementation.md` ✅

### 5. 操作指南

**格式**：`{主题}-guide.md`

**后缀规则**：统一使用 `-guide` 后缀

**示例**：

- `worktree-guide.md` ✅
- `deployment-guide.md` ✅
- `testing-guide.md` ✅

### 6. 参考文档

**格式**：`{主题}-reference.md`

**后缀规则**：统一使用 `-reference` 后缀

**示例**：

- `api-reference.md` ✅
- `stage3-ai-features-reference.md` ✅
- `database-schema-reference.md` ✅

### 7. 审查报告

**格式**：`{主题}-review.md` 或 `{主题}-review-{类型}.md`

**后缀规则**：统一使用 `-review` 后缀

**示例**：

- `architecture-review-report.md` ✅
- `code-review-summary.md` ✅
- `worktree-consolidation-review.md` ✅

### 8. 策略和计划文档

**格式**：`{主题}-{类型}.md`

**后缀规则**：
- 策略文档使用 `-strategy`
- 计划文档使用 `-plan`
- 执行计划使用 `-execution-plan`

**示例**：

- `worktree-cleanup-strategy.md` ✅
- `deployment-strategy.md` ✅
- `execution-plan.md` ✅
- `parallel-tasks-execution-plan.md` ✅

### 9. 状态和进度报告

**格式**：`{主题}-{类型}-report.md` 或 `YYYY-MM-DD.md`

**后缀规则**：
- 状态报告使用 `-status-report`
- 清理报告使用 `-cleanup-report`
- 进度报告使用日期格式

**示例**：

- `worktree-status-report.md` ✅
- `worktree-cleanup-report-2026-01-01.md` ✅
- `2025-12-30.md` ✅（进度报告）

## 后缀选择决策树

```
文档类型？
├─ 任务报告 → task-{编号}-{功能描述}.md
├─ 模块完成 → {模块名}-completion.md
├─ 阶段总结 → stage{编号}-summary.md
├─ 技术实现 → {技术}-implementation.md
├─ 操作指南 → {主题}-guide.md
├─ 参考文档 → {主题}-reference.md
├─ 审查报告 → {主题}-review.md
├─ 策略文档 → {主题}-strategy.md
├─ 计划文档 → {主题}-plan.md
└─ 状态报告 → {主题}-status-report.md
```

