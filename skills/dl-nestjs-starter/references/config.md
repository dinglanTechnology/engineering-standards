# 环境变量与 ConfigService

## 原则

**一切环境相关的配置都走 `ConfigService`，代码里不允许出现硬编码**。这包括：数据库连接、JWT 密钥、第三方 API 地址、超时阈值、限流数值、开关位。

违反这条的代价是：上线时改配置要改代码、重新构建镜像；切环境要多人手动操作；敏感信息混进代码仓库。

## 环境文件约定

```
.env              # 本地开发用，不提交（.gitignore 已排除）
.env.example      # 模板，提交仓库，含所有变量的注释说明
.env.test         # 测试环境，按需创建
.env.production   # 通常不使用文件，由部署平台注入环境变量
```

`app.module.ts` 里的加载顺序：`.env.<NODE_ENV>` → `.env`。先命中的优先。

## 加一个新变量的完整流程

假设要加 `REDIS_URL`：

**第 1 步**：在 `.env.example` 加一行并注释含义，让其他人一眼看懂：

```bash
# Redis 连接串，格式 redis://[:password@]host:port/db
REDIS_URL=redis://localhost:6379/0
```

**第 2 步**：在 `src/config/env.validation.ts` 的 Joi schema 里加校验：

```ts
REDIS_URL: Joi.string().uri({ scheme: ["redis", "rediss"] }).required(),
```

启动时变量缺失或格式错，应用会立刻崩溃，不会带着错误配置进入运行时。

**第 3 步**：在 `.env` 里填上本地值（别人也能从 `.env.example` 复制）。

**第 4 步**：使用时带上泛型参数，保留类型信息：

```ts
constructor(private readonly configService: ConfigService) {}

const url = this.configService.get<string>("REDIS_URL")
const timeout = this.configService.get<number>("REDIS_TIMEOUT", 5000) // 第二个参数是默认值
```

## 分组配置：`registerAs`

当一个模块需要一坨配置时，不要在代码里零散地 `configService.get()` 七八次。用 `registerAs`：

```ts
// src/config/redis.config.ts
import { registerAs } from "@nestjs/config"

export default registerAs("redis", () => ({
  url: process.env.REDIS_URL!,
  keyPrefix: process.env.REDIS_KEY_PREFIX ?? "app:",
  ttl: Number(process.env.REDIS_DEFAULT_TTL ?? 300),
}))
```

注册：

```ts
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  load: [redisConfig],
  // ... 其他配置保持不变
})
```

使用：

```ts
import { ConfigType } from "@nestjs/config"
import redisConfig from "@/config/redis.config"

@Injectable()
export class RedisService {
  constructor(@Inject(redisConfig.KEY) private readonly cfg: ConfigType<typeof redisConfig>) {
    // cfg.url / cfg.keyPrefix / cfg.ttl  -- 完全类型安全
  }
}
```

## 环境区分

```ts
const isProd = this.configService.get("NODE_ENV") === "production"
```

**但**：如果一个行为需要根据环境差异化，优先用单独的环境变量（如 `ENABLE_SWAGGER=true`）而不是硬判 `NODE_ENV`。这样在测试环境开启 Swagger 时不用改代码。

## 禁止事项

- ❌ 不要把 `JWT_SECRET`、DB 密码、第三方 API key 写进代码或 `.env.example` 的默认值
- ❌ 不要把 `.env` 提交到 git（即使私有仓库也不行，泄露成本太高）
- ❌ 不要在启动后动态读取环境变量（`process.env.XXX` 散落在业务代码里）——一律通过 `ConfigService`
- ❌ 不要把生产环境的真实 `.env` 打进 Docker 镜像（`.dockerignore` 已处理）
