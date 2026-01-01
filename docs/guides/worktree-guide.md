# Git Worktree 并行开发指南

> **生成时间**: 2025-12-25
> **目的**: 支持第三、四、五阶段的并行开发

## 📋 Worktree 结构概览

```
D:\Code\ai-gen\intl-health-mgmt-parallel\
├── intl-health-mgmt\          # 主工作目录（master 分支）
├── intl-health-mgmt-ai\       # AI 服务开发 worktree
├── intl-health-mgmt-patient\  # 患者端开发 worktree
└── intl-health-mgmt-admin\    # 医生端和管理端开发 worktree
```

## 🎯 Worktree 分配

| Worktree 目录              | 分支名称                     | 负责 Agent  | 任务范围               | 开发内容                      |
| -------------------------- | ---------------------------- | ----------- | ---------------------- | ----------------------------- |
| `intl-health-mgmt`         | `master`                     | @pm         | 项目管理、文档维护     | tasks.md, CHANGELOG.md, 报告  |
| `intl-health-mgmt-ai`      | `feature/stage3-ai-service`  | @ai-python  | 任务 13-18（第三阶段） | Python FastAPI, DeepSeek, RAG |
| `intl-health-mgmt-patient` | `feature/stage4-patient-app` | @mobile     | 任务 19-27（第四阶段） | Uni-app 患者端                |
| `intl-health-mgmt-admin`   | `feature/stage5-admin-web`   | @backend-ts | 任务 28-35（第五阶段） | React 医生端和管理端          |

## 🚀 使用方法

### 1. 切换到不同的 Worktree

```bash
# 切换到 AI 服务开发目录
cd D:\Code\ai-gen\intl-health-mgmt-ai

# 切换到患者端开发目录
cd D:\Code\ai-gen\intl-health-mgmt-patient

# 切换到医生端和管理端开发目录
cd D:\Code\ai-gen\intl-health-mgmt-admin

# 返回主工作目录
cd D:\Code\ai-gen\intl-health-mgmt
```

### 2. 查看 Worktree 状态

```bash
# 查看所有 worktree
git worktree list

# 查看当前分支
git branch

# 查看所有分支
git branch -a
```

### 3. 在 Worktree 中开发

**示例：在 AI 服务 worktree 中开发**

```bash
# 1. 切换到 AI 服务目录
cd D:\Code\ai-gen\intl-health-mgmt-ai

# 2. 确认当前分支
git branch
# 输出: * feature/stage3-ai-service

# 3. 开始开发（例如：初始化 Python 项目）
cd ai-service
uv pip install -r requirements.txt

# 4. 提交代码
git add .
git commit -m "feat: 初始化 Python FastAPI 项目 (#13)"

# 5. 推送到远程
git push -u origin feature/stage3-ai-service
```

### 4. 合并到主分支

**方式 1：通过 Pull Request（推荐）**

```bash
# 1. 推送分支到远程
git push -u origin feature/stage3-ai-service

# 2. 在 GitHub 上创建 Pull Request
gh pr create --title "feat: 完成 AI 服务开发（第三阶段）" --body "$(cat <<'EOF'
## Summary
- ✅ 任务13: Python FastAPI 项目初始化
- ✅ 任务14: DeepSeek API 集成
- ✅ 任务15: RAG 知识库实现
- ✅ 任务16: AI Agent 对话管理
- ✅ 任务17: AI 辅助诊断
- ✅ 任务18: AI 服务监控与优化

## Test Plan
- [x] 单元测试通过（pytest）
- [x] API 集成测试通过
- [x] RAG 检索功能验证
- [x] DeepSeek API 调用成功
EOF
)"

# 3. 等待代码审查和 CI/CD 通过

# 4. 合并 PR（在 GitHub 上操作或使用命令）
gh pr merge --squash
```

**方式 2：本地合并（不推荐，仅紧急情况）**

```bash
# 1. 切换到主工作目录
cd D:\Code\ai-gen\intl-health-mgmt

# 2. 切换到 master 分支
git checkout master

# 3. 拉取最新代码
git pull origin master

# 4. 合并功能分支
git merge feature/stage3-ai-service

# 5. 推送到远程
git push origin master
```

