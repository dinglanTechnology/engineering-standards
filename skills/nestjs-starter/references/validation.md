# DTO 与参数校验

## 全局 ValidationPipe

已在 `main.ts` 注册，配置如下：

```ts
new ValidationPipe({
  whitelist: true,              // 剔除 DTO 未声明字段
  forbidNonWhitelisted: true,   // 多余字段直接 400
  transform: true,              // 自动类型转换
  transformOptions: { enableImplicitConversion: true },
})
```

含义：前端多传的字段会被 400 拒绝，Query 里的 `?page=1` 会自动转成 `number`。

## DTO 基本写法

```ts
import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator"

export class CreateOrderDto {
  @ApiProperty({ example: 1001 })
  @IsInt()
  @Min(1)
  userId!: number

  @ApiProperty({ example: "pending", enum: ["pending", "paid", "cancelled"] })
  @IsEnum(["pending", "paid", "cancelled"])
  status!: string

  @ApiProperty({ required: false, example: "备注" })
  @IsOptional()
  @IsString()
  remark?: string
}
```

**规矩**：
- 每个字段必须有 `@ApiProperty()`，否则 Swagger 不显示
- 非必填用 `@IsOptional()`，TS 类型也要加 `?`
- 类型声明用 `!:` 断言（`strict: true` 需要）

## 常用装饰器

| 装饰器 | 用途 |
|---|---|
| `@IsString()` / `@IsInt()` / `@IsBoolean()` / `@IsNumber()` | 类型 |
| `@IsEmail()` / `@IsUrl()` / `@IsUUID()` | 格式 |
| `@IsEnum(MyEnum)` | 枚举 |
| `@Length(min, max)` / `@MinLength` / `@MaxLength` | 字符串长度 |
| `@Min(n)` / `@Max(n)` | 数字范围 |
| `@Matches(regex, { message })` | 正则 |
| `@IsOptional()` | 可选 |
| `@ArrayMinSize` / `@ArrayMaxSize` / `@IsArray()` | 数组 |
| `@ValidateNested({ each: true })` + `@Type(() => SubDto)` | 嵌套 DTO |

## 嵌套对象和数组

```ts
import { Type } from "class-transformer"
import { IsArray, ValidateNested } from "class-validator"

export class OrderItemDto {
  @IsInt() productId!: number
  @IsInt() @Min(1) quantity!: number
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)   // 必须加，否则 items 只是普通对象不会被校验
  items!: OrderItemDto[]
}
```

**坑**：忘加 `@Type(() => OrderItemDto)` 是最常见的错误。没有它，嵌套 DTO 的装饰器完全不生效，却不会报错。

## 自定义校验器

例子：检查手机号是否在数据库中存在。

```ts
import { Injectable } from "@nestjs/common"
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator"
import { PrismaService } from "@/prisma/prisma.service"

@ValidatorConstraint({ name: "isPhoneUnique", async: true })
@Injectable()
export class IsPhoneUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(phone: string) {
    const exists = await this.prisma.user.findUnique({ where: { phone } })
    return !exists
  }

  defaultMessage() {
    return "该手机号已被注册"
  }
}

export function IsPhoneUnique(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsPhoneUniqueConstraint,
    })
  }
}
```

使用：在 `main.ts` 加 `useContainer(app.select(AppModule), { fallbackOnErrors: true })`（class-validator 才能拿到 DI 容器），然后 DTO 里 `@IsPhoneUnique()`。

## Query / Param 也要校验

```ts
// Param
@Get(":id")
findOne(@Param("id", ParseIntPipe) id: number) {}

// Query 用 DTO
export class ListQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) pageSize?: number
}

@Get()
list(@Query() query: ListQueryDto) {}
```

Query 的字段是字符串，必须配 `@Type(() => Number)` 才能转成数字（`enableImplicitConversion: true` 也能兜底，但显式更可靠）。
