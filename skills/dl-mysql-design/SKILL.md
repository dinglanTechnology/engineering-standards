---
name: dl-mysql-design
description: 团队约定的 MySQL 数据库设计规范（Prisma-first），覆盖库/表/字段/索引命名、主键策略、字段类型选型、字符集、索引设计、外键、软删除、审计字段与建表模板。**任何时候**设计 MySQL 表结构、写或改 Prisma schema、新建库表、加字段、加索引、做 DDL/schema Code Review 时都必须使用。团队统一用 Prisma 管理 schema，物理命名一律驼峰、禁 snake_case：表名 PascalCase、列名 camelCase（小驼峰），默认沿用 model/field 名，也可用 @@map/@map 改名但须保持驼峰。即使用户没有明确提到"数据库规范"或"建表规范"，只要在设计或修改 MySQL 表结构 / Prisma model 就要套用这套规则。具体的 Prisma 用法（事务、分页、N+1）见 dl-nestjs-starter 的 prisma-guide。
---

# MySQL 数据库设计规范（Prisma-first）

本规范约束 **MySQL 8.0+** 的库表设计。团队统一用 **Prisma** 管理 schema，**物理表名 / 列名一律驼峰**（表 PascalCase、列 camelCase）：默认直接采用 model / field 名，也可以用 `@@map` / `@map` 改名，但**改后仍须保持驼峰，禁止 snake_case 映射**。本规范管「表在数据库里长什么样」，ORM 操作细节（事务、分页、N+1）见 `dl-nestjs-starter` 的 `references/prisma-guide.md`。

设计一张表前按这个顺序过一遍：主键 → 业务字段（类型 + 是否可空 + 注释）→ 审计字段 → 软删除（按需）→ 索引 → 外键（按需）。

> **团队已拍板的硬约定**（本规范的基调）：
> 1. **命名（一律驼峰，禁 snake_case）**：表名 **PascalCase**（`User`、`ProductReport`）；列名 **camelCase 小驼峰**（`userId`、`createdAt`、`firstFrameUrl`）；枚举值 **UPPER_SNAKE_CASE**（`GENERATING`、`SUCCESS`）。默认沿用 model/field 名，也可用 `@@map`/`@map` 改名，但改后仍是驼峰。
> 2. **主键**统一 `id`，类型 **`Int @db.UnsignedInt` 自增**（对应 `INT UNSIGNED`，上限约 42 亿，TS 仍是 `number`）。
> 3. **允许物理外键**（保留数据库级一致性），但热点写入路径慎用。
> 4. **软删除按需**：业务表才加 `deletedAt`，日志/流水/中间表直接物理删除。

---

## 1. 通用原则

- **存储引擎统一 `InnoDB`**（Prisma 默认），禁止 MyISAM。
- **字符集统一 `utf8mb4`**，排序规则 `utf8mb4_0900_ai_ci`（MySQL 8 默认，支持 emoji 与完整 Unicode）。禁止 `utf8`（MySQL 的 `utf8` 是阉割版 `utf8mb3`，存不了 4 字节字符）。
- **每个字段都要有注释**：Prisma 里用行内 `//` 注释说明含义；状态/类型字段要列出每个枚举值的含义（如 `status String // GENERATING / SUCCESS / FAILED`）。
- **优先非空 + 合理默认值**，能不可空就不可空（见 3.3）。
- **一张表只做一件事**：字段过多或含超大文本（`@db.Text`/`@db.LongText`）时，把大字段或低频字段拆到关联表，不与高频访问的热字段混在一张表。
- **所有结构变更走 Prisma 迁移**（`prisma migrate dev` / `deploy`），不在生产库手动 `ALTER`。

---

## 2. 命名规范

团队用 Prisma 管理 schema。**物理命名的硬约束是「一律驼峰、禁 snake_case」**：表名 PascalCase、列名 camelCase。默认直接沿用 model / field 名（最省事）；也可以用 `@@map`（表）/ `@map`（列）改名，但**改后的名字仍必须是驼峰**。

| 对象 | 规则 | 示例 |
|---|---|---|
| 库名 | `snake_case`，可加业务前缀 | `order_center`、`image_studio` |
| 表名（model） | **PascalCase**（默认 = model 名） | `User`、`ProductReport`、`PublicAvatar`、`RolePermission` |
| 列名（field） | **camelCase 小驼峰** | `userId`、`totalSpent`、`firstFrameUrl`、`createdAt` |
| 主键 | 统一 `id` | `id` |
| 外键列 | `<关联模型小驼峰>Id` | `userId`、`customerId`、`productionId` |
| 布尔列 | camelCase，**推荐** `is`/`has` 前缀 | `isActive`、`isSystem`、`hasPaid` |
| 枚举 / 状态值 | **UPPER_SNAKE_CASE** | `PRODUCT_SCORING`、`GENERATING`、`DRAFT` |

