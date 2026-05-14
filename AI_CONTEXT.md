# BatchlyAI — 代码摘要

> 面向 AI 工具的代码库上下文文件，最后更新：2026-05-06

## 1. 项目概览

**BatchlyAI** 是一个 Universal AI Generator，支持多变量 prompt 模板批量生成 + 社区分享 + 模板市场 + 推荐系统。用户输入 `{{var1, var2}}` 变量组，系统计算笛卡尔积后批量调用 AI 生成图片/文本。支持 `{*描述*}` AI 智能展开语法。

- **线上地址**: https://batchlyai.com
- **部署**: Cloudflare Workers (Nitro v3)，D1 数据库，KV 缓存，R2 存储

## 2. 技术栈

| 层级             | 技术                            | 备注                                                    |
| ---------------- | ------------------------------- | ------------------------------------------------------- |
| **元框架**       | TanStack Start                  | SSR + file-based routing                                |
| **UI**           | React 19 + React Compiler       | Tailwind CSS v4 + shadcn/ui                             |
| **路由**         | TanStack Router                 | `createFileRoute`                                       |
| **数据获取**     | TanStack React Query v5         | staleTime: 2min                                         |
| **ORM**          | Drizzle ORM                     | SQLite (Cloudflare D1)                                  |
| **认证**         | Better Auth                     | email/password + GitHub + Google OAuth + Google One Tap |
| **AI Providers** | DeepSeek + Replicate + Grsai    | 通过 Cloudflare AI Gateway (含 fallback)                |
| **支付**         | Stripe SDK v22                  | 一次性支付, USD/CNY 双币种, API `2026-04-22.dahlia`     |
| **邮件**         | Cloudflare Email / MailChannels | 验证邮件 + 密码重置                                     |
| **缓存**         | Cloudflare KV                   | prompt 缓存 + GRS 任务状态 + 推荐 IP 追踪               |
| **存储**         | Cloudflare R2                   | 文件上传                                                |
| **服务端**       | Nitro v3 beta                   | `nodejs_compat`                                         |
| **语言**         | TypeScript 6                    | strict mode                                             |
| **检查**         | Oxlint + Oxfmt                  |                                                         |
| **测试**         | Vitest + Playwright             | 单元/集成/E2E                                           |

## 3. 目录结构

