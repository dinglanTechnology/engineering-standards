# Docker 部署

## 构建镜像

```bash
# 开启 BuildKit（Docker 23+ 默认已开，老版本需要）
export DOCKER_BUILDKIT=1

docker build -t my-service:latest .
```

模板的 `Dockerfile` 是多阶段构建：

- **builder 阶段**：安装全部依赖（含 devDependencies）、生成 Prisma Client、`pnpm build`、`pnpm prune --prod` 裁剪
- **runner 阶段**：从 builder 复制精简后的 `node_modules`、`dist`、`prisma`，非 root 用户运行

镜像大小：~180MB（对比 node:22 基础版 1GB+，alpine 省了 70%）。

## 关键细节

### 为什么用 corepack 启用 pnpm

Node 22 自带 corepack，官方推荐方式。避免 `npm install -g pnpm` 污染全局，也不用指定 pnpm 的具体版本从网上拉（corepack 会从 lockfile 的 `packageManager` 字段读）。

### 为什么有 BuildKit 缓存挂载

```dockerfile
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
```

这让 pnpm 的 content-addressable store 跨构建复用。CI 多次构建同一项目（尤其是改一行代码就重新构建时）能节省 60%+ 时间。老版本 Docker 忽略这行不影响功能，只是慢一点。

### 为什么从 builder 复制 node_modules 而不是在 runner 里重装

用户原稿的 Dockerfile 在 runner 阶段又 `npm ci --omit=dev` 重装了一次，还重新 `npx prisma generate`。这样做 runner 阶段至少多 30 秒。

模板的做法：builder 装全量依赖 → build → `pnpm prune --prod` 原地裁剪 devDependencies → 直接 `COPY --from=builder /app/node_modules`。`node_modules/.prisma`（生成的 Client）也一起带过来了，不用再 generate。

### HEALTHCHECK

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8000/health || exit 1
```

`docker ps` 会显示 `(healthy)` / `(unhealthy)`，Swarm 和 Compose 的重启策略会用。K8s 用自己的 `livenessProbe` / `readinessProbe`，会忽略这个，但留着不影响。

### CMD 里的 migrate deploy

```dockerfile
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
```

容器启动时自动跑迁移。**这是个权衡**：

- ✅ 优点：简单、部署顺序不会错
- ❌ 缺点：多实例同时启动时会有并发问题；迁移失败导致 Pod 反复重启

**生产推荐做法**是把迁移从 Pod 启动里挪出去：

- K8s：用 InitContainer 或独立 Job 跑迁移
- CI/CD：部署流水线里单独一步执行 `pnpm prisma migrate deploy`

模板保留 `migrate deploy` 在 CMD 里是给小团队/简单场景的默认选择。规模化后改成：

```dockerfile
CMD ["node", "dist/main.js"]
```

## docker-compose（本地开发）

模板没带 `docker-compose.yml`。如果你要一键起 MySQL + 服务，在项目根目录加：

```yaml
services:
  mysql:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: nestjs_starter
    ports: ["3306:3306"]
    volumes: ["mysql_data:/var/lib/mysql"]
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-uroot", "-proot"]
      interval: 5s
      retries: 10

  app:
    build: .
    depends_on:
      mysql: { condition: service_healthy }
    environment:
      DATABASE_URL: mysql://root:root@mysql:3306/nestjs_starter
      JWT_SECRET: dev-secret-change-me
      NODE_ENV: production
    ports: ["8000:8000"]

volumes:
  mysql_data:
```

`docker compose up --build`。

## CI 示例（GitHub Actions）

```yaml
name: Build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma generate
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
      - run: pnpm audit --audit-level=high
```

## 常见坑

- **镜像里出现了 `node_modules`/`dist` 占用巨大**：检查 `.dockerignore` 是否丢失（模板已自带）
- **`prisma migrate deploy` 找不到迁移文件**：Dockerfile 漏拷 `prisma/migrations` 目录。模板里 `COPY --from=builder /app/prisma ./prisma` 已包含
- **容器内 `req.ip` 是 172.xx**：Express 默认不信任代理，加 `app.set("trust proxy", 1)`（见 `security.md`）
- **`pnpm exec` 找不到 prisma**：确认 runner 阶段复制了 `node_modules`；或改为 `node node_modules/.bin/prisma migrate deploy`
- **镜像层 cache 总失效**：确认拷贝顺序——先 `package.json`+`pnpm-lock.yaml`+`prisma/`，再 `pnpm install`，**最后**再 `COPY src`。模板的顺序已经是这样
