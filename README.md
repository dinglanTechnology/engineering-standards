# 团队研发标准

供团队成员和 AI 助手（Claude）共同遵循的研发标准集合，包含两类资产：

- **规范** —— 约束「代码该怎么写」的横切约定（命名、SQL、API 设计……）
- **脚手架** —— 直接生成符合团队风格的项目骨架与生产级基础设施

整个仓库打包成**一个 plugin**（`engineering-standards`），内含多个 [skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)。一条命令装齐，安装后 AI 写代码或搭项目时会自动遵循 / 套用。**同时兼容 Claude Code 和 Cursor**（两边共用同一份 `skills/`，各自一份清单）。

## 包含的 skill

| 名称 | 类型 | 适用范围 | 状态 |
|---|---|---|---|
| `naming-conventions` | 规范 | Node.js (JS/TS) 命名规范 | ✅ |
| `mysql-design` | 规范 | MySQL 数据库设计规范（Prisma-first） | ✅ |
| `nestjs-starter` | 脚手架 | NestJS 11 后端项目（TS + Prisma + MySQL，生产级基础设施） | ✅ |

> 规划中：API 设计规范、Git commit 格式、错误处理 / 日志规范……欢迎补充。这些都会作为新 skill 加进**同一个 plugin**，用户一次安装、自动拿到后续新增。

---

## 安装（Claude Code）

```bash
# 1. 添加 marketplace（只需一次；走 git，relative source 才能解析）
/plugin marketplace add dinglanTechnology/engineering-standards

# 2. 安装（一条命令拿全部 skill）
/plugin install engineering-standards@dinglan
```

