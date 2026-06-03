# 安全中间件

## Helmet

在 `main.ts` 里：

```ts
app.use(helmet({ contentSecurityPolicy: false }))
```

Helmet 设置一堆安全响应头（`X-Frame-Options`、`X-Content-Type-Options`、`Strict-Transport-Security` 等）。默认模板关闭了 CSP，因为 Swagger UI 的内嵌脚本会被严格 CSP 拦截。

**生产环境建议**：如果接口不对外嵌入任何前端页面，打开 CSP：

```ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Swagger 需要的话单独放开 /docs 路径
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}))
```

## CORS

```ts
app.enableCors({
  origin: corsOrigin === "*" ? true : corsOrigin.split(",").map(s => s.trim()),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
})
```

环境变量 `CORS_ORIGIN` 控制白名单：

```bash
# 开发
CORS_ORIGIN=*

# 生产（多个域名逗号分隔）
CORS_ORIGIN=https://app.example.com,https://admin.example.com
```

**生产环境绝不要用 `*`**。配合 `credentials: true` 时 `*` 其实也不工作（浏览器会拒绝），但还是显式列白名单最安全。

## 限流（按需加）

模板里没有内置限流，因为大部分服务前面有 Nginx / 云 WAF 做全局限流。若业务需要接口级限流（如登录接口防暴力破解），加 `@nestjs/throttler`：

```bash
pnpm add @nestjs/throttler
```

```ts
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler"
import { APP_GUARD } from "@nestjs/core"

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1000, limit: 3 },    // 每秒 3 次
      { name: "long", ttl: 60000, limit: 100 },  // 每分钟 100 次
    ]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
```

特定接口定制：

```ts
import { Throttle } from "@nestjs/throttler"

@Throttle({ default: { limit: 5, ttl: 60_000 } })  // 登录接口每分钟 5 次
@Public()
@Post("login")
login() {}
```

## 敏感信息泄露检查

- ✅ 响应错误信息模糊化：登录失败返回 "手机号或密码错误"，不说"用户不存在"或"密码错误"
- ✅ 不在错误响应里暴露 stack trace（`AllExceptionsFilter` 已经处理，生产环境 stack 只记日志不返回前端）
- ✅ Swagger 在生产关闭（`main.ts` 里已经 `if (NODE_ENV !== 'production')`）
- ✅ 数据库连接串、JWT secret 只在 `.env` 里，不硬编码，不打进镜像
- ✅ 日志脱敏（见 `logging.md`）

## HTTPS / TLS

应用本身不处理 TLS 终止，交给 Nginx / ALB / Ingress。应用内：

- 设置 `app.set("trust proxy", 1)` 让 Express 信任代理的 `X-Forwarded-For`
- 这样 `req.ip` 才是真实客户端 IP，不是代理 IP

在 `main.ts` 添加（模板里没默认开启，按需加）：

```ts
app.set("trust proxy", 1)
```

## 依赖漏洞

定期跑：

```bash
pnpm audit
pnpm update --interactive
```

CI 里加一步 `pnpm audit --audit-level=high`，high 以上漏洞直接阻断发布。
