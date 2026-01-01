# 并行开发快速启动指南

> **快速参考**: 5 分钟启动并行开发模式

---

## 🚀 第一波次任务（立即执行）

### 今日启动（2025-12-25）

```bash
# 在主工作目录执行
cd D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt
```

#### 任务 12：审计日志模块（1 天，优先级最高）

**负责人**: @backend-ts
**工作量**: 1 天
**验收标准**: 需求 #18（数据安全与隐私保护）

**实现清单**：

- [ ] 创建 `backend/src/audit/audit.module.ts`
- [ ] 创建 `backend/src/audit/audit.service.ts`（记录敏感操作）
- [ ] 创建 `backend/src/common/middlewares/audit-log.middleware.ts`
- [ ] 集成到 AuthModule, UserModule, HealthModule
- [ ] 实现查询接口（GET /api/v1/audit-logs）
- [ ] 单元测试覆盖率 > 80%
- [ ] TypeScript 编译通过
- [ ] ESLint 检查通过

**提交命令**：

```bash
git add .
git commit -m "feat: 实现审计日志模块 (#18)"
git push origin master
```

---

#### 任务 10：医患关系管理模块（2 天）

**负责人**: @backend-ts
**工作量**: 2 天（12-26 至 12-27）
**验收标准**: 需求 #8（医生端 - 患者管理）、需求 #11（健康管理师端 - 会员管理）

**实现清单**：

- [ ] 创建 `backend/src/relation/relation.module.ts`
- [ ] 实现 4 个医患关系接口（创建、查询医生患者列表、查询患者医生、解除关系）
- [ ] 实现 4 个师员关系接口（创建、查询会员列表、更新会员类型、解除关系）
- [ ] 支持分页、筛选、软删除
- [ ] 单元测试覆盖率 > 80%

**提交命令**：

```bash
git add .
git commit -m "feat: 实现医患关系管理模块 (#8, #11)"
git push origin master
```

---

#### 任务 11：数据分析模块（2 天）

**负责人**: @backend-ts
**工作量**: 2 天（12-27 完成）
**验收标准**: 需求 #14（管理后台 - 数据可视化）

**实现清单**：

- [ ] 创建 `backend/src/analytics/analytics.module.ts`
- [ ] 实现仪表盘数据接口（GET /api/v1/analytics/dashboard）
- [ ] 实现患者统计接口（GET /api/v1/analytics/patient-stats）
- [ ] 实现打卡统计接口（GET /api/v1/analytics/check-in-stats）
- [ ] 实现导出报表接口（POST /api/v1/analytics/export）
- [ ] 集成 Redis 缓存（仪表盘数据缓存 5 分钟）
- [ ] 单元测试覆盖率 > 80%

**提交命令**：

```bash
git add .
git commit -m "feat: 实现数据分析模块 (#14)"
git push origin master
```

---

## 🚀 第二波次任务（Week 4 启动）

### 启动条件：✅ 第一波次任务完成（任务 10-12）

### 任务 13：Python FastAPI 项目初始化

**负责人**: @ai-python
**工作量**: 1 天
**Worktree**: `D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt-ai`
**分支**: `feature/stage3-ai-service`

```bash
# 1. 切换到 AI 服务 worktree
cd D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt-ai

# 2. 同步主分支更新
git fetch origin master
git merge origin/master

# 3. 开始开发
cd ai-service
uv pip install -r requirements.txt

# 4. 提交代码
git add .
git commit -m "feat: 初始化 Python FastAPI 项目 (#13)"
git push origin feature/stage3-ai-service

# 5. 创建 Pull Request
gh pr create --title "feat: 完成 AI 服务项目初始化（任务13）" --body "..."
```

---

### 任务 19：Uni-app 项目初始化

**负责人**: @mobile
**工作量**: 1 天
**Worktree**: `D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt-patient`
**分支**: `feature/stage4-patient-app`

```bash
# 1. 切换到患者端 worktree
cd D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt-patient

# 2. 同步主分支更新
git fetch origin master
git merge origin/master

# 3. 开始开发
cd frontend-patient
pnpm install

# 4. 提交代码
git add .
git commit -m "feat: 初始化 Uni-app 项目 (#19)"
git push origin feature/stage4-patient-app

# 5. 创建 Pull Request
gh pr create --title "feat: 完成患者端项目初始化（任务19）" --body "..."
```

---

### 任务 28：React 项目初始化

**负责人**: @backend-ts
**工作量**: 1 天
**Worktree**: `D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt-admin`
**分支**: `feature/stage5-admin-web`

