# ================================
# Stage 1: 依赖安装阶段
# ================================
FROM node:18-alpine AS deps

WORKDIR /app

# 安装 pnpm（使用 corepack，指定与仓库 packageManager 一致的 pnpm 版本）
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 安装所有依赖（用于构建），使用 frozen lockfile 确保可复现构建
RUN pnpm install --frozen-lockfile

# ================================
# Stage 2: 构建阶段
# ================================
FROM node:18-alpine AS builder

WORKDIR /app

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/prisma ./prisma/

# 复制源代码
COPY . .

# 生成 Prisma Client 并构建
RUN npx prisma generate && npm run build

# ================================
# Stage 3: 生产依赖阶段
# ================================
FROM node:18-alpine AS prod-deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 仅安装生产依赖（使用 frozen lockfile 确保可复现构建）
RUN pnpm install --prod --frozen-lockfile && \
  npx prisma generate

# ================================
# Stage 4: 生产运行阶段
# ================================
FROM node:18-alpine AS production

WORKDIR /app

# 安装 dumb-init（优雅处理信号）
RUN apk add --no-cache dumb-init

# 从生产依赖阶段复制
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 5000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 启动
CMD ["dumb-init", "node", "dist/main"]