```
├── src/
│   ├── router.tsx               # TanStack Router + Query 集成
│   ├── routeTree.gen.ts         # 自动生成路由树
│   ├── styles.css               # Tailwind v4
│   ├── env/                     # client.ts / server.ts (t3-env + zod)
│   ├── types/                   # workers.d.ts (D1, KV 类型声明)
│   │
│   ├── routes/                  # TanStack Router 文件路由
│   │   ├── __root.tsx           # 根布局
│   │   ├── index.tsx            # 英文首页
│   │   ├── cn/index.tsx         # 中文首页
│   │   ├── discover.tsx         # 社区作品发现页
│   │   ├── _guest/              # 游客路由 (login/signup/forgot-password/reset-password)
│   │   ├── my/                  # 用户页面 (generations/prompts/works)
│   │   ├── blog/                # 博客 (index + $slug)
│   │   ├── templates/           # 模板市场 (index + $slug)
│   │   ├── works/$workId.tsx    # 作品详情
│   │   ├── g/$shareId.tsx       # 公开分享批次
│   │   ├── r/$code.tsx          # 推荐码落地页 (302 跳转)
│   │   └── api/                 # 服务端 API 路由
│   │       ├── auth/$.ts             # Better Auth (认证路由表)
│   │       ├── auth/google-one-tap.ts # Google One Tap 登录
│   │       ├── generate.ts          # POST - AI 生成 (全异步)
│   │       ├── generate-status.ts   # GET  - 异步轮询
│   │       ├── grs-webhook.ts       # POST - GRS 回调
│   │       ├── expand-vars.ts       # POST - AI 变量展开 (DeepSeek)
│   │       ├── prompts.ts           # GET/POST/DELETE - 保存的 Prompt
│   │       ├── templates.ts         # GET/POST - 模板市场
│   │       ├── templates/$slug.ts   # GET - 模板详情
│   │       ├── works.ts             # GET/POST - 社区作品
│   │       ├── works/comment.ts     # GET/POST - 作品评论
│   │       ├── works/like.ts        # POST - 点赞
│   │       ├── generations.ts       # GET - 生成历史
│   │       ├── share.ts             # POST - 创建分享
│   │       ├── upload-url.ts        # POST - R2 上传
│   │       ├── health.ts            # GET - 健康检查
│   │       ├── stripe/              # Stripe 支付
│   │       │   ├── checkout.ts      #    POST - 创建 checkout
│   │       │   ├── portal.ts        #    POST - billing portal
│   │       │   └── webhook.ts       #    POST - Stripe webhook
│   │       └── referral/            # 推荐系统
│   │           ├── generate-code.ts #    POST - 生成推荐码
│   │           └── stats.ts         #    GET  - 推荐统计
│   │
│   ├── components/
│   │   ├── HomePage.tsx         # 主页面 (GeneratorCard + ResultsGrid + ShareScreenshot)
│   │   ├── SettingsBar.tsx      # 固定工具栏 (主题/语言/积分/推荐/用户菜单)
│   │   ├── CreditPurchasePopover.tsx  # 积分购买弹窗 (1-100 包)
│   │   ├── GoogleOneTap.tsx     # Google One Tap 自动登录
│   │   ├── theme-provider.tsx / theme-toggle.tsx
│   │   ├── sign-in-social-button.tsx / sign-out-button.tsx
│   │   ├── ui/                  # shadcn/ui 基础组件
│   │   └── universal-generator/ # 核心生成器
│   │       ├── types.ts              # 状态/Action 类型 (含 AiBlock)
│   │       ├── models.ts             # 6 个模型 (image/video/text)
│   │       ├── utils.ts              # 变量解析 + AI block 提取
│   │       ├── useGeneratorState.ts  # useReducer 状态机 + 轮询
│   │       ├── useExpandVariables.ts # AI 变量展开 hook
│   │       ├── inspire-prompts.ts    # 15 个灵感 prompt 模板
│   │       ├── GeneratorCard.tsx     # 生成器卡片
│   │       ├── ResultCard.tsx / ResultsGrid.tsx
│   │       ├── VariableGroupCard.tsx
│   │       └── ShareScreenshot.tsx   # html2canvas 截图分享
│   │
│   ├── lib/
│   │   ├── ai/index.ts         # AI 集成 (DeepSeek + Replicate + Grsai + AI Gateway)
│   │   ├── auth/               # Better Auth 配置、中间件、密码、hooks
│   │   ├── db/schema/          # auth + payment + data-flywheel + referral + share
│   │   ├── cache/prompt-cache.ts    # KV 缓存
│   │   ├── cloudflare/r2.ts         # R2 操作
│   │   ├── i18n/translations.ts     # EN/ZH 双语 (~150 key)
│   │   ├── referral/process.ts      # 推荐处理 (注册后发积分)
│   │   ├── seo/                     # hreflang, meta, structured-data
│   │   ├── upload/sanitize.ts       # 文件名消毒
│   │   ├── validation/schemas.ts    # Zod 校验 (prompt/数量/比例)
│   │   ├── security-headers.ts      # CSP/HSTS/X-Frame 等安全头
│   │   ├── api-helpers.ts           # JSON 响应辅助
│   │   ├── stripe.ts / email.ts / rate-limit.ts
│   │   └── utils.ts
│   │
│   └── content/blog/           # 3 篇静态博客 (TypeScript 文件)
│
├── public/                     # favicon, logo, robots.txt, sitemap.xml
├── prd/                        # 产品需求文档 (变量系统增强)
├── scripts/smoke-test.sh       # 部署后烟雾测试
├── e2e/                        # Playwright E2E
├── tests/                      # Vitest 测试辅助
└── drizzle/ + migrations/      # DB 迁移
```

## 4. 核心架构

### 4.1 认证

Better Auth 使用路由表派发模式：已知路径直接用 `auth.api[method]` 内部调用 (规避 Workers Free 10ms CPU 限制)，未知路径 fallback 到 `auth.handler()`。

- 支持 **email/password** + **GitHub OAuth** + **Google OAuth** + **Google One Tap**
- 敏感端点限流: 10 req/60s per IP
- 密码: PBKDF2-SHA256 (100k iterations)
- 邮件验证和密码重置使用 Cloudflare Email / MailChannels 真实发送
- 注册后触发 `processReferralAfterSignup()` 处理推荐