**约定**：
- **表名 PascalCase**：默认与 model 名一致（`User`、`ProductReport`），团队实践多用单数。需要改名（复数、加业务前缀等）时用 `@@map`，但**改后必须仍是 PascalCase 驼峰**——`@@map("Users")` ✅、`@@map("users")` ❌、`@@map("user_report")` ❌。
- **列名 camelCase**（`createdAt`、`firstFrameUrl`），不带表名前缀（`User` 表里用 `name` 而非 `userName`），外键例外（`userId`）。需要改名时用 `@map`，同样**保持 camelCase、禁 snake_case**。
- **同一含义的字段全库同名同类型**：用户 ID 处处是 `userId BigInt`，不要这张表 `uid`、那张表 `userId`。
- **布尔**推荐 `is`/`has` 前缀（`isActive`），语义已经很清楚的形容词/过去分词（`enabled`、`active`、`approved`、`adopted`）也可接受。
- **枚举值统一大写蛇形**（`HistoryType.PRODUCT_SCORING`、`status = "GENERATING"`），无论用 Prisma `enum` 还是 `String` 承载。
- **索引名不用手写**：Prisma 的 `@@index` / `@@unique` 会自动生成（如 `User_phone_key`、`Order_userId_deletedAt_idx`）。只有写原生 SQL 时才用 `idx_<表>_<列>` / `uk_<表>_<列>` 手工命名。
- **保留字**：Prisma 会自动反引号转义标识符，所以 `order` 这类保留字列名能用（现有 schema 就有 `order Int`）；但如果该表可能被原生 SQL 直接访问，仍建议避开。

---

## 3. 主键与必备字段

### 3.1 主键：`Int @db.UnsignedInt` 自增

每张表必须有主键，统一：

```prisma
id Int @id @default(autoincrement()) @db.UnsignedInt   // 主键，映射 INT UNSIGNED
```

- 用 `Int @db.UnsignedInt`（→ `INT UNSIGNED`）：上限约 **42 亿**（无符号比有符号 `INT` 的 21 亿翻倍），绝大多数表一辈子够用；关键是 **Prisma 里类型仍是 `number`**——不像 `BigInt`（→ TS `bigint`）会污染 JWT / JSON 序列化 / 各处类型。
- **外键列要和主键同类型**：引用主键的列也写 `@db.UnsignedInt`，否则 MySQL 因符号不一致建不了外键。
- **不要用业务字段做主键**（手机号、`urlHash` 等）：业务字段会变、会重、会长，作为聚簇索引会让二级索引膨胀。业务唯一性用 `@unique` / `@@unique` 保证（见第 5 节）。
- **确实会超 42 亿的表**（海量日志、事件流水）才上 `BigInt`，且从建表起就用——别等溢出再迁：`INT → BIGINT` 是整表重建 + 外键联动 + 代码 `bigint` 类型扩散，在大表上是个大工程。需要分布式生成 ID 时用有序雪花 ID（存 `BigInt`），但全团队统一一种方案，不混用。

### 3.2 审计字段（每张表必备）

```prisma
createdAt DateTime @default(now())   // 创建时间
updatedAt DateTime @updatedAt        // 更新时间
```

- Prisma 的 `DateTime` 默认映射成 **`DATETIME(3)`**（带毫秒），团队统一接受这个默认，不用纠结 `DATETIME` vs `TIMESTAMP`。
- 时间统一按 UTC 在应用层处理，库里存字面时间。
- 需要追溯操作人时再加 `createdById BigInt` / `updatedById BigInt`（存 userId），**按需，不强制全表**。

### 3.3 可空（nullable）的使用

- 默认**非空 + 合理默认值**。Prisma 里不加 `?` 即非空；字符串默认 `@default("")`、数值 `@default(0)`、布尔 `@default(false)`、状态 `@default(GENERATING)`。
- 加 `?`（可空）只在「确实要区分『未填写』和『空值』」时使用（如 `deletedAt`、可选的 `remark`、provider 回填前的 `resultUrl`）。
- 原因：`NULL` 参与比较/聚合行为反直觉（`NULL = NULL` 为 false、`COUNT(col)` 跳过 NULL），且会影响索引统计。

