# Swagger API 文档

## 访问

启动后 `http://localhost:8000/docs` 打开。生产环境默认关闭（`main.ts` 里 `if (NODE_ENV !== 'production')`）。

需要在生产也启用时，改成按环境变量控制：

```ts
if (configService.get("ENABLE_SWAGGER") === "true") {
  // 挂载 Swagger
}
```

不要无条件开启——生产暴露 API 文档对安全不利。

## DTO 必须加 @ApiProperty

没有 `@ApiProperty()` 的字段 Swagger 不会显示。`class-validator` 和 `@ApiProperty` 要同时加：

```ts
import { ApiProperty } from "@nestjs/swagger"

export class CreateOrderDto {
  @ApiProperty({ example: 1001, description: "用户 ID" })
  @IsInt()
  userId!: number

  @ApiProperty({ required: false, example: "备注" })
  @IsOptional()
  @IsString()
  remark?: string
}
```

## Controller 分组与鉴权

```ts
@ApiTags("order")                 // 分组，Swagger 左侧导航按 tag 归类
@ApiBearerAuth("bearer")          // 此分组下所有接口需要 Bearer token（和 main.ts 里的名字对齐）
@Controller({ path: "order", version: "1" })
export class OrderController {
  @Get()
  @ApiOperation({ summary: "订单列表", description: "支持按状态筛选和分页" })
  @ApiResponse({ status: 200, description: "成功" })
  list() {}
}
```

## 响应模型

当返回的结构复杂，用一个 DTO 声明并 `@ApiResponse({ type })`：

```ts
export class OrderVo {
  @ApiProperty() id!: number
  @ApiProperty() amount!: number
  @ApiProperty() status!: string
}

@Get()
@ApiResponse({ status: 200, type: [OrderVo] })
list(): Promise<OrderVo[]> {}
```

分页响应的泛型写法：

```ts
export class PageVo<T> {
  @ApiProperty() total!: number
  @ApiProperty() page!: number
  @ApiProperty() pageSize!: number
  items!: T[]
}

// 使用时用 @ApiExtraModels + getSchemaPath 组装泛型，比较啰嗦
// 简单起见，每个分页接口单独定义一个 XxxPageVo（继承 PageVo 并声明 items 类型）
```

## 导出 OpenAPI JSON

给前端生成 TS client 时常用：

```ts
// 在 SwaggerModule.setup 附近
import * as fs from "node:fs"
fs.writeFileSync("./openapi.json", JSON.stringify(document, null, 2))
```

或用脚本：

```bash
# 启动后
curl http://localhost:8000/docs-json > openapi.json
```

## 持久化登录态

模板里已配了 `persistAuthorization: true`，刷新页面后 Swagger 认证不丢失。开发时特别方便。

## 分模块文档（大项目）

单一文档在接口多了之后会变得很长。可以拆：

```ts
// main.ts
const configAdmin = new DocumentBuilder().setTitle("Admin API").build()
const configOpen = new DocumentBuilder().setTitle("Open API").build()

SwaggerModule.setup("docs/admin", app,
  SwaggerModule.createDocument(app, configAdmin, { include: [AdminModule, UserModule] })
)
SwaggerModule.setup("docs/open", app,
  SwaggerModule.createDocument(app, configOpen, { include: [PublicModule] })
)
```

## 常见坑

- **DTO 字段不显示**：忘加 `@ApiProperty()`
- **嵌套对象类型变成 `{}`**：对嵌套 DTO 加 `@ApiProperty({ type: SubDto })`
- **Bearer 认证按钮不生效**：`main.ts` 里 `addBearerAuth` 的第二个参数和 Controller 的 `@ApiBearerAuth()` 参数必须一致（模板里统一用 `"bearer"`）
- **枚举显示不对**：用 `@ApiProperty({ enum: MyEnum })`，不要只写 `@IsEnum`
