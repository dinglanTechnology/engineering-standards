---
name: dl-nestjs-starter
description: 团队内部的 NestJS 后端项目规范与脚手架。使用这个 skill 当用户要搭建一个新的 NestJS 项目、添加生产级的基础设施（日志/异常过滤器/响应拦截器/Swagger/JWT 认证/Prisma/Docker）、审查现有 NestJS 项目的代码规范，或需要一套符合团队统一风格的 NestJS 模板时。技术栈是 NestJS 11 + TypeScript + Prisma 6 + MySQL + argon2 + Winston + pnpm。即使用户没有明确说出 "脚手架" 或 "模板" 这类词，只要他们在做 NestJS 后端相关的搭建或规范化工作，就应该触发这个 skill。
---

# NestJS 团队基础框架

这是团队内部的 NestJS 项目规范。目标是让任何一个新项目在 10 分钟内起步、开箱即用地具备生产级配置，并且所有项目保持一致的代码风格和目录结构。

## 技术栈

| 组件 | 版本 | 说明 |
|---|---|---|
| Node.js | 22 LTS | 容器基础镜像用 `node:22-alpine` |
| 包管理器 | **pnpm** | 磁盘占用低、锁文件确定性高、Docker 构建快 |
| 框架 | NestJS 11+ | |
| 语言 | TypeScript 5+ | `strict: true` |
| ORM | Prisma 6+ | |
| 数据库 | MySQL 8+ | |
| 密码哈希 | argon2 | 不用 bcrypt |
| 日志 | Winston + nest-winston | 按天切分、JSON 格式 |
| 校验 | class-validator + class-transformer | |
| 认证 | @nestjs/jwt + @nestjs/passport + passport-jwt | |
| API 文档 | @nestjs/swagger | |

> **为什么 pnpm 而不是 npm**: pnpm 的硬链接机制对 Prisma 这种大依赖非常友好，磁盘节省约 60%；`pnpm-lock.yaml` 的合并冲突显著少于 `package-lock.json`；Docker 多阶段构建里 `pnpm fetch` + `--offline` 比 `npm ci` 快 30%+。新机器第一次使用只需 `corepack enable`，Node 22 自带。

## 如何使用这个 skill

这个 skill 有两种用法:

**用法 A — 起新项目**: 把 `assets/template/` 目录整个复制出来当项目根目录，按下面的 "从模板起步" 一节配置后即可运行。模板本身已经是一个可跑的 NestJS + Prisma + JWT 认证项目，包含用户注册登录的完整示例。

**用法 B — 给现有项目补基础设施**: 不要整体覆盖，按需从 `references/` 目录读取对应模块的规范文档，把代码片段和配置搬到现有项目里。`references/` 下每个文件都是独立可用的。

## 从模板起步

```bash
# 1. 复制模板（替换 my-service 为你的项目名）
cp -r assets/template my-service && cd my-service

# 2. 启用 pnpm（Node 22 自带 corepack，首次需启用）
corepack enable

# 3. 安装依赖
pnpm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env，至少填 DATABASE_URL 和 JWT_SECRET

# 5. 生成 Prisma Client 并执行数据库迁移
pnpm prisma migrate dev --name init

# 6. 启动开发服务
pnpm start:dev

# 启动后访问 http://localhost:8000/docs 查看 Swagger
# 健康检查 http://localhost:8000/health
```

## 项目目录结构（模板）

```
src/
├── main.ts                      # 入口：全局拦截器/过滤器/管道/Swagger/CORS 在这里注册
├── app.module.ts                # 根模块
├── config/
│   ├── winston.config.ts        # Winston 日志配置
│   └── env.validation.ts        # 环境变量校验（启动期 fail-fast）
├── common/                      # 跨模块的通用设施
│   ├── filters/
│   │   ├── all-exceptions.filter.ts     # 兜底异常过滤器
│   │   └── prisma-exception.filter.ts   # Prisma 异常过滤器
│   ├── interceptors/
│   │   └── response.interceptor.ts      # 统一响应 { code, data, message }
│   ├── middleware/
│   │   └── logger.middleware.ts         # HTTP 访问日志
│   ├── decorators/
│   │   ├── public.decorator.ts          # @Public() 跳过 JWT 守卫
│   │   └── current-user.decorator.ts    # @CurrentUser() 取当前用户
│   └── guards/
│       └── jwt-auth.guard.ts            # 全局 JWT 守卫
├── prisma/
│   ├── prisma.module.ts         # 全局 PrismaModule
│   └── prisma.service.ts        # PrismaService（封装 onModuleInit）
└── modules/                     # 业务模块
    ├── auth/                    # 认证：注册 / 登录 / JWT 策略
    ├── user/                    # 用户
    └── health/                  # /health 探针
```