### 3.4 软删除（按需）

**只有需要保留历史 / 可恢复的业务表**才加：

```prisma
deletedAt DateTime?   // 软删除时间，NULL = 未删除
```

- 用 `deletedAt`（可空时间戳）而非 `isDeleted`：既是删除标记，又记了删除时间。
- 加了软删除的表，**所有查询默认带 `deletedAt = null`**，并把它纳入相关索引——现有 schema 的标准做法就是 `@@index([userId, deletedAt])`。涉及唯一约束时要把 `deletedAt` 考虑进去，否则删除后无法重新插入同值。
- **日志、流水、镜像同步表、关联中间表、不可逆操作记录不软删**，直接物理删除——参照现有 schema：`SmsCode` / `UsageLog` / `CrawlLog` / `Tag` / `RolePermission` / `PricingConfig` / `PublicAvatar` 都没有 `deletedAt`。

---

## 4. 字段类型选型

| 业务场景 | Prisma 写法 | MySQL 类型 / 禁忌 |
|---|---|---|
| 主键 / 外键 | `Int @db.UnsignedInt` | `INT UNSIGNED`（约 42 亿），TS 仍是 `number`，见第 3 节 |
| 超 42 亿的海量 ID | `BigInt` | `BIGINT`，仅海量表用（注意 TS 变 `bigint`） |
| 一般整数（数量、排序、时长） | `Int` | `INT`，如 `order Int @default(0)` |
| 稳定的领域枚举状态 | `enum` + `EnumType` | MySQL `ENUM`。适合取值稳定、跨流程复用的，如 `ProjectStatus`、`HistoryType`、`PricingCategory` |
| 流程性 / provider 驱动的状态 | `String` + 注释 | `VARCHAR`。适合频繁变动、由第三方决定的，如 `status String // GENERATING / SUCCESS / FAILED`、`kind` |
| 布尔 | `Boolean` | `TINYINT(1)`，列名 `is`/`has` 前缀优先 |
| 金额 / 精确小数 | `Decimal @db.Decimal(M,D)` | 余额 `(12,4)`、计费单价 `(12,6)`、展示金额 `(12,2)`。**严禁 `Float`/`Double` 存金额** |
| 评分 / 非金额浮点 | `Float?` | `DOUBLE`，仅用于不要求精确的分值（如 `score Float?`） |
| 短字符串 | `String @db.VarChar(N)` | N 按业务实际取，见下表 |
| 长文本 | `String @db.Text` | 拆到扩展表或低频列，不与热字段同表 |
| 弹性结构 / 多选 | `Json` | 仅存「不需要按内部字段检索」的数据；高频检索字段要拍平成列 |
| 时间 | `DateTime` | `DATETIME(3)`，见 3.2 |

> **枚举二选一的判断**：取值稳定、是核心领域概念、要跨多处复用 → 用 Prisma `enum`；取值会随业务/第三方频繁增删、只在局部用 → 用 `String` + 注释列出当前取值。两者枚举值都用 `UPPER_SNAKE_CASE`。

**常见字段的标准定义**（保持全库一致）：

| 字段 | Prisma 写法 |
|---|---|
| URL / 链接 | `String @db.VarChar(1000)` |
| 标题 | `String @db.VarChar(500)` |
| 名称 / 品牌名 | `String @db.VarChar(200)` |
| 用户名 / 昵称 / code | `String @db.VarChar(50)` |
| key / 业务编码 | `String @db.VarChar(100)` |
| 密码哈希（argon2） | `String @db.VarChar(255)` |
| 手机号 | `String @db.VarChar(20)` |
| 哈希值（如 urlHash） | `String @db.VarChar(64)` |
| 金额 / 余额 | `Decimal @db.Decimal(12, 4)` |
| 计费单价 | `Decimal @db.Decimal(12, 6)` |
| 长正文 / prompt / Markdown | `String @db.Text` |
| 备注 | `String? @db.VarChar(500)` |

---

## 5. 索引设计

### 5.1 基本规则

- Prisma 里用 `@@index([...])` 建普通索引、`@unique` / `@@unique([...])` 建唯一约束，**索引名自动生成，不手写**。
- **唯一性优先用唯一约束保证**，不要只靠应用层判重（并发下会漏）。现有 schema 范例：`@@unique([customerId, figureId])`、`@@unique([platform, word])`、`@@unique([dimension, name])`。
- 区分度低的列（性别、`isActive` 这种只有几个值）单独建索引几乎没用，别建——但它们可作为**联合索引的非首列**做过滤（如 `@@index([isActive, gender, age])`）。
- 外键列、高频 `WHERE` / `JOIN` / `ORDER BY` 的列才建索引。