### 4.2 AI 生成 pipeline

```
用户输入 prompt 模板 → extractVariableGroups 解析 {{var1, var2}}
  ├── {*描述*} 语法 → extractAiBlocks → AI 展开 (DeepSeek) → 替换为 {{v1, v2, ...}}
  └── computePromptCombinations → 笛卡尔积 → 逐组合 POST /api/generate
       ├── 检查 prompt 缓存 (KV)
       ├── 原子扣减积分
       ├── z-image-fast → Replicate (异步, 返回 predictionId)
       ├── z-image-pro  → Grsai (异步, webhook 回调写 KV)
       └── text 模型   → DeepSeek generateText()
Client 轮询 GET /api/generate-status (每 2s, 最多 60 次, 合并轮询)
```

### 4.3 AI Providers

| Provider      | 用途                    | 连接方式                                                        |
| ------------- | ----------------------- | --------------------------------------------------------------- |
| **DeepSeek**  | 文本生成 + AI 变量展开  | Cloudflare AI Gateway `/deepseek` → fallback `api.deepseek.com` |
| **Replicate** | 图片生成 (z-image-fast) | Gateway `/replicate` → fallback `api.replicate.com`             |
| **Grsai**     | 图片生成 (z-image-pro)  | Gateway `/grsai` → fallback `grsaiapi.com`                      |

所有 Provider 使用 `fetchWithFallback()`: 先走 Gateway，失败后直连。

## 5. API 路由表

### 认证

| 路由                       | 方法     | 认证 | 限流            |
| -------------------------- | -------- | ---- | --------------- |
| `/api/auth/*`              | GET/POST | 否   | 敏感端点 10/60s |
| `/api/auth/google-one-tap` | POST     | 否   | -               |

### 生成

| 路由                   | 方法 | 认证 | 说明                               |
| ---------------------- | ---- | ---- | ---------------------------------- |
| `/api/generate`        | POST | 是   | AI 生成 (全异步, 上限 500 组合)    |
| `/api/generate-status` | GET  | 是   | 合并轮询 prediction 状态           |
| `/api/grs-webhook`     | POST | 否   | Grsai 异步回调                     |
| `/api/expand-vars`     | POST | 是   | AI 变量展开 (DeepSeek, 最多 10 个) |

### 内容

| 路由                   | 方法            | 认证    | 说明                          |
| ---------------------- | --------------- | ------- | ----------------------------- |
| `/api/prompts`         | GET/POST/DELETE | 是      | 保存的 Prompt (搜索/标签)     |
| `/api/templates`       | GET/POST        | 仅 POST | 公共模板市场 (搜索/分类/分页) |
| `/api/templates/$slug` | GET             | 否      | 模板详情                      |
| `/api/works`           | GET/POST        | 仅 POST | 社区作品 (hot/new, 分类)      |
| `/api/works/like`      | POST            | 是      | 点赞/取消 (幂等)              |
| `/api/works/comment`   | GET/POST        | 仅 POST | 评论 (含用户信息 JOIN)        |
| `/api/generations`     | GET             | 是      | 生成历史 (分页)               |
| `/api/share`           | POST            | 是      | 创建公开分享批次              |

### 支付 & 推荐

| 路由                          | 方法 | 认证 | 说明                                           |
| ----------------------------- | ---- | ---- | ---------------------------------------------- |
| `/api/stripe/checkout`        | POST | 是   | 创建 Stripe Checkout (USD/CNY, quantity 1-100) |
| `/api/stripe/portal`          | POST | 是   | Billing Portal (需 stripeCustomerId)           |
| `/api/stripe/webhook`         | POST | 否   | Stripe 事件 (idempotent via PK)                |
| `/api/referral/generate-code` | POST | 是   | 生成 8 位推荐码 (需要已使用积分)               |
| `/api/referral/stats`         | GET  | 是   | 推荐统计 (积分/tier/数量)                      |

### 其他

| 路由              | 方法 | 认证 | 说明        |
| ----------------- | ---- | ---- | ----------- |
| `/api/upload-url` | POST | 是   | R2 文件上传 |
| `/api/files/*`    | GET  | 否   | R2 文件访问 |
| `/api/health`     | GET  | 否   | 健康检查    |

## 6. 数据模型

