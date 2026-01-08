# GitHub Actions CI/CD 配置说明

本项目使用 GitHub Actions 进行持续集成和持续部署。

## 工作流概览

### 1. CI - 持续集成 (`.github/workflows/ci.yml`)

**触发条件：**

- Push 到 `master`、`main`、`develop` 分支
- Pull Request 到上述分支

**执行内容：**

#### Backend (Node.js/NestJS)

- ✅ ESLint 代码检查
- ✅ TypeScript 类型检查
- ✅ 单元测试（Jest）
- ✅ E2E 测试
- ✅ 构建验证
- ✅ 测试覆盖率上传（Codecov）

#### AI Service (Python/FastAPI)

- ✅ Flake8 代码检查
- ✅ Black 格式检查
- ✅ MyPy 类型检查
- ✅ Pytest 单元测试

**测试环境：**

- Node.js: 18.x, 20.x
- Python: 3.11
- PostgreSQL 15
- Redis 7
- MinIO

### 2. Code Quality - 代码质量检查 (`.github/workflows/code-quality.yml`)

**触发条件：**

- Pull Request 到 `master`、`main`、`develop` 分支

**执行内容：**

- 🔍 ESLint 检查
- 🎨 Prettier 格式检查
- 🚫 Console.log 检测
- 📝 TODO/FIXME 注释检测
- 📦 Bundle 大小检查
- 🔒 安全审计
- 📊 测试覆盖率检查（≥70%）
- 💬 PR 覆盖率报告

### 3. CD - 持续部署 (`.github/workflows/cd.yml`)

**触发条件：**

- Push 到 `master`/`main` 分支 → 部署到 Staging
- Push tag `v*` → 部署到 Production

**执行内容：**

- 🏗️ 构建 Docker 镜像
- 🚀 部署到目标环境
- 📦 创建 GitHub Release（生产环境）

### 4. Dependency Update - 依赖更新 (`.github/workflows/dependency-update.yml`)

**触发条件：**

- 每周一早上 9 点（UTC+8）
- 手动触发

**执行内容：**

- 📦 检查过期依赖
- ⬆️ 更新依赖包
- ✅ 运行测试
- 🔄 自动创建 PR

## 状态徽章

在项目 README 中添加以下徽章：

\`\`\`markdown
![CI](https://github.com/babeloo/health-management/workflows/CI/badge.svg)
![Code Quality](https://github.com/babeloo/health-management/workflows/Code%20Quality/badge.svg)
[![codecov](https://codecov.io/gh/babeloo/health-management/branch/master/graph/badge.svg)](https://codecov.io/gh/babeloo/health-management)
\`\`\`

## 环境变量配置

### GitHub Secrets

需要在 GitHub 仓库设置中配置以下 Secrets：

#### 必需的 Secrets

- `GITHUB_TOKEN` - 自动提供，无需配置

#### 可选的 Secrets（用于部署）

- `DOCKER_USERNAME` - Docker Hub 用户名
- `DOCKER_PASSWORD` - Docker Hub 密码
- `DEPLOY_SSH_KEY` - 部署服务器 SSH 密钥
- `CODECOV_TOKEN` - Codecov 上传令牌

### 环境配置

在 GitHub 仓库设置中配置以下环境：

1. **staging** - 测试环境
   - URL: <https://staging.your-domain.com>
   - 需要审批：否

2. **production** - 生产环境
   - URL: <https://your-domain.com>
   - 需要审批：是（建议）

## 本地测试 CI 工作流

使用 [act](https://github.com/nektos/act) 在本地测试 GitHub Actions：

\`\`\`bash

# 安装 act

brew install act # macOS

# 或

choco install act # Windows

# 运行 CI 工作流

act -j lint-and-test

# 运行特定事件

act pull_request
\`\`\`

## 工作流优化建议

### 1. 缓存优化

- ✅ 已启用 pnpm 缓存
- ✅ 已启用 pip 缓存
- 🔄 可考虑添加 Docker layer 缓存

### 2. 并行执行

- ✅ 多个 Node.js 版本并行测试
- ✅ Backend 和 Python 测试并行执行
- 🔄 可考虑拆分更多独立 job

### 3. 条件执行

- ✅ 仅在 PR 时运行代码质量检查
- ✅ 仅在特定分支/tag 时部署
- 🔄 可考虑根据文件变更跳过不相关测试

## 故障排查

### 常见问题

**1. 测试失败：数据库连接错误**

- 检查 PostgreSQL service 是否正常启动
- 验证 `DATABASE_URL` 环境变量配置

**2. 测试失败：MinIO 连接错误**

- MinIO service 在 GitHub Actions 中可能需要额外配置
- 考虑使用 mock 或跳过依赖 MinIO 的测试

**3. 覆盖率检查失败**

- 当前阈值设置为 70%
- 可在 `code-quality.yml` 中调整阈值

**4. 依赖安装超时**

- 检查网络连接
- 考虑使用国内镜像源

## 维护指南

### 更新工作流

1. 修改 `.github/workflows/*.yml` 文件
2. 提交并推送到仓库
3. 在 Actions 标签页查看执行结果

### 禁用工作流

在工作流文件顶部添加：

\`\`\`yaml
on:
workflow_dispatch: # 仅手动触发
\`\`\`

### 调试工作流

在步骤中添加调试输出：

\`\`\`yaml

- name: Debug
  run: |
  echo "Current directory: $(pwd)"
  echo "Environment variables:"
  env | sort
  \`\`\`

## 相关文档

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [pnpm Action](https://github.com/pnpm/action-setup)
- [Codecov Action](https://github.com/codecov/codecov-action)
- [Create Pull Request Action](https://github.com/peter-evans/create-pull-request)

---

**最后更新：** 2025-12-22
**维护者：** @babeloo
