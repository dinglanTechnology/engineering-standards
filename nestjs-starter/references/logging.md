# 日志（Winston）

## 默认行为

模板里的 Winston 会输出到三处：

| 输出 | 级别 | 格式 | 保留策略 |
|---|---|---|---|
| `logs/error-YYYY-MM-DD.log` | error | JSON | 10MB/文件，14 天，自动 gzip |
| `logs/warn-YYYY-MM-DD.log` | warn+ | JSON | 10MB/文件，14 天，自动 gzip |
| 控制台 | LOG_LEVEL | 开发：彩色；生产：JSON | — |

控制台级别由 `LOG_LEVEL` 环境变量控制，默认开发 `debug`、生产 `info`。

## 在业务代码里打日志

推荐注入 `WINSTON_MODULE_PROVIDER`，拿到原生 winston logger：

```ts
import { Inject, Injectable } from "@nestjs/common"
import { WINSTON_MODULE_PROVIDER } from "nest-winston"
import { Logger } from "winston"

@Injectable()
export class OrderService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  createOrder(dto: CreateOrderDto) {
    this.logger.info("Creating order", { context: "OrderService", userId: dto.userId })
    // ...
    this.logger.warn("Low inventory", { context: "OrderService", productId: dto.productId })
  }
}
```

**约定**：每条日志都带 `context` 字段（类名），便于 ELK/Loki 过滤。

## 加新的 transport

例如需要把 error 日志同时推到 Sentry / 阿里云 SLS，在 `src/config/winston.config.ts` 的 `transports` 数组里加一项：

```ts
// 示例：HTTP transport，推到日志聚合服务
new winston.transports.Http({
  level: "error",
  host: "log-api.example.com",
  path: "/v1/logs",
  ssl: true,
})
```

## 脱敏

**日志里绝对禁止出现**：密码明文、token、身份证号、完整手机号、银行卡号。

手机号至少脱敏中间 4 位：

```ts
function maskPhone(phone: string) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
}
this.logger.info(`User logged in: ${maskPhone(phone)}`)
```

## 常见坑

- **`logger.error(err)` 不会自动打印堆栈**。要么 `logger.error(err.message, { stack: err.stack })`，要么用 winston 的 `format.errors({ stack: true })`。
- **`logs/` 目录不能打进 Docker 镜像**。`.dockerignore` 已经处理，不要改。
- **生产环境不要把 `debug` 日志写到文件**，否则磁盘会爆。默认配置里文件 transport 的最低级别是 `warn`，别动。