### 5. 同步主分支的更新

**场景**：主分支有新的提交（如其他 worktree 的代码已合并），需要同步到当前 worktree

```bash
# 1. 在当前 worktree 中
cd D:\Code\ai-gen\intl-health-mgmt-ai

# 2. 拉取最新的 master 分支
git fetch origin master

# 3. 合并 master 到当前分支
git merge origin/master

# 或者使用 rebase（保持提交历史线性）
git rebase origin/master

# 4. 解决冲突（如果有）
# 编辑冲突文件，然后：
git add .
git rebase --continue  # 如果使用 rebase
# 或
git commit  # 如果使用 merge
```

## ⚠️ 注意事项

### 1. 避免在不同 Worktree 中修改相同文件

**问题**：如果在多个 worktree 中修改同一个文件，合并时会产生冲突。

**解决方案**：

- ✅ **AI 服务 worktree** 只修改 `ai-service/` 目录
- ✅ **患者端 worktree** 只修改 `frontend-patient/` 目录
- ✅ **医生端 worktree** 只修改 `frontend-web/` 目录
- ⚠️ **共享文件**（如 `docker-compose.yml`, `README.md`）只在主工作目录修改

### 2. 定期同步主分支

**建议**：每天开始工作前，先同步主分支的更新

```bash
# 在当前 worktree 中
git fetch origin master
git merge origin/master
```

### 3. 提交前检查当前分支

**避免错误**：确保在正确的分支上提交代码

```bash
# 查看当前分支
git branch

# 如果在错误的分支，切换到正确的 worktree
cd D:\Code\ai-gen\intl-health-mgmt-ai  # 切换到正确的目录
```

### 4. 不要删除正在使用的 Worktree

**错误示例**：

```bash
# ❌ 错误：直接删除目录
rm -rf D:\Code\ai-gen\intl-health-mgmt-ai
```

**正确方法**：

```bash
# ✅ 正确：使用 git worktree remove
git worktree remove D:\Code\ai-gen\intl-health-mgmt-ai
```

### 5. 共享文件的修改策略

**共享文件**（多个 worktree 可能都需要修改）：

- `docker-compose.yml` - 基础设施配置
- `README.md` - 项目文档
- `.env.example` - 环境变量示例
- `package.json` (根目录) - Monorepo 配置

**策略**：

1. **优先在主工作目录修改**，然后同步到其他 worktree
2. **或者**：在功能分支修改，合并到 master 后，其他 worktree 再同步

## 🔄 并行开发工作流

### 典型的一天工作流程

**上午（@ai-python 在 AI 服务 worktree）**：

```bash
# 1. 切换到 AI 服务目录
cd D:\Code\ai-gen\intl-health-mgmt-ai

# 2. 同步主分支更新
git fetch origin master
git merge origin/master

# 3. 开发 AI 功能（任务 14: DeepSeek API 集成）
cd ai-service
# ... 编写代码 ...

# 4. 运行测试
pytest tests/

# 5. 提交代码
git add .
git commit -m "feat: 实现 DeepSeek API 集成 (#14)"
git push origin feature/stage3-ai-service
```

**同时，下午（@mobile 在患者端 worktree）**：

```bash
# 1. 切换到患者端目录
cd D:\Code\ai-gen\intl-health-mgmt-patient

# 2. 同步主分支更新
git fetch origin master
git merge origin/master

# 3. 开发患者端功能（任务 20: 患者端认证与个人中心）
cd frontend-patient
# ... 编写代码 ...

# 4. 运行开发服务器
pnpm dev:mp-weixin

# 5. 提交代码
git add .
git commit -m "feat: 实现患者端认证与个人中心 (#20)"
git push origin feature/stage4-patient-app
```

**同时，晚上（@backend-ts 在医生端 worktree）**：

