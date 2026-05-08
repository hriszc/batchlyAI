# CLAUDE.md

## 本地开发

- **数据库**：生产环境使用 Cloudflare D1 (SQLite)，本地开发需使用 `wrangler dev --local` 以匹配生产环境。不要使用 Docker PostgreSQL（`docker-compose.yml` 来自 TanStarter 模板，仅作参考）。
- 本地 D1 初始化：`wrangler d1 execute batchlyai-db --local --file ./drizzle/0000_true_energizer.sql`
- 部署前必须在本地 D1 上运行和验证所有迁移。
- 不要修改 `docker-compose.yml` — 它保留用于参考原始的 TanStarter 模板结构。

## 自检规则

- **部署后必须自检，禁止让用户检查结果。** 每次 `wrangler deploy` 后，用 `curl --max-time 30` 验证所有关键功能：
  1. 首页加载：`curl -s https://batchlyai.com | head -1` 确认返回 `<!DOCTYPE html>`
  2. 注册 API：`curl -s -X POST https://batchlyai.com/api/auth/sign-up/email -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test123456","name":"Test"}'` 确认返回 token
  3. 登录 API：同上，确认返回 token（不返回 401 或 Error 1102）
  4. 若改了前端 UI（登录页、首页组件等），确认 JS bundle 中包含改动后的代码关键词
  5. 若改了错误处理逻辑，测试错误路径（错误密码、空输入等），确认返回合理的错误信息
- 使用 `absolute` 定位的 dropdown/popover 组件，必须检查所有祖先元素是否有 `overflow: hidden/auto/scroll/clip`（包括 `overflow-x-auto` 等单方向设置）。CSS 规范：任一方向设置非 visible overflow，另一方向自动变为 auto，会裁剪绝对定位子元素。
- **部署命令**：`npx vite build && npx wrangler deploy`
- **⚠️ 部署权限**：只能 `wrangler versions upload` 上传版本，**禁止直接 `wrangler deploy`**（会立即全量部署到生产环境）。rollout/promote 必须经用户确认后才能执行。
- **auth-client 跨域**：`createAuthClient({ baseURL })` 必须用相对路径（`window.location.origin` 或空字符串），不能用 `VITE_BASE_URL`（绝对 URL 会导致 workers.dev 等辅助域名被 CORS 拦截）。
- **Replicate API 注意**：`prunaai/z-image-turbo` 模型的 predictions 端点要求 `version` 字段（不是 `model`），版本 hash: `cba7f388939b0db49dbea3341f8d732577aa0a964d9eefea5d186ab47e60deba`。该模型输入参数使用 `width`/`height`（不是 `aspect_ratio`）。

## Better Auth 疑难问题

### `auth.handler(request)` 在 TanStack Start + Cloudflare Workers Free 计划返回 503

**现象**：注册/登录 API 返回 503，诊断端点甚至可能抛 Error 1102（Worker exceeded resource limits）。

**根本原因**：Cloudflare Workers Free 计划只有 **10ms CPU 时间**。Better Auth 的 `handler()` 包含 URL 解析、路由匹配、中间件链执行等开销，加上密码哈希/验证的 CPU 消耗，容易超出限制被 kill。

**解决方案**：完全绕过 `auth.handler()`，通过路由表直接调用 `auth.api` 内部方法。

**关键陷阱（举一反三）**：动态提取方法 `const apiMethod = auth.api[methodName]` 会**丢失 `this` 上下文**。`signUpEmail` 碰巧不依赖 `this` 所以能工作，但 `signInEmail` 需要 `this` 绑定才能正常执行，导致注册成功但登录 503。必须使用 `.call()` 保留绑定：

```ts
// 错误：丢失 this 上下文
const result = await apiMethod({ body, headers, request, asResponse: true });

// 正确：保留 this 绑定
const result = await apiMethod.call(auth.api, { body, headers, request, asResponse: true });
```

**代价**：

- 需手动维护 `API_MAP` 路由表覆盖所有 auth 端点
- Better Auth 升级时端点名称可能变化需同步
- OAuth 回调等特殊端点可能需额外处理
- `tanstackStartCookies` 插件的 `after` hook 不触发（session 通过 token 在客户端管理）

**排查历程**：去掉邮件回调 → 去掉 cookies 插件 → 去掉 experimental joins → 尝试 auth.api 成功 → 确认 handler 问题 → 尝试干净 Request 重建 → 注册成功但登录失败 → 发现 `this` 绑定问题 → `.call()` 修复 → 两端点均正常。

## 生产安全规则

以下配置错误曾导致严重线上事故，CI 已有检查脚本 `scripts/check-production-safety.sh`：

1. **`.env.production` 必须存在且包含 `VITE_BASE_URL=https://batchlyai.com`**。缺失会导致前端 JS 请求 `localhost:3000`，用户登录/注册报 `ERR_CONNECTION_REFUSED`。
2. **`requireEmailVerification: true` 必须配合真实邮件发送**。若 `sendEmailVerification` 等回调是 `console.log` 占位，会导致新用户注册后永远无法验证邮箱，下次登录被 403。老用户的 `email_verified` 字段需批量改为 `true`。
3. **smoke 测试不可依赖 `grep 'token'`**。注册 API 返回 `"token":null` 也会匹配，需用更严格的正则（如 `grep '"token":"'`）。

## trustedOrigins 回归检查
- `src/lib/auth/auth.ts` 的 `trustedOrigins` 必须包含 `"https://*.workers.dev"`，否则 Worker 预览版登录会报 403 Invalid origin。
- 每次合并 PR 后检查 `grep trustedOrigins src/lib/auth/auth.ts` 确保该行未被覆盖。

## 合并 PR 后自检清单

**每次批量合并 PR 后必须执行以下检查，防止 squash merge 冲突覆盖之前的修复：**

```bash
# 1. 运行安全脚本
bash scripts/check-production-safety.sh

# 2. 验证前端 JS 不会请求 localhost
grep -r 'localhost:3000' .output/public/assets/ && echo "❌ localhost leak!" || echo "✅"

# 3. 验证 Workers 预览版登录未受影响
curl -s -X POST https://98ae3cd3-batchlyai.hriszc.workers.dev/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123456"}' | grep -q '"token"' && echo "✅" || echo "❌"

# 4. 验证生产域名登录正常
curl -s -X POST https://batchlyai.com/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123456"}' | grep -q '"token"' && echo "✅" || echo "❌"
```

**常见合并冲突导致回归的模式：**
- `auth.ts` 改了 trustedOrigins → 后续 PR 的旧版 auth.ts 用 `--theirs` 覆盖
- `wrangler.toml` 加了 bindings → 后续 PR 不带 bindings 的版本覆盖
- `translations.ts` 加了 key → 后续 PR 的旧版翻译导致 key 丢失
- `.env.production` → 后续 PR 可能在 .gitignore 导致文件被删
