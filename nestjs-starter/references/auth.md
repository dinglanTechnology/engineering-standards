# JWT 认证

## 架构

```
客户端  --[Authorization: Bearer <token>]-->  JwtAuthGuard (全局守卫)
                                                    |
                                                    v
                                              JwtStrategy.validate
                                                    |
                                                    v
                                             request.user = { userId, phone, username }
                                                    |
                                                    v
                                              业务 Controller / @CurrentUser()
```

**关键**：`JwtAuthGuard` 在 `main.ts` 里全局注册，**默认所有接口都要登录**。想要公开的接口显式加 `@Public()`。

为什么默认私有？因为"忘加保护 → 数据泄露"的代价远大于"忘加 @Public() → 登录接口 401"。后者测一次就能发现。

## 配置项

环境变量：

```bash
JWT_SECRET=<至少 32 字节的随机串>
JWT_EXPIRES_IN=7d
```

生成强密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

修改过期时间支持 `zeit/ms` 语法：`60`（秒）、`"10h"`、`"7d"`、`"30d"`。

## 常见任务

### 公开某个接口

```ts
import { Public } from "@/common/decorators/public.decorator"

@Public()
@Get("articles")
listArticles() { ... }
```

### 在 Controller 里取当前用户

```ts
import { CurrentUser, CurrentUserPayload } from "@/common/decorators/current-user.decorator"

@Get("me")
me(@CurrentUser() user: CurrentUserPayload) {
  return user
}

// 只要某个字段
@Get("my-orders")
myOrders(@CurrentUser("userId") userId: number) { ... }
```

### Swagger 里带 Bearer 认证

Controller 加 `@ApiBearerAuth("bearer")`：

```ts
@ApiTags("order")
@ApiBearerAuth("bearer")  // 和 main.ts 里 addBearerAuth 的第二个参数要一致
@Controller({ path: "order", version: "1" })
export class OrderController {}
```

Swagger 页面右上角会出现 "Authorize" 按钮，点击填入 token 后所有接口自动带上。

### 密码哈希（argon2）

`AuthService.register` 里已经示范。关键用法：

```ts
import * as argon2 from "argon2"

// 注册时哈希
const hash = await argon2.hash(plainPassword)
// 存入 user.password 字段（VARCHAR(255)）

// 登录时校验
const isValid = await argon2.verify(user.password, plainPassword)
```

argon2 默认使用 `argon2id` 变种，自动生成 salt 并包含在哈希串里，**不要自己管 salt**。

**为什么不用 bcrypt**：argon2 是 2015 年密码哈希竞赛冠军，对 GPU/ASIC 攻击抵抗性更好；参数更直观；内存难度可调。团队统一用这个。

## 加"刷新令牌"

默认模板只有 access token。需要 refresh token 时：

1. 登录时同时签发 access（短期，如 15m）和 refresh（长期，如 30d），refresh 存 Redis 或数据库
2. 加一个 `POST /auth/refresh` 接口，验证 refresh token 后签发新 access
3. refresh token 用独立的 secret（`JWT_REFRESH_SECRET`）
4. 支持登出 = 从存储里删除 refresh token

简化实现思路：

```ts
// AuthService
async refresh(refreshToken: string) {
  const payload = await this.jwtService.verifyAsync(refreshToken, {
    secret: this.configService.get("JWT_REFRESH_SECRET"),
  })
  // 校验 redis 里是否还有效
  const cached = await this.redis.get(`refresh:${payload.sub}`)
  if (cached !== refreshToken) throw new UnauthorizedException()

  return this.signTokens({ sub: payload.sub, phone: payload.phone, username: payload.username })
}
```

## 加角色权限（RBAC 简化版）

用 `@Roles()` + `RolesGuard`：

```ts
// src/common/decorators/roles.decorator.ts
export const ROLES_KEY = "roles"
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)

// src/common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!required) return true
    const { user } = ctx.switchToHttp().getRequest()
    return required.some(r => user?.roles?.includes(r))
  }
}
```

前提是 User schema 加一个 `roles` 字段（JSON 或关联表），`JwtStrategy.validate` 把 roles 塞进 request.user。

## 注意事项

- `JwtStrategy.validate` 里每次请求都会查数据库确认用户存在——这保证用户被删除后旧 token 立即失效，代价是每次认证多一次 DB 查询。数据量大时可以加 Redis 缓存。
- 模板里没有"单点登录"（同一用户只能有一个活跃 token）逻辑。需要的话在 `User` 表加 `tokenVersion: Int`，每次关键操作 +1，签发的 token 带上这个 version，validate 时比对。
- JWT 不可撤销是设计特性。如果业务需要"立刻踢人下线"，必须引入黑名单（Redis）或 token version 机制。