```bash
# 1. 切换到医生端目录
cd D:\Code\ai-gen\intl-health-mgmt-admin

# 2. 同步主分支更新
git fetch origin master
git merge origin/master

# 3. 开发医生端功能（任务 29: 医生端患者管理）
cd frontend-web
# ... 编写代码 ...

# 4. 运行开发服务器
pnpm dev

# 5. 提交代码
git add .
git commit -m "feat: 实现医生端患者管理 (#29)"
git push origin feature/stage5-admin-web
```

## 🛠️ 常用命令速查

### Worktree 管理

```bash
# 查看所有 worktree
git worktree list

# 添加新的 worktree
git worktree add <path> -b <branch-name>

# 删除 worktree
git worktree remove <path>

# 清理已删除的 worktree 记录
git worktree prune
```

### 分支管理

```bash
# 查看当前分支
git branch

# 查看所有分支（包括远程）
git branch -a

# 切换分支（在同一个 worktree 内）
git checkout <branch-name>

# 删除本地分支
git branch -d <branch-name>

# 强制删除本地分支
git branch -D <branch-name>
```

### 同步与合并

```bash
# 拉取远程更新
git fetch origin

# 合并远程分支
git merge origin/<branch-name>

# Rebase 到远程分支
git rebase origin/<branch-name>

# 推送到远程
git push origin <branch-name>

# 强制推送（谨慎使用）
git push -f origin <branch-name>
```

## 📊 并行开发时间线

根据 `docs/reports/plan/parallel-tasks-analysis.md`，推荐的并行开发时间线：

```
Week 3-4:
  - AI 服务开发（任务13-18）@ai-python [intl-health-mgmt-ai]
  - 患者端项目初始化（任务19）@mobile [intl-health-mgmt-patient]
  - 医生端项目初始化（任务28）@backend-ts [intl-health-mgmt-admin]

Week 5-6:
  - AI 服务完善（任务16-18）@ai-python [intl-health-mgmt-ai]
  - 患者端开发（任务20-23）@mobile [intl-health-mgmt-patient]
  - 医生端开发（任务29-31）@backend-ts [intl-health-mgmt-admin]

Week 7-8:
  - 患者端完善（任务24-27）@mobile [intl-health-mgmt-patient]
  - 医生端完善（任务32-35）@backend-ts [intl-health-mgmt-admin]
```

## 🔍 故障排查

### 问题 1：Worktree 路径错误

**症状**：`git worktree list` 显示的路径不正确

**解决方案**：

```bash
# 删除错误的 worktree
git worktree remove <wrong-path>

# 使用相对路径重新创建
git worktree add ../intl-health-mgmt-ai -b feature/stage3-ai-service
```

### 问题 2：无法切换分支

**症状**：`error: cannot switch branch while in worktree`

**原因**：该分支已在另一个 worktree 中使用

**解决方案**：直接切换到对应的 worktree 目录

```bash
cd D:\Code\ai-gen\intl-health-mgmt-ai
```

### 问题 3：合并冲突

**症状**：`git merge` 时出现冲突

**解决方案**：

```bash
# 1. 查看冲突文件
git status

# 2. 手动编辑冲突文件，解决冲突标记
# <<<<<<< HEAD
# 当前分支的代码
# =======
# 合并分支的代码
# >>>>>>> feature/xxx

# 3. 标记冲突已解决
git add <resolved-file>

# 4. 完成合并
git commit
```

### 问题 4：Worktree 无法删除

**症状**：`git worktree remove` 失败

**解决方案**：

```bash
# 强制删除
git worktree remove --force <path>

# 如果仍然失败，手动删除目录后清理记录
rm -rf <path>
git worktree prune
```

## 📚 参考资料

- **Git Worktree 官方文档**: https://git-scm.com/docs/git-worktree
- **并行任务分析报告**: `docs/reports/plan/parallel-tasks-analysis.md`
- **项目任务清单**: `.claude/specs/chronic-disease-management/tasks.md`
- **需求文档**: `.claude/specs/chronic-disease-management/requirements.md`

---

**文档维护**: @pm
**最后更新**: 2025-12-25
