# CLAUDE.md

## 自检规则

- **部署后必须自检，禁止让用户检查结果。** 每次 `wrangler deploy` 后，用 `curl --max-time 30` 验证所有关键功能：
  1. 首页加载：`curl -s https://batchlyai.com | head -1` 确认返回 `<!DOCTYPE html>`
  2. 注册 API：`curl -s -X POST https://batchlyai.com/api/auth/sign-up/email -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test123456","name":"Test"}'` 确认返回 token
  3. 登录 API：同上，确认返回 token（不返回 401 或 Error 1102）
  4. 若改了前端 UI（登录页、首页组件等），确认 JS bundle 中包含改动后的代码关键词
  5. 若改了错误处理逻辑，测试错误路径（错误密码、空输入等），确认返回合理的错误信息
- 使用 `absolute` 定位的 dropdown/popover 组件，必须检查所有祖先元素是否有 `overflow: hidden/auto/scroll/clip`（包括 `overflow-x-auto` 等单方向设置）。CSS 规范：任一方向设置非 visible overflow，另一方向自动变为 auto，会裁剪绝对定位子元素。
- 部署命令：`npx vite build && npx wrangler deploy`
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
