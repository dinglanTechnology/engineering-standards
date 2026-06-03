# 统一响应格式

## 约定

所有接口返回的 JSON 统一为：

```json
{
  "code": 200,
  "message": "success",
  "data": <业务数据>,
  "timestamp": "2026-04-21T10:00:00.000Z"
}
```

失败的响应由异常过滤器输出，结构完全对齐（多一个 `path` 字段）。前端只需要一套解析逻辑。

## 实现位置

`src/common/interceptors/response.interceptor.ts`，在 `main.ts` 里通过 `app.useGlobalInterceptors()` 全局注册。

## 跳过包装

某些场景返回原始内容，比如文件下载、SSE 流、对外的第三方回调、Prometheus `/metrics`：

```ts
import { SkipResponseTransform } from "@/common/interceptors/response.interceptor"

@Get("export")
@SkipResponseTransform()
async export(@Res() res: Response) {
  // 直接操作 response 对象，拦截器不会包装
  res.download("/tmp/report.xlsx")
}
```

**重要**：只要用了 `@Res() res: Response`，必须加 `@SkipResponseTransform()`，否则拦截器会尝试再 `res.json()` 一次导致报错。

## 分页数据的返回结构

列表接口返回的 `data` 统一用这个结构，Service 层直接返回，不要自己套 code/message：

```ts
// Service 返回
return { items, total, page, pageSize }

// 拦截器包装后前端收到
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  },
  "timestamp": "..."
}
```

## 为什么不用 HTTP 状态码区分业务错

有人会问："既然有 HTTP 状态码，为什么还要 `code` 字段？"

答：HTTP 状态码表示**协议层**结果（请求是否成功送达并处理），业务层的细分错误（如"余额不足"、"优惠券已过期"）混在 4xx 里不合适。保留 `code` 给业务扩展（比如约定 `10001` = 优惠券过期），前端也能根据 `code` 做统一处理。当前模板里成功统一用 `200`，失败和 HTTP 状态对齐，后续业务需要时可扩展。