### 5.2 联合索引与最左前缀

- 遵循**最左前缀**：`@@index([a, b, c])` 能命中 `a` / `a,b` / `a,b,c`，命不中只查 `b` 或 `c`。
- 字段顺序：**等值查询列在前，范围查询列在后**；区分度高的列尽量靠前。现有范例 `@@index([userId, status, createdAt])`、`@@index([userId, createdAt])`。
- 软删表把 `deletedAt` 放进索引：`@@index([userId, deletedAt])`、`@@index([projectId, deletedAt])`。
- 联合索引字段数 ≤ 5。

### 5.3 禁忌

- ❌ 单表索引别失控（建议 ≤ 5），索引越多写入越慢、占空间越大。
- ❌ 不在低区分度、频繁更新的列上单独建索引。
- ❌ 对 `@db.Text` 建完整索引（只能前缀索引）。
- ❌ 索引列上做函数/运算、隐式类型转换 → 索引失效。字段类型全库统一就是为了避免后者。

---

## 6. 外键（允许使用，但有边界）

团队**允许物理外键**，保留数据库级引用完整性。Prisma 里在 `@relation` 上声明：

```prisma
// 父删则子删
permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
// 父删则置空（外键列要可空）
product    Product?   @relation(fields: [productId], references: [id], onDelete: SetNull)
```

- **必须显式声明 `onDelete` 行为**，不要靠默认蒙。常用：`Cascade`（父删子跟删）/ `Restrict`（保护子记录，Prisma 默认）/ `SetNull`（置空，外键列须可空）。
- 外键列要有索引（高频 JOIN 时手动加 `@@index`，Prisma 不一定自动建）。
- **外键列类型必须和被引用主键完全一致**：主键是 `Int @db.UnsignedInt` 时，外键列也要 `@db.UnsignedInt`（含符号），否则 MySQL 建不了约束。
- ⚠️ **高并发写入的热点表慎用物理外键**：外键检查会加额外的锁，放大锁竞争。这类表改为「逻辑外键」——只存 `xxxId`、不建 `@relation` 约束，由应用层 + 事务保证一致性。
- ⚠️ **分库分表后物理外键失效**：预期未来要拆分的表，从一开始就用逻辑外键。
- 跨库的表之间不要建物理外键。

> 取舍小结：**单库、强一致优先、写入不极端 → 物理外键**；**热点写 / 预期分片 / 跨库 → 逻辑外键**。同一项目内保持风格一致，并在注释里说明选择。

---

## 7. 范式与反范式

- 默认遵循**第三范式（3NF）**：消除冗余、一处事实一处存。
- **可控反范式**：为避免高频 `JOIN`，允许冗余少量稳定字段或存「快照」。现有 schema 的范例——`GenerationTask.refImageUrls` 存 URL 快照，解耦 `ProductImage` 软删后任务历史断链。冗余字段要满足：① 来源基本不变或允许快照语义；② 注释标注是冗余/快照；③ 想清楚要不要随源同步。
- 统计类数据（计数、汇总）高频读时可落冗余字段，但要有兜底的重算手段。

---

## 8. 建表模板

**Prisma model（主，团队日常用这个）**：

```prisma
model Order {
  id        Int         @id @default(autoincrement()) @db.UnsignedInt   // 主键
  userId    Int         @db.UnsignedInt                                 // 外键列（与主键同为无符号）
  orderNo   String      @unique @db.VarChar(32)          // 业务唯一键
  amount    Decimal     @default(0) @db.Decimal(12, 2)   // 金额用 Decimal
  status    OrderStatus @default(PENDING)                // 稳定领域枚举 → enum
  remark    String      @default("") @db.VarChar(500)    // 非空 + 默认
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  deletedAt DateTime?                                    // 业务表才加（软删）

  @@index([userId, deletedAt])
  @@index([status])
}

enum OrderStatus {
  PENDING
  PAID
  CANCELLED
  COMPLETED
}
```

**对应生成的 MySQL（非 Prisma 团队参考，注意 PascalCase 表名 + camelCase 列名）**：

