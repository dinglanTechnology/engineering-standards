---
name: dl-naming-conventions
description: 团队约定的 Node.js（JavaScript / TypeScript）代码命名规范。**任何时候**为本团队/项目编写、审查、重构 JavaScript 或 TypeScript 代码时都必须使用，包括但不限于：声明变量/常量/布尔值、定义函数或方法、命名类与接口、创建源代码文件。即使用户没有明确提到"命名规范"或"代码规范"，只要在写或改 JS/TS 代码就要套用这套规则。
---

# 命名规范（Node.js / JavaScript & TypeScript）

本规范覆盖 Node.js 下的 JavaScript 与 TypeScript 代码。

写代码前先按这个顺序自检：变量 → 函数/方法 → 类/接口 → 文件名。缩写词大小写（见第 5 节）贯穿所有元素。

---

## 1. 变量命名

### 1.1 一般变量：`camelCase`

小写字母开头，多单词驼峰拼接。

```typescript
const userName = "John";
let userAge = 25;
```

### 1.2 常量：`UPPER_SNAKE_CASE`

全大写 + 下划线分隔，仅用于**真正不变**的值。

```typescript
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT_MS = 5000;
```

> 只有"真正不变的字面量"才用全大写；像 `const user = fetchUser()` 这种引用绑定仍然用 camelCase。

### 1.3 布尔变量：以 `is` / `has` / `should` 开头

读起来像一个判断句。

```typescript
const isActive = true;
const hasPermission = false;
const shouldRetry = true;
```

### 1.4 集合 / 数组：用复数名词

存放多个元素的变量用复数，读代码时一眼能看出它是集合。

```typescript
const users = await fetchUsers();
const orderIds = orders.map((o) => o.id);
```

> 需要强调底层数据结构时可加后缀（`userList`、`idSet`），但默认优先用复数名词。

---

## 2. 函数 / 方法命名

### 2.1 动词 + 名词组合

函数名直接说明"它做了什么"。

```typescript
function getUserById(id: number): User { /* ... */ }
function calculateTotalPrice(items: Item[]): number { /* ... */ }
function sendNotification(userId: number, message: string): void { /* ... */ }
```

常用动词参考：`get` / `set` / `fetch` / `create` / `update` / `delete` / `validate` / `parse` / `format` / `handle` / `build`。

### 2.2 私有方法：以 `_` 开头

类的私有方法以 `_` 开头。TS 里同时加 `private` 修饰符。

```typescript
class UserService {
  private _validateInput(input: string): void { /* ... */ }
}
```

---

## 3. 类与接口命名

### 3.1 类：`PascalCase`

每个单词首字母大写。描述具体实体（`User`、`Order`）或行为载体（`UserService`、`OrderValidator`）。

```typescript
class UserService { /* ... */ }
class OrderValidator { /* ... */ }
```

### 3.2 接口：`PascalCase`，无 `I` 前缀

接口名描述行为或结构本身。

```typescript
interface User {
  id: number;
  name: string;
}

interface UserRepository {
  findById(id: number): Promise<User | null>;
}
```

---

## 4. 文件 / 模块命名

文件名用 **`kebab-case` + 功能后缀**，或主导出类用 **`PascalCase`**：

```
user.controller.ts        // 控制器
auth.module.ts            // 模块
order.service.ts          // 服务
user-repository.ts        // 仓储（多单词用 kebab-case）
UserEntity.ts             // 主要导出一个同名类时，文件名与类同名
```

选择原则：
- 文件主要导出**一个同名类**（entity、DTO 等） → `PascalCase` 与类名一致
- 文件按**功能/层次组织**（controller、service、module 等） → `kebab-case` 加后缀

---

## 5. 缩写词 / 首字母缩略词

`ID`、`URL`、`HTTP`、`API`、`DB` 等缩写词一律**当作普通单词**处理：只大写首字母，其余小写，**不要**整体大写。这条规则贯穿变量、函数、类、文件名。

```typescript
const userId = 1;                 // ✅ 不是 userID
const httpClient = createClient(); // ✅ 不是 HTTPClient
function parseUrl(raw: string): URL { /* ... */ }  // ✅ 不是 parseURL
class HttpRequest { /* ... */ }    // ✅ 不是 HTTPRequest
```

> 唯一例外：缩写词出现在常量里时，跟随 `UPPER_SNAKE_CASE`，如 `DEFAULT_API_TIMEOUT_MS`、`MAX_URL_LENGTH`。

---

## 速查表

| 元素 | 风格 | 示例 |
|---|---|---|
| 变量 | `camelCase` | `userName` |
| 常量 | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| 布尔 | `is/has/should` 前缀 | `isActive` |
| 集合/数组 | 复数名词 | `users` |
| 函数/方法 | 动词+名词 `camelCase` | `getUserById` |
| 私有方法 | `_` 前缀 | `_validateInput` |
| 类 | `PascalCase` | `UserService` |
| 接口 | `PascalCase`，无 `I` 前缀 | `UserRepository` |
| 文件名 | `kebab-case + 后缀` 或 `PascalCase` | `user.controller.ts` |
| 缩写词 | 仅首字母大写 | `userId` `httpClient` |

---

## 代码生成/审查时的自检清单

应用本规范后，逐项确认：

1. ☐ 所有变量是 `camelCase`，所有常量是 `UPPER_SNAKE_CASE`
2. ☐ 布尔变量/字段/方法以 `is` / `has` / `should` 开头
3. ☐ 函数/方法是"动词+名词"组合，名字本身能说明做什么
4. ☐ 私有方法以 `_` 前缀开头（TS 同时加 `private`）
5. ☐ 类和接口都是 `PascalCase`，接口没有 `I` 前缀
6. ☐ 文件名符合 `kebab-case + 后缀` 或 `PascalCase` 规则
7. ☐ 集合/数组变量用复数名词（`users` 而非 `userList`，除非要强调结构）
8. ☐ 缩写词只大写首字母（`userId` 而非 `userID`，`HttpRequest` 而非 `HTTPRequest`）
