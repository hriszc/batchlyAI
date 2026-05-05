# BatchlyAI — 代码摘要

> 面向 AI 工具的代码库上下文文件，最后更新：2026-05-06

## 1. 项目概览

**BatchlyAI** 是一个 Universal AI Generator，用户输入含多变量的 prompt 模板（如 `A {{cat, dog}} in {{forest, beach}}`），系统自动计算所有笛卡尔积组合并批量生成 AI 图片。支持多个 AI 后端（Replicate 快速通道、grsaiapi.com 专业通道），内置用户积分与 Stripe 支付系统。

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
| **数据库 (生产)** | Cloudflare D1                                 | `batchlyai_db`                                       |
| **数据库 (本地)** | SQLite (local.db)                             | 开发模式使用本地 SQLite 文件                          |
| **认证**          | Better Auth                                   | email/password + GitHub/Google OAuth                 |
| **缓存**          | Cloudflare KV                                 | `batchlyai_kv`, prompt 结果缓存 + GRS 任务状态       |
| **存储**          | Cloudflare R2                                 | `batchlyai_r2`, 文件上传                             |
| **AI Providers**  | grsaiapi.com + Replicate                      | gpt-image-2 / z-image-turbo                          |
| **支付**          | Stripe SDK v22                                | 一次性积分购买，API version `2026-04-22.dahlia`       |
| **邮件**          | Cloudflare Email / MailChannels               | 基础设施就绪，auth 回调尚未接入                       |
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
├── tsconfig.json             # TypeScript 严格模式, ESNext, @/* 别名
├── vite.config.ts            # Vite + TanStack Start + Nitro + React Compiler
├── wrangler.toml             # Cloudflare Workers 部署 (D1 + KV + R2 绑定)
├── drizzle.config.ts         # Drizzle ORM (本地 dev 用 local.db)
├── .env.example              # 环境变量模板
├── drizzle/                  # Drizzle 迁移文件
├── migrations/               # SQL 迁移 (Stripe 等)
├── e2e/                      # Playwright E2E 测试
├── tests/                    # Vitest 测试辅助
├── public/                   # 静态资源 (logo, robots.txt, _headers)
├── src/
│   ├── router.tsx            # TanStack Router 创建 + Query 集成
│   ├── routeTree.gen.ts      # 自动生成的路由树
│   ├── styles.css            # Tailwind v4 + Apple 主题
│   ├── env/                  # t3-env + zod 环境变量校验 (server/client)
│   ├── types/                # 本地类型声明 (D1Database, KVNamespace)
│   ├── routes/               # TanStack Router 基于文件的路由
│   │   ├── __root.tsx        # 根布局 (主题/i18n/devtools)
│   │   ├── index.tsx         # 英文首页
│   │   ├── cn/index.tsx      # 中文首页 (hreflang="zh-CN")
│   │   ├── _guest/           # 游客路由 (login, signup)
│   │   └── api/              # API 服务端函数路由
│   │       ├── auth/$.ts     # Better Auth 代理 (手动路由表)
│   │       ├── generate.ts   # POST /api/generate — AI 生成 (全异步)
│   │       ├── generate-status.ts  # GET /api/generate-status — 异步轮询
│   │       ├── upload-url.ts # POST /api/upload-url — R2 文件上传
│   │       ├── grs-webhook.ts     # POST /api/grs-webhook — GRS 回调
│   │       └── stripe/            # Stripe 支付
│   │           ├── checkout.ts    #    创建 checkout session
│   │           ├── portal.ts      #    创建 billing portal session
│   │           └── webhook.ts     #    接收 Stripe 事件
│   ├── components/           # React 组件
│   │   ├── HomePage.tsx      # 主页面布局
│   │   ├── SettingsBar.tsx   # 认证/设置/购买积分
│   │   ├── ui/               # shadcn/ui 基础组件
│   │   └── universal-generator/  # 核心生成器功能
│   │       ├── types.ts           # 状态 & Action 类型
│   │       ├── models.ts          # 模型定义 (6 个模型, 3 种类别)
│   │       ├── utils.ts           # 变量提取 & 笛卡尔积计算
│   │       ├── useGeneratorState.ts  # useReducer 状态机 + 轮询
│   │       ├── GeneratorCard.tsx   # 主生成器卡片
│   │       ├── ResultCard.tsx      # 单结果卡片
│   │       ├── ResultsGrid.tsx     # 结果网格
│   │       └── VariableGroupCard.tsx  # 变量组编辑器
│   └── lib/                  # 业务逻辑
│       ├── ai/index.ts       # AI 后端 (grsaiapi + Replicate, 全异步)
│       ├── auth/             # Better Auth 配置、中间件、密码哈希
│       │   ├── auth.ts            # createAuth() 工厂
│       │   ├── middleware.ts      # authMiddleware / freshAuthMiddleware
│       │   ├── password.ts        # PBKDF2 密码哈希
│       │   └── functions.ts       # _getUser() 服务端函数
│       ├── db/               # Drizzle ORM + DB 连接
│       │   └── schema/       # auth.schema.ts + payment.schema.ts
│       ├── cache/prompt-cache.ts   # KV prompt 结果缓存 (SHA-256, 24h TTL)
│       ├── stripe.ts              # Stripe SDK 单例 (fetch HTTP client)
│       ├── cloudflare/r2.ts        # R2 文件操作
│       ├── i18n/             # 英文/中文翻译 (含购买积分文案)
│       ├── email.ts          # 邮件发送 (Cloudflare Email + MailChannels)
│       ├── rate-limit.ts     # 内存限流器
│       └── utils.ts          # 共享工具 (cn 等)
```

## 4. 核心架构

### 请求流

```
浏览器 → Cloudflare Workers (Nitro v3)
  ├── 静态资源: ASSETS binding → public/ 目录
  ├── API 路由: src/routes/api/*.ts → 服务端函数
  └── SSR 页面: TanStack Start → React 19 渲染 → HTML 响应
```

### 认证架构

Better Auth 使用标准 `auth.handler(request)` 处理所有认证请求。

关键细节：
- 敏感端点（sign-in/up、forget/reset-password）在 POST 请求进入 handler 之前有内存限流 (10 req/60s per IP)
- 限流检查后直接 `return auth.handler(request)` 处理
- Session 通过 cookie cache 管理 (5min maxAge)
- 密码使用 PBKDF2-SHA256 哈希 (100k iterations, 16-byte salt, 64-byte key)

**认证中间件** (`src/lib/auth/middleware.ts`)：
- `authMiddleware` — 缓存 session (5min cookie cache)，用于路由级守卫
- `freshAuthMiddleware` — 每次查询数据库，用于敏感/写操作

**邮件**：`src/lib/email.ts` 支持 Cloudflare Email Binding + MailChannels HTTP API 两种发送方式。auth.ts 的 `sendEmailVerification` 和 `sendResetPassword` 回调已接入真实邮件发送 (发送 HTML 邮件，含验证/重置链接)。

### AI 生成 pipeline (全异步)

```
Client POST /api/generate
  ├── 检查 prompt 缓存 (KV, SHA-256 key, 24h TTL)

  ├── 命中 → 直接返回 URL (免积分)
  └── 未命中 → 原子扣减积分 (UPDATE WHERE credits >= cost)
       ├── 余额不足 → 402
       └── 扣减成功
            ├── z-image-fast (Replicate)
            │     → POST api.replicate.com/v1/predictions
            │     → 返回 predictionIds
            └── z-image-pro (GRS AI)
                  → POST grsaiapi.com/v1/draw/completions (含 webHook URL)
                  → 存储 task 到 KV: grs:<id>
                  → 返回 predictionIds

Client 轮询 GET /api/generate-status?ids=...&type=...
  ├── type=replicate → 调用 Replicate poll API
  └── type=grs → 读取 KV grs:<id> (由 webhook 更新)

GRS AI 回调 POST /api/grs-webhook
  → 更新 KV grs:<id> 写入最终状态 (succeeded/failed) + URL
```

轮询参数: 每 2 秒一次, 最多 60 次 (2 分钟), 等到所有 prediction 达到终态后返回。

缓存命中时直接返回 URL（不扣积分），命中后写入 KV。

## 5. API 路由表

| 路由                        | 方法 | 文件                            | 功能            | 认证 | 限流   |
| --------------------------- | ---- | ------------------------------- | --------------- | ---- | ------ |
| `/api/auth/sign-up/email`   | POST | `routes/api/auth/$.ts`          | 邮箱注册        | 否   | 10/60s |
| `/api/auth/sign-in/email`   | POST | `routes/api/auth/$.ts`          | 邮箱登录        | 否   | 10/60s |
| `/api/auth/sign-out`        | POST | `routes/api/auth/$.ts`          | 登出            | 否   | -      |
| `/api/auth/get-session`     | GET  | `routes/api/auth/$.ts`          | 获取当前会话    | 否   | -      |
| `/api/auth/forget-password` | POST | `routes/api/auth/$.ts`          | 忘记密码        | 否   | 10/60s |
| `/api/auth/reset-password`  | POST | `routes/api/auth/$.ts`          | 重置密码        | 否   | 10/60s |
| `/api/auth/callback/:provider` | GET/POST | `routes/api/auth/$.ts`     | OAuth 回调      | 否   | -      |
| `/api/generate`             | POST | `routes/api/generate.ts`        | AI 生成 (异步)  | 是   | -      |
| `/api/generate-status`      | GET  | `routes/api/generate-status.ts` | 异步任务轮询    | 是   | -      |
| `/api/grs-webhook`          | POST | `routes/api/grs-webhook.ts`     | GRS AI 回调     | 否   | -      |
| `/api/upload-url`           | POST | `routes/api/upload-url.ts`      | 文件上传到 R2   | 是   | -      |
| `/api/stripe/checkout`      | POST | `routes/api/stripe/checkout.ts` | 创建支付会话    | 是   | -      |
| `/api/stripe/portal`        | POST | `routes/api/stripe/portal.ts`   | 账单管理门户    | 是   | -      |
| `/api/stripe/webhook`       | POST | `routes/api/stripe/webhook.ts`  | Stripe 事件接收 | 否   | -      |

## 6. 关键模块详解

### 6.1 AI 集成 (`src/lib/ai/index.ts`)

全异步架构，不再有同步生成：

- **createGrsaiPredictions()**: 调用 GRS AI (`gpt-image-2`)，传入 `webHook: ${VITE_BASE_URL}/api/grs-webhook`，立即返回 `{ id, status }`
- **createReplicatePredictions()**: 调用 Replicate (`z-image-turbo`), `version: cba7f388...`, 根据 aspect ratio 计算 width/height (base 1024)，立即返回 prediction ID
- **pollReplicatePrediction()**: 轮询 Replicate prediction 状态，返回 `{ status, urls, error }`

### 6.2 生成器状态机 (`src/components/universal-generator/useGeneratorState.ts`)

- 使用 `useReducer` 管理 `GeneratorState`，`stateRef` 解决闭包陈旧问题
- `startGenerating()`: POST 到 `/api/generate`
  - 如果是异步响应 → 调用 `pollForResults()` (每 2s 轮询, 最多 60 次)
  - 如果是同步响应 (缓存命中) → 直接返回 URL
  - video/text 模型 → 前端模拟 (setTimeout 1.5s)
- 积分余额通过 `SET_CREDITS_REMAINING` 实时更新

### 6.3 变量解析 (`src/components/universal-generator/utils.ts`)

- **extractVariableGroups()**: 正则 `/\{\{(.+?)\}\}/g` 提取变量组
- **computeCombinations()**: 笛卡尔积计算
- **computePromptCombinations()**: 模板插值生成最终 prompt
- **getCombinationCount()**: 总组合数 = 各组值数量的乘积

### 6.4 模型定义 (`src/components/universal-generator/models.ts`)

| id             | label       | category | tier | provider   | creditCost |
| -------------- | ----------- | -------- | ---- | ---------- | ---------- |
| `z-image-fast` | Image Turbo | image    | fast | replicate  | 10         |
| `z-image-pro`  | Image Pro   | image    | pro  | grsai      | 20         |
| `z-video-fast` | Video Turbo | video    | fast | simulated  | 40         |
| `z-video-pro`  | Video Pro   | video    | pro  | simulated  | 80         |
| `z-text-fast`  | Text Turbo  | text     | fast | simulated  | 5          |
| `z-text-pro`   | Text Pro    | text     | pro  | simulated  | 10         |

- 默认模型: `z-image-pro`
- `provider` 字段驱动后端选择: `replicate` | `grsai` | `simulated`
- 三类模型类别: image / video / text (video 和 text 为模拟占位)

### 6.5 积分 & 支付系统

**积分系统** (`src/routes/api/generate.ts`):
- 新用户默认 10 积分
- 原子扣减: `UPDATE user SET credits = credits - cost WHERE id = ? AND credits >= cost`
- 失败退款: 生成失败时 `credits + refund`
- 少生成退款: 实际生成数少于预期数量，退还多扣积分

**Stripe 支付** (`src/lib/stripe.ts` + `src/routes/api/stripe/`):
- **一次性支付** (`mode: "payment"`)，非订阅制
- **多币种**: 根据用户语言自动选择 USD (`STRIPE_PRICE_ID_USD`) 或 CNY (`STRIPE_PRICE_ID_CNY`)，中文用户 → CNY
- Checkout → Stripe → Webhook (`checkout.session.completed`) → 充值积分
- 汇率: 100 积分/美元 (hardcoded)，CNY 订单用相同公式 (注意: 可能少给积分)
- **幂等性**: Stripe Session ID 作为 `credit_purchase` 表主键，重复事件返回 200
- **首次购买**: 自动设置 `user.stripe_customer_id`，后续可使用 Billing Portal
- Billing Portal 仅在用户有 `stripe_customer_id` 时可用 (至少购买过一次)
- 前端 `SettingsBar.tsx` 处理 `?purchase=success/canceled` URL 参数并提示 toast

### 6.6 提示缓存 (`src/lib/cache/prompt-cache.ts`)

- Key: `SHA-256(prompt|model|aspectRatio|n)`
- TTL: 24 小时
- 生成前先查缓存，命中直接返回 URL（不扣积分）
- 生成成功后将结果写入 KV
- 缓存失败不抛异常（非致命）

### 6.7 限流器 (`src/lib/rate-limit.ts`)

- 内存 Map 实现，单 Worker 实例级别
- 30s 惰性清理过期条目
- 应用于敏感 auth 端点: `checkRateLimit(`${path}:${ip}`, 10, 60)`

## 7. 数据模型

```sql
-- src/lib/db/schema/auth.schema.ts (Drizzle SQLite)

user (
  id                  TEXT PRIMARY KEY
  name                TEXT NOT NULL
  email               TEXT NOT NULL UNIQUE
  email_verified      BOOLEAN DEFAULT FALSE
  image               TEXT
  credits             INTEGER DEFAULT 10       -- 积分余额
  stripe_customer_id  TEXT                     -- Stripe 客户 ID (首次购买后设置)
  created_at          TIMESTAMP
  updated_at          TIMESTAMP
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

-- src/lib/db/schema/payment.schema.ts

credit_purchase (
  id            TEXT PRIMARY KEY       -- Stripe Session ID (幂等性)
  user_id       TEXT NOT NULL → user.id
  amount        INTEGER NOT NULL       -- 支付金额 (美分)
  credits       INTEGER NOT NULL       -- 充值积分数
  status        TEXT NOT NULL DEFAULT 'pending'
  created_at    INTEGER NOT NULL       -- Unix 时间戳
  completed_at  INTEGER                -- 完成时间
)
```

关系: `user` 1→N `session`, `user` 1→N `account`, `user` 1→N `credit_purchase`

## 8. 前端组件树

```
<ThemeProvider>
  <QueryClientProvider>
    <Router>
      <RootLayout (__root.tsx)>
        ├─ <SettingsBar />       — 认证状态/登录/登出/购买积分
        │   ├─ <SignInSocialButton />   — GitHub/Google OAuth
        │   ├─ <SignOutButton />
        │   └─ "Buy Credits" 按钮 → Stripe Checkout
        ├─ <ThemeToggle />        — 暗黑模式切换
        ├─ <HomePage>
        │   └─ <GeneratorCard>    — 核心生成卡片
        │       ├─ 文本输入区 (textarea)
        │       ├─ 附件列表 (R2 上传)
        │       ├─ 工具栏:
        │       │   ├─ 模型选择器 (Dropdown, 按类别分组, Fast/Pro 二级)
        │       │   ├─ 宽高比选择 (16:9 / 1:1 / 9:16)
        │       │   ├─ 数量选择 (1 / 2 / 4)
        │       │   ├─ 组合数 & 预估积分
        │       │   └─ 剩余积分 (实时更新)
        │       └─ [可折叠] <VariableGroupCard /> × N
        └─ <ResultsGrid>
            └─ <ResultCard /> × N  — 图片 + prompt + 下载按钮
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
  ├── D1 数据库: batchlyai-db
  ├── KV 命名空间: batchlyai_kv
  ├── R2 存储桶: batchlyai-uploads
  ├── Email Binding: EMAIL → noreply@batchlyai.com
  ├── 静态资源: ASSETS binding → .output/public
  └── 密钥 (wrangler secret):
      ├── BETTER_AUTH_SECRET
      ├── GRSAI_API_KEY, REPLICATE_API_KEY
      ├── STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
      ├── STRIPE_PRICE_ID_USD, STRIPE_PRICE_ID_CNY
      └── GITHUB/GOOGLE OAuth (CLIENT_ID + CLIENT_SECRET)
```

部署命令: `npx vite build && npx wrangler deploy`

## 10. 已知陷阱 & 注意事项

1. **部署后必须自检**: 每次 `wrangler deploy` 后用 `curl` 验证首页、注册 API、登录 API。

2. **Replicate API**: `z-image-turbo` 用 `version` (非 `model`)，hash: `cba7f388...`。输入参数 `width`/`height` (非 `aspect_ratio`)。

3. **GRS webhook**: GRS AI 依赖 webhook 回调更新 KV，若 webhook 未到达则 client 轮询 (每 2s, 最多 60 次) 超时后返回失败。

4. **绝对定位 dropdown**: 检查祖先元素是否有 `overflow: hidden/auto/scroll/clip`，会裁剪绝对定位子元素。

5. **Stripe 幂等性**: Webhook 用 Stripe Session ID 做主键防重复，`SQLITE_CONSTRAINT` 错误被静默捕获。

6. **Stripe 多币种**: 前端根据语言选择 USD/CNY 价格 ID，但 webhook 的积分计算公式 `(amount_total / 100) * 100` 按美元逻辑处理，CNY 订单会少给积分。

7. **Prompt 缓存**: `SHA-256(prompt|model|aspectRatio|n)` 作为 KV key，TTL 24h。缓存命中不扣积分。

8. **积分原子操作**: `UPDATE WHERE credits >= cost` 乐观锁防超用，失败必须退款。

9. **text/video 模型**: 尚未接入真实 API (`provider: "simulated"`)，前端用 setTimeout 1.5s 模拟生成。

10. **CLAUDE.md 已过时**: 仍记录旧的 `auth.handler()` 绕过方案，但实际代码已恢复使用 `auth.handler(request)`。

## 11. 常用命令

```bash
pnpm dev            # 本地开发 (vite dev)
pnpm build          # 构建
pnpm lint           # Oxlint 类型感知检查
pnpm format         # Oxfmt 格式化
pnpm test           # Vitest 测试
pnpm test:e2e       # Playwright E2E
pnpm db generate    # Drizzle 迁移生成
pnpm db migrate     # Drizzle 迁移执行
```

部署与验证:

```bash
npx vite build && npx wrangler deploy
curl -s https://batchlyai.com | head -1                           # 首页
curl -s -X POST https://batchlyai.com/api/auth/sign-up/email ...   # 注册
curl -s -X POST https://batchlyai.com/api/auth/sign-in/email ...   # 登录
```