- `@dinglan` 是 marketplace 名（见 [`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json) 的 `name`）。
- 安装后所有 skill 会**自动按需触发**，正常写代码即可，不用手动调。
- 需要手动调用时，用完整命令（带命名空间 `engineering-standards:`）：
  - `/engineering-standards:naming-conventions`
  - `/engineering-standards:mysql-design`
  - `/engineering-standards:nestjs-starter`
- 如果是**安装前就开着的会话**，`/` 菜单不会自动刷新——先 `/reload-plugins` 或重启 Claude Code，新装的 skill 才会进补全列表。

> ⚠️ `add` 必须用 `owner/repo`（git）写法，**不能**直接喂 `marketplace.json` 的 URL——相对路径 source 在 URL 方式下无法解析。

## 安装（Cursor）

Cursor 用同一套 plugin / skill 规范，清单放在 [`​.cursor-plugin/`](./.cursor-plugin)，`skills/` 与 Claude 共用同一份。Cursor 走图形界面安装，没有命令行：

1. Cursor → **Settings → Plugins**（或 Marketplace 面板）→ **Import from Git**。
2. 填仓库地址 `https://github.com/dinglanTechnology/engineering-standards`。
3. 在列表里点 **Install** 安装 `engineering-standards`。

安装后 skill 同样按需自动触发。团队可由管理员在 dashboard 里把它设为「必装」推给所有人。

---

### 为什么是「一个 plugin 装全部」而不是「按需单装」

这是刻意的设计，和 [superpowers](https://github.com/obra/superpowers) 同一种模型：一个 plugin（`engineering-standards`）内部放多个 skill，靠 `plugin.json` 里的 `"skills": "./skills/"` 一并带出。

- **优点**：安装永远一条命令；团队全员标准一致；以后新增 skill，老用户一更新就自动拿到。
- **取舍**：不能只装其中某一个 skill——团队统一标准本来就该整套用，这个取舍是有意的。

（若哪天确实需要「按需单装」，得把仓库改造成「一个 marketplace 列多个 plugin」的结构，复杂度更高。当前不需要。）

### claude.ai（网页 / 桌面 App）

网页端不支持 marketplace，走上传：把单个 skill 目录（如 `skills/mysql-design/`）打包成 `.skill`（即该目录的 zip），在 **Settings → Capabilities → Skills → Upload skill** 上传。需要打包时让 Claude 帮你做即可。

---

## 版本与更新

plugin **钉了 `version`（语义化版本）**。这意味着：

- 用户**只有在 version 号变化时**才会收到更新——日常提交（改错别字、调文档）不会惊动已安装用户。
- 发布新版的流程：改完内容（含新增 skill）→ 用脚本把 **4 个清单文件**的 `version` 一次性同步 bump → 提交推送：

  ```bash
  scripts/bump-version.sh 1.1.0   # 一条命令改全 4 份（Claude 两份 + Cursor 两份）
  ```

  脚本会校验 `X.Y.Z` 格式、只动 `version` 字段、不破坏其它内容。涉及的 4 个文件：
  [`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json)、[`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json)、[`.cursor-plugin/plugin.json`](./.cursor-plugin/plugin.json)、[`.cursor-plugin/marketplace.json`](./.cursor-plugin/marketplace.json)。
- 用户侧更新：

  ```bash
  /plugin marketplace update dinglan                  # 刷新本地 marketplace 目录册
  /plugin update engineering-standards@dinglan        # 升级到新版
  ```

> 备选策略：去掉所有 `version` 字段，则「每次 commit = 新版本」自动推送给全员。对团队标准而言**不推荐**——会让每次小改动都打扰大家。当前采用钉版本的可控方案。

---

## 触发机制说明

装好 plugin 后，Claude **自动**判断什么时候该用，**不需要**你说"请使用 xxx skill"。

不过 Claude 偶尔会"少触发"，下面这些场景建议在 prompt 里明确提一句"**按团队规范写**"：

- **重要交付**：PR 提交前、客户可见的代码
- **长对话**：聊了几十轮之后，Claude 注意力会衰减——重要任务建议**开新对话**
- **极简任务**："改一下这个变量名" 这种一句话任务可能跳过 skill

想确认是否生效：直接问 Claude "你刚才用了 naming-conventions 这个 skill 吗？"

---

## 仓库结构

```
.
├── README.md
├── .claude-plugin/               ← Claude Code 清单
│   ├── plugin.json               ← 单个 plugin 的清单，"skills": "./skills/" 带出全部
│   └── marketplace.json          ← marketplace 目录册，只列这一个 plugin（source: "./"）
├── .cursor-plugin/               ← Cursor 清单（与上面一一对应，内容镜像）
│   ├── plugin.json
│   └── marketplace.json
└── skills/                       ← 两边共用同一份；一个 skill = 一个目录
    ├── naming-conventions/
    │   └── SKILL.md
    ├── mysql-design/
    │   └── SKILL.md
    └── nestjs-starter/
        ├── SKILL.md
        ├── references/           ← 分主题参考文档（按需加载）
        └── assets/               ← 可直接复制的模板文件
```

整个仓库就是 plugin 本身：`.claude-plugin/`（Claude Code）和 `.cursor-plugin/`（Cursor）各放一份清单，两者内容镜像、用 `source: "./"` 指向仓库根；`skills/` 是真正的内容，两边共用，只存一份。

---

## 添加新 skill

直接加进 `skills/`，会**自动并入同一个 plugin**，无需改 marketplace 结构：

1. 在 `skills/` 下新建 `<skill-名>/` 目录（kebab-case，如 `api-design`）。
2. 目录内创建 `SKILL.md`，头部需要 YAML 元数据：

   ```yaml
   ---
   name: <skill-name>
   description: <什么时候触发、做什么。建议写得"啰嗦"一点，对抗 Claude 少触发的倾向>
   ---
   ```

3. 在本 README 的"包含的 skill"表格里登记（注明类型：规范 / 脚手架）。
4. bump 版本：`scripts/bump-version.sh <新版本>`（一次改全 4 个清单，见上方「版本与更新」）。
5. 提 PR。老用户更新后即可拿到新 skill（无需改任何清单结构，`skills/` 会自动并入）。

`description` 的写法很关键——它是 Claude 判断"要不要用这个 skill"的唯一依据。务必包含：
- 这个 skill**适用于什么场景**（具体关键词，比如"写 SQL"、"搭 NestJS 项目"）
- **强调"必须使用"**，即使用户没有明确提到"规范""脚手架"这类词

可参考 [`naming-conventions`](./skills/naming-conventions/SKILL.md)、[`nestjs-starter`](./skills/nestjs-starter/SKILL.md) 的 description 写法。
