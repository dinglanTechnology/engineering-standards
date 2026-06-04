# 异常过滤器

模板里两个过滤器：

- `AllExceptionsFilter`（`@Catch()` 无参）— 兜底处理所有异常
- `PrismaExceptionFilter`（`@Catch(Prisma.PrismaClientKnownRequestError)`）— 把 Prisma 错误码映射成合理的 HTTP 状态

## ⚠️ 注册顺序很重要

在 `main.ts` 里必须这样注册：

```ts
app.useGlobalFilters(
  new PrismaExceptionFilter(winstonLogger),  // 具体的在前
  new AllExceptionsFilter(winstonLogger),    // 通用的在后
)
```

**原因**：NestJS 的 `ExceptionsHandler.invokeCustomFilters` 会按数组顺序遍历过滤器，找到第一个能处理的就停下。`AllExceptionsFilter` 的 `@Catch()` 无参数，意味着它匹配**所有**异常。如果它排在前面，Prisma 异常会被它吞掉，`PrismaExceptionFilter` 永远不会被触发。

反了不会报错，只会"静默失效"——所有 Prisma 错误返回 500 而不是 409/404，特别难排查。加新过滤器时注意这个顺序：**越具体的 `@Catch(SomeError)` 越靠前**。

## 响应格式

两个过滤器统一输出：

```json
{
  "code": 409,
  "message": "唯一约束冲突，数据已存在: phone",
  "data": null,
  "timestamp": "2026-04-21T10:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

和 `ResponseInterceptor` 的成功响应结构保持一致，前端拿到任何响应都能用同一套代码解析。

## 在业务里抛异常的正确姿势

用 NestJS 内置的 HTTP 异常，不要自己 `res.status().json()`：

```ts
import { BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common"

throw new NotFoundException("订单不存在")
throw new BadRequestException(["优惠券已过期", "库存不足"]) // 数组也行
throw new ForbiddenException()
```

自定义 HTTP 状态码：

```ts
import { HttpException, HttpStatus } from "@nestjs/common"
throw new HttpException({ message: "业务错误", bizCode: 10001 }, HttpStatus.PAYMENT_REQUIRED)
```

## Prisma 错误码速查

`PrismaExceptionFilter` 已经映射好的错误码：

| 代码 | HTTP | 场景 |
|---|---|---|
| P2002 | 409 | 唯一键冲突（注册重复手机号） |
| P2003 | 400 | 外键约束失败 |
| P2025 | 404 | 更新/删除的记录不存在 |
| P2024 | 408 | 连接池超时 |
| 其他 | 500 | 兜底 |

完整错误码：https://www.prisma.io/docs/orm/reference/error-reference

需要新增映射时，编辑 `src/common/filters/prisma-exception.filter.ts` 的 `ERROR_CODE_MAP`。

## 加自定义过滤器的模板

比如要针对第三方 SDK 的特定错误：

```ts
@Catch(ThirdPartySdkError)  // 具体类型
export class SdkExceptionFilter implements ExceptionFilter {
  catch(exception: ThirdPartySdkError, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    response.status(502).json({
      code: 502,
      message: `第三方服务异常: ${exception.code}`,
      data: null,
      timestamp: new Date().toISOString(),
    })
  }
}
```

然后在 `main.ts` 的 `useGlobalFilters` 里**放在 `AllExceptionsFilter` 前面**。