### user (auth.schema.ts)

```
id, name, email, emailVerified, image, credits (default 10),
stripeCustomerId, role, createdAt, updatedAt
```

### 支付 (payment.schema.ts)

```sql
credit_purchase (
  id TEXT PK,           -- Stripe Session ID (幂等)
  user_id TEXT FK,
  amount INTEGER,       -- 金额 (美分/分)
  credits INTEGER,      -- 充值积分数
  status TEXT,          -- pending/completed
  created_at INTEGER,
  completed_at INTEGER
)
```

### 数据飞轮 (data-flywheel.schema.ts)

```sql
generation (id, user_id, promptTemplate, resolvedPrompts JSON,
  variableGroups JSON, resultUrls JSON, model, creditsUsed, created_at)

savedPrompt (id, user_id, name, promptTemplate, variableGroups,
  model, tags, usageCount, created_at, updated_at)

work (id, user_id, generation_id, title, description, category,
  promptTemplate, variableGroups, coverUrl, resultUrls JSON, model,
  parentWorkId, isPublished, likeCount, commentCount, remixCount,
  created_at, published_at)

workLike (id, work_id, user_id, created_at) UNIQUE(work_id, user_id)
workComment (id, work_id, user_id, content, created_at)
```

### 推荐 (referral.schema.ts)

```sql
referralCode (id, user_id UNIQUE, code UNIQUE, created_at)

referral (id, referrer_id, referee_id UNIQUE, code,
  status,           -- pending/credited
  referrerCreditsAwarded, refereeCreditsAwarded,
  purchaseCommissionAwarded,
  ipAddress, created_at, credited_at)
```

### 分享 (share.schema.ts)

```sql
sharedBatch (id, user_id, promptTemplate, variableGroups JSON,
  resultImageUrls JSON, model, aspectRatio, created_at)

template (id, user_id, slug UNIQUE, name, description, category,
  promptTemplate, variableGroups JSON, model, aspectRatio,
  previewImageUrl, isPublic, usageCount, created_at)
```

## 7. 模型定义

| id             | Label       | Category | Tier | Provider                     | Credit |
| -------------- | ----------- | -------- | ---- | ---------------------------- | ------ |
| `z-image-fast` | Image Turbo | image    | fast | replicate                    | 5      |
| `z-image-pro`  | Image Pro   | image    | pro  | grsai                        | 20     |
| `z-video-fast` | Video Turbo | video    | fast | simulated                    | 30     |
| `z-video-pro`  | Video Pro   | video    | pro  | simulated                    | 60     |
| `z-text-fast`  | Text Turbo  | text     | fast | deepseek (deepseek-chat)     | 2      |
| `z-text-pro`   | Text Pro    | text     | pro  | deepseek (deepseek-reasoner) | 4      |

默认: `z-image-pro`。video 仍为模拟占位。

## 8. 前端页面总览

| 路径               | 页面                             | 类型   |
| ------------------ | -------------------------------- | ------ |
| `/`                | 主页 (生成器)                    | 公开   |
| `/cn`              | 中文主页                         | 公开   |
| `/discover`        | 社区作品发现 (hot/new/分类 tabs) | 公开   |
| `/templates`       | 模板市场 (搜索/分类)             | 公开   |
| `/templates/$slug` | 模板详情 + 使用按钮              | 公开   |
| `/works/$workId`   | 作品详情 (点赞/评论/Remix)       | 公开   |
| `/blog`            | 博客列表                         | 公开   |
| `/blog/$slug`      | 博客文章                         | 公开   |
| `/g/$shareId`      | 分享批次                         | 公开   |
| `/r/$code`         | 推荐落地页 (302 → signup)        | 公开   |
| `/login`           | 登录 (email + OAuth)             | 游客   |
| `/signup`          | 注册 (支持 ?ref=)                | 游客   |
| `/forgot-password` | 忘记密码                         | 游客   |
| `/reset-password`  | 重置密码                         | 游客   |
| `/my/generations`  | 生成历史                         | 需登录 |
| `/my/prompts`      | 保存的 Prompt                    | 需登录 |
| `/my/works`        | 我的作品                         | 需登录 |

## 9. 关键功能详解

### 9.1 AI 变量展开 (`{*描述*}`)

用户可在 prompt 中使用 `{*animals*}` 语法，点击 "Expand" 后：

