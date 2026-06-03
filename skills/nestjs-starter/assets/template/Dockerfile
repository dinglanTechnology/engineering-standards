# syntax=docker/dockerfile:1.7

# ======================================================================
# Stage 1: builder
# 安装全部依赖（含 devDependencies）、生成 Prisma Client、构建 TS
# ======================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# 启用 pnpm（Node 22 自带 corepack）
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# 先拷 manifest，利用 Docker 层缓存（manifest 不变时跳过 install）
# pnpm-lock.yaml 用通配后缀：模板首次构建可能尚未生成 lockfile，缺失时不致 COPY 失败
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma

# 使用 BuildKit 缓存挂载加速重复构建（需启用 DOCKER_BUILDKIT=1，Docker 23+ 默认启用）
# --prefer-frozen-lockfile：有 lockfile 时严格按其安装（可复现），无 lockfile 时自动生成而非报错
# 项目稳定后请把 pnpm-lock.yaml 提交进仓库，CI 里可改用更严格的 --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --prefer-frozen-lockfile

# 拷贝源码并构建
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN pnpm build

# 裁剪 devDependencies，保留给 runner 用的 node_modules
RUN pnpm prune --prod


# ======================================================================
# Stage 2: runner
# 只保留运行时所需：node_modules(prod)、dist、prisma schema
# ======================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# 运行时仍需 pnpm 执行 prisma migrate deploy
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# 从 builder 拷贝产物
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# 非 root 用户运行（安全要求）
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

# 容器内健康检查，K8s / Docker Swarm 通用
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8000/health || exit 1

# 启动前执行数据库迁移（生产推荐，但也可改为 CI 中执行）
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
