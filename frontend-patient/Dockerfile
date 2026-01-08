# ================================
# Stage 1: 依赖安装阶段
# ================================
FROM node:18-alpine AS deps

WORKDIR /app

# 安装 pnpm（使用 corepack，指定与仓库 packageManager 一致的 pnpm 版本）
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# 复制 workspace 依赖文件（锁文件在仓库根目录）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend-patient/package.json ./frontend-patient/package.json

# 仅安装 patient 端依赖
RUN pnpm install --frozen-lockfile --filter ./frontend-patient...

# ================================
# Stage 2: 构建阶段
# ================================
FROM node:18-alpine AS builder

WORKDIR /app

# 从 deps 阶段复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend-patient/node_modules ./frontend-patient/node_modules
COPY --from=deps /app/frontend-patient/package.json ./frontend-patient/package.json

# 复制源代码
COPY frontend-patient ./frontend-patient

# 构建 H5 版本
WORKDIR /app/frontend-patient
RUN npm run build:h5

# ================================
# Stage 3: 生产阶段（Nginx）
# ================================
FROM nginx:alpine AS production

# 复制自定义 Nginx 配置
COPY frontend-patient/nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/frontend-patient/dist/build/h5 /usr/share/nginx/html

# 创建健康检查端点
RUN echo '<!DOCTYPE html><html><body>OK</body></html>' > /usr/share/nginx/html/health

# 设置权限
RUN chown -R nginx:nginx /usr/share/nginx/html &&     chmod -R 755 /usr/share/nginx/html

EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3   CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