1. `extractAiBlocks()` 提取所有 `{*...*}` 块
2. POST `/api/expand-vars` 调用 DeepSeek LLM
3. DeepSeek 返回逗号分隔的值列表 (结果缓存在 KV)
4. 前端替换 `{*描述*}` → `{{val1, val2, ...}}`
5. 支持撤销 (undo)

### 9.2 推荐系统

- 用户需先使用积分 (credits < 10) 才能生成推荐码
- 8 位字母数字码 (排除易混淆字符)
- 注册时携带 `?ref=CODE`: 推荐人 +5 积分, 被推荐人 +3 积分
- **风控**: 同 IP 24h 内 3+ 注册 → pending；自推荐 → pending；同 email → 阻止
- 购买佣金: 被推荐人首次购买，推荐人获 20% 积分佣金
- 每日推荐上限: 50 人

### 9.3 社区作品

- 发布: POST `/api/works` (title + coverUrl + resultUrls)
- 画廊: `/discover` 页支持 hot/new + 分类过滤
- 点赞: 幂等 toogle (再次请求取消)
- 评论: 含用户信息 JOIN
- Remix: 加载原作品的 prompt/variables 到生成器

### 9.4 模板市场

- 任何用户可创建公开模板 (需含 `{{}}` 变量)
- 自动 slugify 名称 (碰撞加 `-1` 后缀)
- 搜索 + 分类过滤 + 分页
- "Use this template" → 预填主页生成器

### 9.5 积分购买

- 预设数量: 1/5/10/50/100 包，或自定义 (1-100)
- 每包 $10 (或人民币等值) = 1000 积分
- 中文用户自动切换 CNY 价格
- 购买成功/取消 toast 提示

### 9.6 安全

- **安全头** (`security-headers.ts`): CSP, HSTS (2y), X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy
- **输入验证** (`validation/schemas.ts`): Zod 校验 prompt 长度 (1-5000), n (1-10), aspectRatio (7 种), model (6 种)
- **限流** (`rate-limit.ts`): 内存 token-bucket, 敏感路径 10/60s
- **文件上传** (`upload/sanitize.ts`): 文件名消毒

### 9.7 SEO

- `hreflang.ts`: en/zh-CN 双语 alternate 链接
- `meta.ts`: 页面级 meta 标签辅助
- `structured-data.ts`: JSON-LD (BlogPosting, HowTo, CreativeWork)

## 10. 部署架构

```
Cloudflare Workers (batchlyai)
  ├── D1: batchlyai-db
  ├── KV: batchlyai_kv (prompt cache + GRS tasks + referral IP tracking)
  ├── R2: batchlyai-uploads (文件)
  ├── Email: EMAIL binding → noreply@batchlyai.com
  ├── Assets: .output/public
  └── Secrets: DEEPSEEK_API_KEY, GRSAI_API_KEY, REPLICATE_API_KEY,
               STRIPE_*, BETTER_AUTH_SECRET, OAuth keys
```

## 11. 已知注意事项

1. **auth.handler() 部分绕过**: 已知路径仍直接调 `auth.api` (防止 Workers Free 10ms CPU 超时)，未知路径 fallback 到 handler
2. **Replicate API**: `z-image-turbo` 用 `version` (hash `cba7f388...`)，参数 `width/height` (非 `aspect_ratio`)
3. **GRS webhook**: 依赖 webhook 回调写 KV，未到达则客户端轮询超时失败
4. **Stripe 多币种 CNY 积分计算**: webhook 公式 `(amount/100)*100` 按美元逻辑，CNY 同价不同值会少给积分
5. **video 模型未实现**: provider 为 `simulated`
6. **AI Gateway fallback**: 所有 AI 调用优先走 Cloudflare AI Gateway，失败后直连
7. **推荐统计 TODO**: tier/totalReferrals 字段为硬编码，等待 migration 0003 恢复
8. **CLAUDE.md 过时**: 可能仍记录旧的绕过方案细节

## 12. 常用命令

```bash
pnpm dev             # 本地开发
npx vite build && npx wrangler deploy   # 构建+部署
pnpm lint && pnpm format:check          # 代码检查
pnpm test && pnpm test:e2e              # 测试
bash scripts/smoke-test.sh              # 部署后验证
```
