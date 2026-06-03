# 团队研发标准

供团队成员和 AI 助手（Claude）共同遵循的研发标准集合，包含两类资产：

- **规范** —— 约束「代码该怎么写」的横切约定（命名、SQL、API 设计……）
- **脚手架** —— 直接生成符合团队风格的项目骨架与生产级基础设施

每个都打包为 [Claude skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)，安装后 Claude 写代码或搭项目时会自动遵循 / 套用。

## 包含的 skill

| 名称 | 类型 | 适用范围 | 状态 |
|---|---|---|---|
| [naming-conventions](./naming-conventions/) | 规范 | Node.js (JS/TS) 命名规范 | ✅ 可用 |
| [mysql-design](./mysql-design/) | 规范 | MySQL 数据库设计规范（Prisma-first） | ✅ 可用 |
| [nestjs-starter](./nestjs-starter/) | 脚手架 | NestJS 11 后端项目（TS + Prisma + MySQL，生产级基础设施） | ✅ 可用 |

> 规划中：API 设计规范、Git commit 格式、错误处理 / 日志规范……欢迎补充。

---

## 如何使用

skill 有两套分发渠道，团队日常多用 **Claude Code**，优先方式一。

> ⚠️ 本仓库是 skill 的「源 / 目录册」，按 `<skill名>/SKILL.md` 平铺存放，**不是**能被直接加载的 `.claude/skills/` 结构。用法是把需要的**子目录复制**到 skills 目录，而不是把整个仓库丢进去。

### 方式一：Claude Code（命令行 / IDE / 桌面端）——推荐

Claude Code 会从两个目录**自动发现** skill，把需要的 `<skill名>/` 目录整个复制进去即可（主文件名必须是大写的 `SKILL.md`）：

| 放置位置 | 作用范围 | 适合 |
|---|---|---|
| `~/.claude/skills/<skill名>/` | 你的所有项目 | 个人长期使用 |
| `<某项目>/.claude/skills/<skill名>/` | 仅该项目，随 git 走 | 团队共享、项目强相关 |

```bash
# 个人级：对所有项目生效
cp -r naming-conventions ~/.claude/skills/

# 或项目级：放进某个项目并提交，团队 clone 后开箱即用
cp -r nestjs-starter /path/to/your-project/.claude/skills/
```

- **无需重启**，当前会话即时生效（热加载）
- 用 `/skills` 查看已加载的 skill 列表
- 目录名即标识，目录里必须有 `SKILL.md`

### 方式二：claude.ai（网页 / 桌面 App）

网页端走上传：把 skill 目录打包成 `.skill`（本质就是该目录的 zip），在 **Settings → Capabilities → Skills → Upload skill** 上传即可。

需要打包时让 Claude 帮你做：发一句"帮我把 `naming-conventions/` 打包成 .skill 文件"即可。

### 方式三：作为文档参考

直接阅读各目录下的 `SKILL.md`——它本身就是一份规范 / 脚手架文档，适合在 code review、新人 onboarding 时引用。

---

## 触发机制说明

装好 skill 后，Claude **自动**判断什么时候该用，**不需要**你说"请使用 xxx skill"。

不过 Claude 偶尔会"少触发"，下面这些场景建议在 prompt 里明确提一句"**按团队规范写**"：

- **重要交付**：PR 提交前、客户可见的代码
- **长对话**：聊了几十轮之后，Claude 注意力会衰减——重要任务建议**开新对话**
- **极简任务**："改一下这个变量名" 这种一句话任务可能跳过 skill

想确认是否生效：直接问 Claude "你刚才用了 naming-conventions 这个 skill 吗？"

---

## 目录结构

```
.
├── README.md                    ← 你正在看的文件
├── naming-conventions/          ← 一个 skill = 一个目录
│   └── SKILL.md                 ← skill 主文件（文件名必须是这个）
└── nestjs-starter/              ← 带补充材料的 skill 长这样
    ├── SKILL.md                 ← skill 主文件
    ├── references/              ← 分主题的参考文档（按需加载）
    └── assets/                  ← 可直接复制的模板文件
```

每个 skill 按相同结构组织：一个目录，里面放 `SKILL.md`。如有补充材料，同目录追加 `references/`（参考文档）、`assets/`（模板/示例文件）等子目录即可——`SKILL.md` 保持精简，细节放进 `references/` 让 Claude 按需加载。

---

## 添加新 skill

1. 在仓库根目录新建 `<skill-名>/` 目录（kebab-case，如 `mysql-design`）
2. 目录内创建 `SKILL.md`，参考 [`naming-conventions/SKILL.md`](./naming-conventions/SKILL.md)（纯规范）或 [`nestjs-starter/SKILL.md`](./nestjs-starter/SKILL.md)（带模板的脚手架）的格式
3. `SKILL.md` 头部需要 YAML 元数据：

   ```yaml
   ---
   name: <skill-name>
   description: <什么时候触发、做什么。建议写得"啰嗦"一点，对抗 Claude 少触发的倾向>
   ---
   ```

4. 在本 README 的"包含的 skill"表格里登记（注明类型：规范 / 脚手架）
5. 提 PR

`description` 的写法很关键——它是 Claude 判断"要不要用这个 skill"的唯一依据。务必包含：
- 这个 skill**适用于什么场景**（具体的关键词，比如"写 SQL"、"搭 NestJS 项目"）
- **强调"必须使用"**，即使用户没有明确提到"规范""脚手架"这类词

可参考 `naming-conventions/SKILL.md`、`nestjs-starter/SKILL.md` 的 description 写法。