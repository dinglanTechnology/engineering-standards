# Prisma 使用规范

## 基本规则

- **所有业务代码通过注入 `PrismaService` 访问数据库**，不要自己 `new PrismaClient()`
- **不在 Controller 里写 Prisma 调用**，Controller 只负责参数 / 调 Service / 返回
- **不手动改数据库表结构**，一切通过 `prisma migrate dev` 生成迁移
- **敏感字段（password 等）永远用 `select` 白名单过滤后再返回给前端**，不要裸 `return user`

## 迁移流程

```bash
# 1. 改 prisma/schema.prisma
# 2. 生成迁移 + 更新 Client
pnpm prisma migrate dev --name add_xxx_field

# 3. 仅重新生成 Client（不改表）
pnpm prisma generate
```

生产部署时（Dockerfile 里已经有）：

```bash
pnpm prisma migrate deploy  # 只 apply 已有迁移，不生成新的
```

**永远不要在生产用 `migrate dev`**，它会 drop 然后重建。

## Schema 约定

- 表名：Prisma model 用 PascalCase（`User`），用 `@@map("users")` 映射到数据库 snake_case 复数
- 字段类型要明确：`String` 必须配 `@db.VarChar(N)`，不要让 Prisma 默认成 `VARCHAR(191)` 之类猜测值
- 时间字段统一 `createdAt` / `updatedAt`，配 `@default(now())` / `@updatedAt`
- 需要检索的字段加索引：`@@index([fieldName])`
- 唯一约束：单字段 `@unique`，复合 `@@unique([a, b])`
- 外键关系明确 `onDelete` 行为，默认是 `Restrict`：

```prisma
model Order {
  id      Int  @id @default(autoincrement())
  userId  Int
  user    User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## 分页

**小数据集（< 10 万）**：偏移分页（skip/take）即可，模板里 `UserService.findMany` 就是这种。

**大数据集**：改用游标分页，性能不随偏移量退化：

```ts
async findMany({ cursor, take = 20 }: { cursor?: number; take?: number }) {
  return this.prisma.order.findMany({
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { id: "desc" },
  })
}
```

## 事务

两种用法：

```ts
// 1. 简单批量操作，顺序执行，全部成功才提交
await this.prisma.$transaction([
  this.prisma.user.update({ where: { id }, data: { balance: { decrement: 100 } } }),
  this.prisma.order.create({ data: { userId: id, amount: 100 } }),
])

// 2. 交互式事务，支持中间逻辑
await this.prisma.$transaction(async tx => {
  const user = await tx.user.findUnique({ where: { id } })
  if (!user || user.balance < 100) throw new BadRequestException("余额不足")
  await tx.user.update({ where: { id }, data: { balance: { decrement: 100 } } })
  await tx.order.create({ data: { userId: id, amount: 100 } })
})
```

**坑**：交互式事务内一定要用 `tx.xxx`，不是 `this.prisma.xxx`，否则不在同一个事务里。

## 返回值剔除敏感字段

Prisma 没有"默认 exclude 字段"的原生支持，有两种常见做法：

**方法 A（推荐）**：每次 query 用 `select` 白名单

```ts
this.prisma.user.findUnique({
  where: { id },
  select: { id: true, username: true, phone: true, createdAt: true },
})
```

清晰、类型安全，就是每处都要写。

**方法 B**：Prisma 5.9+ 的 `omit`

```ts
this.prisma.user.findUnique({
  where: { id },
  omit: { password: true },
})
```

更简洁，但容易漏加新的敏感字段（比如后续加了 `secretKey` 忘了 omit）。模板默认用 A，团队统一。

## 软删除

Prisma 没内置软删除。需要时：

1. schema 加 `deletedAt DateTime?`
2. 用 Prisma middleware 自动过滤：

```ts
// src/prisma/prisma.service.ts 的 onModuleInit 里
this.$use(async (params, next) => {
  if (["findUnique", "findFirst", "findMany"].includes(params.action)) {
    params.args.where = { ...params.args.where, deletedAt: null }
  }
  return next(params)
})
```

注意 middleware 在 Prisma 6 仍可用但被标记为废弃，未来可能改成 `$extends`。新项目不建议重度依赖。

## 查询性能

- 多条关联数据用 `include` 或 `select`，**不要循环里 `await findUnique`**（N+1 问题）
- 只需要几个字段时永远用 `select`，别 `include` 整个关联对象
- `count` 和 `findMany` 可以并行：`Promise.all([findMany, count])`
- 不要对大表做 `findMany()` 无 where 无 take 的查询

## 开发时看 SQL

`PrismaService` 在非生产环境开启 `query` 级别日志，直接输出 SQL 到控制台。排查慢查询很方便。不想看到时把 `LOG_LEVEL` 改成 `info`。
