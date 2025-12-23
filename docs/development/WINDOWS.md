# Windows 开发环境注意事项

本文档记录在 Windows 环境下开发时的常见问题和解决方案。

## 问题 1：nul 文件的产生

### 问题描述

在 Windows 环境下运行某些命令时，会在项目根目录和 `backend/` 目录下生成 `nul` 文件。

### 原因分析

在 Git Bash（或其他 Unix-like shell）中，当使用 Windows 风格的重定向语法时会产生此问题：

**错误示例**：

```bash
# ❌ 错误：会创建 nul 文件
rmdir /s /q dist 2>nul
del /f nul 2>nul
command 2>nul
```

**原因**：

- 在 Windows CMD 中，`NUL` 是一个特殊设备（类似 Unix 的 `/dev/null`）
- 在 Git Bash 中，`nul` 被当作普通文件名处理，因此创建了名为 `nul` 的文件

### 解决方案

在 Git Bash 或其他 Unix-like shell 中，应始终使用 Unix 风格的语法：

**正确示例**：

```bash
# ✅ 正确：使用 /dev/null
rm -rf dist 2>/dev/null
command 2>/dev/null

# ✅ 或者使用 stderr 重定向
command 2>&1 >/dev/null

# ✅ 或者使用 || true 忽略错误
command || true
```

### 清理 nul 文件

如果已经生成了 `nul` 文件，使用以下命令删除：

```bash
# 删除所有 nul 文件
find . -name "nul" -type f -delete

# 或者手动删除
rm -f nul
rm -f backend/nul
```

### Git 忽略配置

为防止意外提交 `nul` 文件，已在 `.gitignore` 中添加：

```gitignore
# Windows 产生的 nul 文件
nul
**/nul
```

---

## 问题 2：行尾符（Line Ending）

### 问题描述

Windows 使用 CRLF（`\r\n`），Unix/Linux 使用 LF（`\n`），可能导致文件提交时产生大量无意义的差异。

### 解决方案

**Git 配置**（推荐）：

```bash
# 配置 Git 自动转换行尾符
git config --global core.autocrlf true   # Windows
git config --global core.autocrlf input  # Linux/Mac
```

**EditorConfig** 配置：

项目根目录的 `.editorconfig` 文件应包含：

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
```

---

## 问题 3：路径分隔符

### 问题描述

Windows 使用反斜杠 `\`，Unix/Linux 使用正斜杠 `/`。

### 解决方案

**在代码中**：

```typescript
// ✅ 推荐：使用 path 模块
import path from 'path';
const filePath = path.join(__dirname, 'config', 'database.json');

// ❌ 避免：硬编码路径分隔符
const filePath = __dirname + '\\config\\database.json'; // Windows only
const filePath = __dirname + '/config/database.json'; // Unix only
```

**在 Shell 脚本中**：

```bash
# ✅ 推荐：始终使用正斜杠
cd src/common/influx

# ✅ 或使用 path 模块
node -e "console.log(require('path').join('src', 'common', 'influx'))"
```

---

## 问题 4：权限问题

### 问题描述

某些端口（如 5000）在 Windows 上可能被系统保留，导致 `EACCES: permission denied` 错误。

### 解决方案

**修改监听端口**：

```typescript
// 开发环境使用非保留端口
const port = process.env.PORT || 5000; // 改为 5000 或其他端口
// 如需强制仅本机访问或明确 IPv4，可设置 HOST=127.0.0.1
const host = process.env.HOST || '0.0.0.0';
await app.listen(port, host);
```

**检查端口占用**：

```bash
# Windows
netstat -ano | findstr :5000

# 或使用 PowerShell
Get-NetTCPConnection -LocalPort 5000
```

**使用管理员权限**（不推荐）：

```bash
# 以管理员身份运行 Git Bash
# 右键 Git Bash 快捷方式 → "以管理员身份运行"
```

---

## 问题 5：Docker 和 WSL2

### 推荐配置

**使用 WSL2 运行 Docker**：

1. 安装 WSL2：https://docs.microsoft.com/en-us/windows/wsl/install
2. 安装 Docker Desktop for Windows
3. 在 Docker Desktop 设置中启用 WSL2 backend

**在 WSL2 中开发**（推荐）：

```bash
# 在 WSL2 Ubuntu 中克隆项目
cd /mnt/d/Code/ai-gen/
git clone <repo-url>

# 使用 WSL2 的 bash
cd intl-health-mgmt
pnpm install
```

---

## 问题 6：pnpm 在 Windows 上的问题

### 符号链接权限

pnpm 使用符号链接，Windows 需要开启开发者模式或以管理员权限运行。

**解决方案**：

```bash
# 开启 Windows 开发者模式
# 设置 → 更新和安全 → 开发者选项 → 开发者模式

# 或使用 npm/yarn 替代（不推荐）
npm install
```

---

## 最佳实践总结

### 命令行环境选择

推荐优先级（从高到低）：

1. **WSL2 Ubuntu**（最推荐）- 完整的 Linux 环境
2. **Git Bash**（推荐）- 基本 Unix 命令支持
3. **PowerShell 7+**（可接受）- 需要学习 PowerShell 语法
4. **CMD**（不推荐）- 功能受限

### Shell 脚本编写规范

```bash
#!/usr/bin/env bash

# 设置严格模式
set -euo pipefail

# 使用 Unix 风格的路径和重定向
rm -rf dist 2>/dev/null || true
mkdir -p build/output

# 避免使用 Windows 特定命令
# ❌ del, rmdir, copy
# ✅ rm, mkdir, cp
```

### TypeScript/Node.js 代码规范

```typescript
// ✅ 使用跨平台的 API
import path from 'path';
import os from 'os';

const configPath = path.join(__dirname, 'config.json');
const tempDir = os.tmpdir();

// ❌ 避免平台特定的路径
const configPath = __dirname + '\\config.json'; // Windows only
```

---

## 相关文档

- [Git for Windows](https://gitforwindows.org/)
- [WSL2 安装指南](https://docs.microsoft.com/en-us/windows/wsl/install)
- [Docker Desktop WSL2 backend](https://docs.docker.com/desktop/windows/wsl/)
- [EditorConfig](https://editorconfig.org/)

---

**最后更新**：2025-12-23
**维护者**：开发团队