**核心规则**:

1. 业务模块统一放 `modules/` 下，每个模块自成目录（`*.module.ts` / `*.controller.ts` / `*.service.ts` / `dto/`）。
2. 所有跨模块的基础设施（过滤器、拦截器、守卫、装饰器）放 `common/` 下，不放模块内部。
3. `config/` 只放配置工厂和环境变量校验，不放业务。
4. `PrismaModule` 标记为 `@Global()`，业务模块直接注入 `PrismaService`，不要重复 import。

## 分模块详细规范

每一项都有独立的文档在 `references/` 下，需要细节时按需阅读，不要一次全部加载：

| 关注点 | 文件 | 什么时候读 |
|---|---|---|
| Winston 日志 | `references/logging.md` | 需要改日志级别、加 transport、调整脱敏 |
| HTTP + Prisma 异常过滤器 | `references/exception-filters.md` | **过滤器注册顺序有坑，新增过滤器前必读** |
| 统一响应格式 | `references/response-interceptor.md` | 改返回结构、排除某些路由（如文件下载） |
| DTO 与参数校验 | `references/validation.md` | 新写 DTO、需要自定义校验器 |
| 环境变量与 ConfigService | `references/config.md` | 加新的环境变量、改启动期校验 |
| JWT 认证模块 | `references/auth.md` | 改登录逻辑、加刷新令牌、加角色权限 |
| Prisma 使用规范 | `references/prisma-guide.md` | 新建 schema、事务、分页、软删除 |
| 安全中间件 | `references/security.md` | CORS 白名单、Helmet CSP、限流 |
| Swagger API 文档 | `references/swagger.md` | 自定义文档、分组、导出 JSON |
| Dockerfile 与部署 | `references/docker.md` | 镜像优化、CI 集成、K8s 探针 |

## 必守的约定（Do / Don't）

### Do

- ✅ **启动期校验环境变量**（`config/env.validation.ts`），缺失的配置在启动时就崩溃，不要留到运行时。
- ✅ **所有 Controller 的入参必须用 DTO + class-validator**，不要直接 `@Body() body: any`。
- ✅ **使用 argon2 哈希密码**，参数用默认的 `argon2id` 变种。写入数据库前必须 hash，不要存明文。
- ✅ **异常过滤器注册顺序: 具体的在前，通用的在后**（见 `references/exception-filters.md`，这个顺序反了就会静默失效）。
- ✅ **Prisma 的 `password` 字段在返回给前端时必须剔除**，用 `select` 白名单或在 DTO 层过滤，绝不要 `return user`。
- ✅ **所有异步错误必须通过 HttpException 或 Prisma 原生错误抛出**，不要自己 `res.status().json()`。
- ✅ **日志里不能打印密码、token、身份证、手机号明文**（手机号至少脱敏中间 4 位）。

### Don't

- ❌ **不要用 bcrypt**。团队统一 argon2。
- ❌ **不要在 Controller 里直接写 Prisma 调用**。业务逻辑在 Service。
- ❌ **不要用 `any`**，tsconfig 开了 `noImplicitAny`，真需要兜底用 `unknown` + 类型守卫。
- ❌ **不要在代码里硬编码任何密钥、URL、端口**。全部走 `ConfigService`。
- ❌ **不要把 `.env` 提交到 git**（`.env.example` 才提交）。
- ❌ **不要在生产镜像里保留源码和 devDependencies**。Dockerfile 的多阶段构建已经处理好了，不要改。

## 常见任务速查

**加一个新的业务模块**（例如 `order`）:

```bash
pnpm nest g module modules/order
pnpm nest g controller modules/order
pnpm nest g service modules/order
```

然后在模块内按 `auth/` 的结构补 `dto/` 目录。DTO 写法见 `references/validation.md`。

**加一个新的环境变量**:

1. 在 `.env.example` 里加一行并注释含义
2. 在 `src/config/env.validation.ts` 里加校验规则
3. 使用处 `configService.get<string>('MY_VAR')`（给泛型）

**接口要跳过 JWT 认证**（比如登录接口本身）:

```ts
import { Public } from '@/common/decorators/public.decorator'

@Public()
@Post('login')
login() { ... }
```

**数据库加字段**:

```bash
# 改完 schema.prisma 后
pnpm prisma migrate dev --name add_xxx_field
```

不要手动改数据库，一切通过 migration。

---

更多细节按上面的表格查 `references/`。模板代码本身带完整注释，可以直接当作活文档使用。