```sql
CREATE TABLE `Order` (
  `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `userId`    INT UNSIGNED NOT NULL,
  `orderNo`   VARCHAR(32)  NOT NULL,
  `amount`    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status`    ENUM('PENDING','PAID','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PENDING',
  `remark`    VARCHAR(500) NOT NULL DEFAULT '',
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt` DATETIME(3)  NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Order_orderNo_key` (`orderNo`),
  KEY `Order_userId_deletedAt_idx` (`userId`, `deletedAt`),
  KEY `Order_status_idx` (`status`),
  CONSTRAINT `Order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

不需要软删除的日志/流水表，去掉 `deletedAt` 即可。

---

## 9. 速查表

| 维度 | 团队约定 |
|---|---|
| 引擎 | `InnoDB` |
| 字符集 / 排序 | `utf8mb4` / `utf8mb4_0900_ai_ci` |
| 表名 | **PascalCase**（默认 = model 名；可 `@@map` 改名，须保持 PascalCase） |
| 列名 | **camelCase 小驼峰**（可 `@map` 改名，须保持 camelCase） |
| 枚举值 | **UPPER_SNAKE_CASE** |
| 主键 | `id Int @default(autoincrement()) @db.UnsignedInt`（`INT UNSIGNED`，约 42 亿；超量级才上 `BigInt`） |
| 审计字段 | `createdAt` / `updatedAt`（`DateTime`，必备） |
| 软删除 | `deletedAt DateTime?`（**按需**，业务表才加） |
| 金额 | `Decimal @db.Decimal(M,D)`，禁浮点 |
| 状态枚举 | 稳定领域 → Prisma `enum`；流程/provider 驱动 → `String` + 注释 |
| 布尔 | `Boolean`，列名 `is`/`has` 优先 |
| 时间 | `DateTime`（`DATETIME(3)`） |
| 索引 | `@@index` / `@@unique`，名字自动生成；最左前缀 |
| 外键 | 允许物理外键（热点/分片用逻辑外键），显式 `onDelete` |
| 可空 | 默认非空 + 默认值，`?` 只用在真正需要处 |
| 注释 | 字段含义、状态枚举取值用 `//` 注释 |

---

## 10. 设计 / 评审 schema 时的自检清单

1. ☐ 表名 PascalCase、列名 camelCase（一律驼峰，禁 snake_case）；用 `@@map`/`@map` 改名时改后仍是驼峰
2. ☐ 主键是 `id Int @default(autoincrement()) @db.UnsignedInt`，外键列同为 `@db.UnsignedInt`，没拿业务字段当主键
3. ☐ 有 `createdAt` / `updatedAt`（`DateTime`）
4. ☐ 需要软删的业务表才加 `deletedAt DateTime?`；日志/流水/中间表没乱加
5. ☐ 每个字段有注释；状态字段用 `//` 列出了枚举取值，枚举值是 `UPPER_SNAKE_CASE`
6. ☐ 字段默认非空 + 合理默认值，`?` 只用在真正需要的地方
7. ☐ 金额用 `Decimal`，时间用 `DateTime`；稳定枚举用 `enum`、流程状态用 `String`
8. ☐ 同名业务字段全库类型一致（`userId` 处处 `Int @db.UnsignedInt`），外键列和被引用主键同类型（含符号）
9. ☐ 唯一性用 `@unique`/`@@unique`；联合索引顺序符合最左前缀，软删表索引含 `deletedAt`
10. ☐ 单表索引不超约 5 个，没在低区分度列上单独建索引
11. ☐ 物理外键显式声明了 `onDelete`；热点写/预期分片的表改用逻辑外键
12. ☐ 字符串给了合理 `@db.VarChar(N)` 或 `@db.Text`，长文本没和热字段同表

---

## 禁止事项（Don't）

- ❌ 不要用 `utf8`（用 `utf8mb4`）、不要用 MyISAM（用 InnoDB）。
- ❌ 不要用 `Float`/`Double` 存金额（用 `Decimal`）。
- ❌ 不要用业务字段（手机号/邮箱/哈希）做主键。
- ❌ 不要在生产库手动 `ALTER`，一切走 `prisma migrate`。
- ❌ 不要 `SELECT *` / 裸 `return user`；敏感字段（密码哈希）永不返回前端，用 `select` 白名单。
- ❌ 不要给一张表堆几十个字段 + 大 `@db.Text`，该拆表就拆。
- ❌ 不要让同一含义的字段在不同表里类型/命名不一致。
- ❌ 不要用 `@@map` / `@map` 把表名/列名映射成 **snake_case**（`@@map("users")`、`@map("user_name")`）——改名可以，但必须保持驼峰。
```
