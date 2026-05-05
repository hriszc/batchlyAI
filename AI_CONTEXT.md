# BatchlyAI — 代码摘要

> 面向 AI 工具的代码库上下文文件，最后更新：2026-05-05

## 1. 项目概览

**BatchlyAI** 是一个 Universal AI Generator，用户输入含多变量的 prompt 模板（如 `A {{cat, dog}} in {{forest, beach}}`），系统自动计算所有笛卡尔积组合并批量生成 AI 图片。支持多个 AI 后端（Replicate 快速通道、grsaiapi.com 专业通道），内置用户积分系统。

- **线上地址**: https://batchlyai.com
- **部署名称**: `batchlyai` (Cloudflare Workers)
- **模板来源**: [TanStarter](https://github.com/mugnavo/tanstarter)

## 2. 技术栈

| 层级              | 技术                                          | 版本/备注                                            |
| ----------------- | --------------------------------------------- | ---------------------------------------------------- |
| **元框架**        | TanStack Start                                | SSR + file-based routing                             |
| **UI**            | React 19 + React Compiler                     | `@vitejs/plugin-react` + babel-plugin-react-compiler |
| **路由**          | TanStack Router                               | `createFileRoute` 基于文件的路由                     |
| **数据获取**      | TanStack React Query v5                       | staleTime: 2min, SSR query integration               |
| **样式**          | Tailwind CSS v4 + shadcn/ui + Base UI         | Apple 设计系统                                       |
| **图标**          | lucide-react + @icons-pack/react-simple-icons | UI 图标 + 品牌图标                                   |
| **ORM**           | Drizzle ORM                                   | `drizzle-orm` + `drizzle-kit`, SQLite 方言           |
| **数据库 (生产)** | Cloudflare D1                                 | `batchlyai_db`, binding name: `batchlyai_db`         |
| **数据库 (本地)** | PostgreSQL via docker-compose                 | 仅本地开发                                           |
| **认证**          | Better Auth                                   | email/password + GitHub/Google OAuth                 |
| **缓存**          | Cloudflare KV                                 | `batchlyai_kv`, prompt 结果缓存                      |
| **存储**          | Cloudflare R2                                 | `batchlyai_r2`, 文件上传                             |
| **AI Providers**  | grsaiapi.com + Replicate                      | gpt-image-2 / z-image-turbo                          |
| **服务端**        | Nitro v3 beta (Cloudflare Workers module)     | `nodejs_compat` flag                                 |
| **构建**          | Vite 8 + rolldown                             | Babel plugin for React Compiler                      |
| **语言**          | TypeScript 6                                  | strict mode                                          |
| **检查**          | Oxlint + Oxfmt                                | lint-staged pre-commit hook                          |
| **测试**          | Vitest + @testing-library/react + Playwright  | 单元/集成/E2E                                        |
| **包管理**        | pnpm                                          | workspace 单包模式                                   |

## 3. 目录结构

```
.
├── package.json              # 依赖 & 脚本
├── pnpm-workspace.yaml       # pnpm workspace 配置
├── pnpm-lock.yaml
├── tsconfig.json             # TypeScript 严格模式, ESNext, @/* 别名
├── vite.config.ts            # Vite + TanStack Start + Nitro + React Compiler
├── wrangler.toml             # Cloudflare Workers 部署 (D1 + KV + R2 绑定)
├── drizzle.config.ts         # Drizzle ORM 配置
├── docker-compose.yml        # 本地 PostgreSQL
├── .env.example              # 环境变量模板
├── drizzle/                  # Drizzle 迁移文件
├── e2e/                      # Playwright E2E 测试
├── tests/                    # Vitest 测试辅助
├── public/                   # robots.txt, _headers
├── src/
│   ├── router.tsx            # TanStack Router 创建 + Query 集成
│   ├── routeTree.gen.ts      # 自动生成的路由树
│   ├── styles.css            # Tailwind v4 + Apple 主题
│   ├── env/                  # t3-env + zod 环境变量校验
│   ├── routes/               # TanStack Router 基于文件的路由
│   │   ├── __root.tsx        # 根布局 (主题/i18n/devtools)
│   │   ├── index.tsx         # 英文首页
│   │   ├── cn/index.tsx      # 中文首页
│   │   ├── _guest/           # 游客路由 (login, signup)
│   │   └── api/              # API 服务端函数路由
│   │       ├── auth/$.ts     # Better Auth 代理 (sign-up/sign-in/session...)
│   │       ├── generate.ts   # POST /api/generate — AI 图片生成
│   │       ├── generate-status.ts  # GET /api/generate-status — 异步任务轮询
│   │       └── upload-url.ts # POST /api/upload-url — 文件上传
│   ├── components/           # React 组件
│   │   ├── HomePage.tsx      # 主页面布局
│   │   ├── SettingsBar.tsx   # 认证/设置工具栏
│   │   ├── ui/               # shadcn/ui 基础组件
│   │   └── universal-generator/  # 核心生成器功能
│   │       ├── types.ts           # 状态 & Action 类型
│   │       ├── models.ts          # 模型定义
│   │       ├── utils.ts           # 变量提取 & 组合计算
│   │       ├── useGeneratorState.ts  # useReducer 状态机
│   │       ├── GeneratorCard.tsx   # 主生成器卡片
│   │       ├── ResultCard.tsx      # 单结果卡片
│   │       ├── ResultsGrid.tsx     # 结果网格
│   │       ├── VariableGroupCard.tsx  # 变量组编辑器
│   │       └── __tests__/         # 组件 & 逻辑测试
│   └── lib/                  # 业务逻辑
│       ├── ai/index.ts       # AI 后端集成 (grsaiapi + Replicate)
│       ├── auth/             # Better Auth 配置、中间件、密码哈希
│       ├── db/               # Drizzle ORM + DB 连接
│       │   └── schema/       # auth.schema.ts (user, session, account, verification)
│       ├── cache/prompt-cache.ts   # KV prompt 结果缓存
│       ├── cloudflare/r2.ts        # R2 文件操作
│       ├── i18n/             # 英文/中文翻译
│       ├── email.ts          # 邮件发送
│       ├── rate-limit.ts     # 内存限流器
│       └── utils.ts          # 共享工具
```

## 4. 核心架构

### 请求流

```
浏览器 → Cloudflare Workers (Nitro v3)
  ├── 静态资源: ASSETS binding → public/ 目录
  ├── API 路由: src/routes/api/*.ts → 服务端函数
  └── SSR 页面: TanStack Start → React 19 渲染 → HTML 响应
```

### 路由机制

TanStack Start 通过 `createFileRoute` 定义路由，包含:

- `server.handlers` — 服务端 HTTP 方法处理（API 端点）
- `component` — 客户端/SSR 页面组件
- `head` — SEO meta 标签

路由 `__root.tsx` 是根布局，包裹 `ThemeProvider`、i18n 上下文、React Devtools。

### 认证流程

Better Auth 的 `auth.handler(request)` 在 Workers Free 计划（10ms CPU）下会 503，因此**完全绕过 handler**，通过路由表 `getApiMethod()` 直接调用 `auth.api` 内部方法：

```ts
// src/routes/api/auth/$.ts
const result = await apiMethod.call(auth.api, {
  // .call() 保留 this 绑定
  body,
  headers,
  request,
  asResponse: true,
});
```

关键：必须使用 `.call(auth.api, ...)` 而非直接调用，否则 `this` 上下文丢失导致 signInEmail 503。

### AI 生成 pipeline

```mermaid
graph TD
    A[用户输入 prompt 模板] --> B[extractVariableGroups 解析 {{var1, var2}}]
    B --> C[computeCombinations 笛卡尔积]
    C --> D[computePromptCombinations 插值]
    D --> E{模型类别}
    E -->|image| F[/api/generate]
    E -->|video/text| G[前端模拟]
    F --> H{是否缓存?}
    H -->|是| I[返回缓存 URL]
    H -->|否| J[原子扣减积分]
    J --> K{D1 UPDATE WHERE credits >= cost}
    K -->|余额不足| L[402]
    K -->|扣减成功| M{模型 provider}
    M -->|grsai → z-image-pro| N[同步生成 → 返回 URL]
    M -->|replicate → z-image-fast| O[创建 prediction → 返回 predictionIds]
    O --> P[前端轮询 /api/generate-status?ids=...]
    N --> Q[写 KV 缓存]
    P --> Q
```

## 5. API 路由表

| 路由                        | 方法 | 文件                            | 功能          | 认证 | 限流   |
| --------------------------- | ---- | ------------------------------- | ------------- | ---- | ------ |
| `/api/auth/sign-up/email`   | POST | `routes/api/auth/$.ts`          | 邮箱注册      | 否   | 10/60s |
| `/api/auth/sign-in/email`   | POST | `routes/api/auth/$.ts`          | 邮箱登录      | 否   | 10/60s |
| `/api/auth/sign-out`        | POST | `routes/api/auth/$.ts`          | 登出          | 否   | -      |
| `/api/auth/get-session`     | GET  | `routes/api/auth/$.ts`          | 获取当前会话  | 否   | -      |
| `/api/auth/forget-password` | POST | `routes/api/auth/$.ts`          | 忘记密码      | 否   | 10/60s |
| `/api/auth/reset-password`  | POST | `routes/api/auth/$.ts`          | 重置密码      | 否   | 10/60s |
| `/api/auth/verify-email`    | POST | `routes/api/auth/$.ts`          | 验证邮箱      | 否   | -      |
| `/api/generate`             | POST | `routes/api/generate.ts`        | AI 图片生成   | 是   | -      |
| `/api/generate-status`      | GET  | `routes/api/generate-status.ts` | 异步任务轮询  | 是   | -      |
| `/api/upload-url`           | POST | `routes/api/upload-url.ts`      | 文件上传到 R2 | 是   | -      |

## 6. 关键模块详解

### 6.1 AI 集成 (`src/lib/ai/index.ts`)

- **generateImage()**: 入口函数，根据 model 参数路由到 grsaiapi 或 Replicate
- **generateWithGrsai()**: 调用 `grsaiapi.com/v1/draw/completions`，model: `gpt-image-2`，同步返回 URL 数组
- **generateWithReplicate()**: 调用 `api.replicate.com/v1/predictions`，model version: `cba7f388...`（z-image-turbo），轮询直到完成
- **createReplicatePredictions()**: 创建 predictions 后立即返回（不等待），由客户端轮询
- **pollReplicatePrediction()**: 轮询单个 prediction 状态

### 6.2 生成器状态机 (`src/components/universal-generator/useGeneratorState.ts`)

- 使用 `useReducer` 管理 `GeneratorState`
- Action 类型: SET_PROMPT_TEMPLATE, SYNC_GROUPS_FROM_TEMPLATE (500ms debounce), ADD_VALUE, UPDATE_VALUE, REMOVE_VALUE, START_GENERATING, FINISH_GENERATING, SET_ERROR 等
- `startGenerating()`: 调用 `computePromptCombinations()` 生成所有组合，对每个组合 `fetch("/api/generate")`，使用 `Promise.all` + `.flat()` 聚合结果
- `stateRef` 解决闭包陈旧问题：回调内通过 `stateRef.current` 读取最新状态

### 6.3 变量解析 (`src/components/universal-generator/utils.ts`)

- **extractVariableGroups()**: 正则 `/\{\{(.+?)\}\}/g` 提取模板中的变量组
- **computeCombinations()**: 笛卡尔积，`[[a,b], [c,d]]` → `[{var_0:a,var_1:c}, {var_0:a,var_1:d}, ...]`
- **computePromptCombinations()**: 组合插值并生成最终 prompt 字符串
- **getCombinationCount()**: 计算总组合数

### 6.4 模型定义 (`src/components/universal-generator/models.ts`)

| id             | label       | category | tier | provider  | creditCost |
| -------------- | ----------- | -------- | ---- | --------- | ---------- |
| `z-image-fast` | Image Turbo | image    | fast | replicate | 10         |
| `z-image-pro`  | Image Pro   | image    | pro  | grsai     | 20         |
| `z-video-fast` | Video Turbo | video    | fast | simulated | 40         |
| `z-video-pro`  | Video Pro   | video    | pro  | simulated | 80         |
| `z-text-fast`  | Text Turbo  | text     | fast | simulated | 5          |
| `z-text-pro`   | Text Pro    | text     | pro  | simulated | 10         |

默认模型: `z-image-pro`

### 6.5 提示缓存 (`src/lib/cache/prompt-cache.ts`)

- Key: `SHA-256(prompt|model|aspectRatio|n)`
- TTL: 24 小时
- getCachedResult(): 检查缓存，过期自动删除
- setCachedResult(): 写入 KV
- 缓存失败不抛异常（非致命）

### 6.6 积分系统 (`src/routes/api/generate.ts`)

- 新用户默认 10 积分（`user.credits` 默认值）
- 生成前**原子扣减**: `UPDATE user SET credits = credits - cost WHERE id = ? AND credits >= cost` 返回空行 = 余额不足
- 失败退款: 生成失败或返回数量少于预期时 `UPDATE SET credits = credits + refund`
- 返回 `creditsRemaining` 供前端展示

### 6.7 限流器 (`src/lib/rate-limit.ts`)

- 内存 Map 实现，单 Worker 实例级别
- 30s 惰性清理过期条目
- 用于登录/注册等敏感端点: `checkRateLimit(`${path}:${ip}`, 10, 60)`

## 7. 数据模型

```sql
-- src/lib/db/schema/auth.schema.ts (Drizzle SQLite dialect)

user (
  id          TEXT PRIMARY KEY
  name        TEXT NOT NULL
  email       TEXT NOT NULL UNIQUE
  email_verified BOOLEAN DEFAULT FALSE
  image       TEXT
  credits     INTEGER DEFAULT 10       -- 积分余额
  created_at  TIMESTAMP
  updated_at  TIMESTAMP
)

session (
  id          TEXT PRIMARY KEY
  expires_at  TIMESTAMP NOT NULL
  token       TEXT NOT NULL UNIQUE
  ip_address  TEXT
  user_agent  TEXT
  user_id     TEXT NOT NULL → user.id (CASCADE)
  ── INDEX session_userId_idx (user_id)
)

account (
  id          TEXT PRIMARY KEY
  account_id  TEXT NOT NULL
  provider_id TEXT NOT NULL
  user_id     TEXT NOT NULL → user.id (CASCADE)
  access_token TEXT
  refresh_token TEXT
  password    TEXT
  ── INDEX account_userId_idx (user_id)
)

verification (
  id          TEXT PRIMARY KEY
  identifier  TEXT NOT NULL
  value       TEXT NOT NULL
  expires_at  TIMESTAMP NOT NULL
  ── INDEX verification_identifier_idx (identifier)
)
```

关系: `user` 1→N `session`, `user` 1→N `account`

## 8. 前端组件树

```
<ThemeProvider>
  <QueryClientProvider>
    <Router>
      <RootLayout (__root.tsx)>
        ├─ <SettingsBar />       — 认证状态/登录/登出
        │   ├─ <SignInSocialButton />  — GitHub/Google OAuth
        │   └─ <SignOutButton />
        ├─ <ThemeToggle />        — 暗黑模式切换
        ├─ <HomePage>
        │   └─ <GeneratorCard>    — 核心生成卡片
        │       ├─ 文本输入区 (textarea)
        │       ├─ 附件列表
        │       ├─ 工具栏:
        │       │   ├─ 模型选择器 (Dropdown)
        │       │   ├─ 宽高比选择 (16:9 / 1:1 / 9:16)
        │       │   ├─ 数量选择 (1 / 2 / 4)
        │       │   ├─ 组合数 & 预估积分
        │       │   └─ 剩余积分
        │       └─ [可折叠] <VariableGroupCard /> × N
        └─ <ResultsGrid>
            └─ <ResultCard /> × N     — 单张结果卡片（图片 + prompt + 下载）
      </RootLayout>
    </Router>
  </QueryClientProvider>
</ThemeProvider>
```

## 9. 部署架构

```
Cloudflare Workers (batchlyai)
  ├── 主 Worker: .output/server/index.mjs (Nitro v3)
  ├── 兼容性: nodejs_compat, compatibility_date=2026-05-04
  ├── D1 数据库: batchlyai-db (0f1f63d2...)
  ├── KV 命名空间: batchlyai_kv (bfcff2ad...)
  ├── R2 存储桶: batchlyai-uploads
  ├── 静态资源: ASSETS binding → .output/public
  └── 密钥 (通过 wrangler secret put 设置):
      ├── GRSAI_API_KEY
      ├── REPLICATE_API_KEY
      ├── R2_ENDPOINT
      └── R2_BUCKET
```

部署命令: `npx vite build && npx wrangler deploy`

## 10. 已知陷阱 & 注意事项

1. **Cloudflare Workers Free 10ms CPU 限制**: Better Auth 的 `auth.handler()` 会导致 503，已通过直接调用 `auth.api` 内部方法绕过。详见 `src/routes/api/auth/$.ts` 的 `getApiMethod()` 路由表。

2. **`this` 绑定问题**: 动态提取 `auth.api[methodName]` 丢失 `this` 上下文，必须使用 `.call(auth.api, ...)` 保留绑定。`signUpEmail` 碰巧不依赖 `this` 所以能工作，但 `signInEmail` 需要 `this` 绑定才能正常执行。

3. **Replicate API 注意**: `prunaai/z-image-turbo` 的 predictions 端点要求 `version` 字段（不是 `model`），版本 hash: `cba7f388939b0db49dbea3341f8d732577aa0a964d9eefea5d186ab47e60deba`。该模型输入参数使用 `width`/`height`（不是 `aspect_ratio`）。

4. **绝对定位 dropdown 裁剪**: 使用 `absolute` 定位的 dropdown/popover 组件，必须检查所有祖先元素是否有 `overflow: hidden/auto/scroll/clip`（包括单方向设置如 `overflow-x-auto`）。CSS 规范：任一方向设置非 visible overflow，另一方向自动变为 auto，会裁剪绝对定位子元素。

5. **部署后必须自检**: 每次部署后用 `curl` 验证首页加载、注册 API、登录 API 是否正常。

6. **积分原子操作**: 使用 `UPDATE ... WHERE credits >= cost` 的 WHERE 条件实现乐观锁，避免超用。失败时必须退款。

7. **第三方 API 容错**: 不能假设接口一定返回 JSON，遇到非预期格式需给清晰错误提示。

8. **Prompt 缓存 Key**: 使用 SHA-256 哈希 `prompt|model|aspectRatio|n` 作为 KV key，TTL 24 小时。缓存失败不影响主流程。

## 11. 常用命令

```bash
pnpm dev            # 本地开发 (vite dev)
pnpm build          # 构建
pnpm lint           # Oxlint 类型感知检查
pnpm format         # Oxfmt 格式化
pnpm test           # Vitest 运行测试
pnpm test:e2e       # Playwright E2E 测试
pnpm db generate    # Drizzle 迁移生成
pnpm db migrate     # Drizzle 迁移执行
```

部署:

```bash
npx vite build && npx wrangler deploy
```

部署后验证:

```bash
curl -s https://batchlyai.com | head -1                          # 首页
curl -s -X POST https://batchlyai.com/api/auth/sign-up/email ...  # 注册
curl -s -X POST https://batchlyai.com/api/auth/sign-in/email ...  # 登录
```
