# 智慧慢病管理系统 - 管理后台

基于 React 18 + TypeScript + Ant Design 的管理后台系统。

## 功能模块

- **用户管理**: 用户列表、角色分配、账号启用/禁用
- **系统配置**: 积分规则、风险评估阈值、AI 模型参数配置
- **审计日志**: 操作日志查看、搜索、导出

## 技术栈

- React 18
- TypeScript
- Ant Design 5
- Zustand (状态管理)
- React Router 6
- Axios
- Vite

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 权限控制

仅 `admin` 角色可访问管理后台所有功能。