```bash
# 1. 切换到医生端 worktree
cd D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt-admin

# 2. 同步主分支更新
git fetch origin master
git merge origin/master

# 3. 开始开发
cd frontend-web
pnpm install

# 4. 提交代码
git add .
git commit -m "feat: 初始化 React 项目 (#28)"
git push origin feature/stage5-admin-web

# 5. 创建 Pull Request
gh pr create --title "feat: 完成医生端和管理端项目初始化（任务28）" --body "..."
```

---

## 🔄 每日同步流程

### 上午 10:00 异步站会

**发送到**：GitHub Issues 或飞书/企业微信群

**模板**：

```markdown
## 2025-12-XX 每日站会

### @backend-ts

- ✅ 昨日完成：[任务名称]
- 🚧 今日计划：[任务名称]
- ⚠️ 阻塞：[问题描述，如无则填"无"]

### @ai-python

- ✅ 昨日完成：[任务名称]
- 🚧 今日计划：[任务名称]
- ⚠️ 阻塞：[问题描述]

### @mobile

- ✅ 昨日完成：[任务名称]
- 🚧 今日计划：[任务名称]
- ⚠️ 阻塞：[问题描述]
```

---

### 每日启动前同步 master

**在每个 worktree 中执行**：

```bash
git fetch origin master
git merge origin/master
```

---

### 任务完成后更新文档

**1. 更新 tasks.md**：

```bash
# 将任务状态从 [ ] 改为 [x]
# 更新一级模块标题进度（如：### 10. 医患关系管理模块 ✅ 100% 完成）
# 更新总体进度（如：> **总体进度**: 35.4% (17/48 模块已完成)）
```

**2. 更新 CHANGELOG.md**：

```markdown
## [Unreleased]

### Added

- 实现医患关系管理模块（需求 #8, #11）- 2025-12-26 @backend-ts
```

---

## ⚠️ 常见问题

### Q1: Worktree 如何切换？

**A**: 直接使用 `cd` 命令切换到对应目录即可

```bash
cd D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt-ai
```

---

### Q2: 如何查看所有 worktree？

**A**: 在任意 worktree 中执行

```bash
git worktree list
```

---

### Q3: 如何解决代码冲突？

**A**:

1. 优先协商解决（技术 agents 直接沟通）
2. 如 4 小时内无法解决，升级给 @pm 裁决
3. 由影响较小的一方调整代码

---

### Q4: 共享文件（如 docker-compose.yml）如何修改？

**A**:

- 仅在主工作目录（master 分支）修改
- 修改后通知所有团队成员同步
- 其他 worktree 通过 `git merge origin/master` 同步

---

## 📋 检查清单

### 启动前检查

- [ ] Worktree 环境已配置（运行 `git worktree list` 验证）
- [ ] 开发工具已安装（Node.js 18+, Python 3.11, pnpm, uv）
- [ ] Docker 服务已启动（运行 `docker-compose up -d` 验证）
- [ ] 已阅读 `parallel-development-kickoff.md`
- [ ] 已阅读 `WORKTREE-GUIDE.md`

---

### 每日检查

- [ ] 已执行 `git fetch origin master && git merge origin/master`
- [ ] 已参加上午 10:00 异步站会
- [ ] 已运行单元测试（`pnpm test`）
- [ ] 已运行 ESLint 检查（`pnpm lint`）
- [ ] 已更新 `tasks.md` 任务状态

---

### 任务完成检查

- [ ] 单元测试通过（覆盖率 > 80%）
- [ ] TypeScript 编译通过（Strict Mode）
- [ ] ESLint 检查通过（0 errors）
- [ ] Swagger API 文档已更新
- [ ] 代码已提交并推送到远程分支
- [ ] Pull Request 已创建
- [ ] `tasks.md` 已更新
- [ ] `CHANGELOG.md` 已更新

---

## 📚 参考文档

- **详细计划**: `docs/reports/plan/parallel-development-kickoff.md`
- **Worktree 使用**: `docs/development/WORKTREE-GUIDE.md`
- **并行任务分析**: `docs/reports/plan/parallel-tasks-analysis.md`
- **项目任务清单**: `.claude/specs/chronic-disease-management/tasks.md`
- **需求文档**: `.claude/specs/chronic-disease-management/requirements.md`
- **设计文档**: `.claude/specs/chronic-disease-management/design.md`

---

**准备好了吗？让我们开始并行开发！** 🚀
