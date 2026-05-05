# BatchlyAI 变量系统增强 PRD

> **创建日期**：2026-05-05
> **版本**：v1.1
> **状态**：Draft

## 变更记录

| 日期       | 版本 | 变更内容                                                                    |
| ---------- | ---- | --------------------------------------------------------------------------- |
| 2026-05-05 | v1.0 | 初始版本。AI 变量展开 (`{*...*}`)、变量预设库、范围快捷语法、实时预览增强。 |
| 2026-05-05 | v1.1 | 去掉变量预设库（§2）和范围快捷语法（§3），聚焦核心 `{*...*}` AI 展开功能。  |

---

## Context

BatchlyAI 的核心交互是用户在 prompt 中使用 `{{var1, var2, var3}}` 语法定义多变量，系统自动生成所有组合。这个语法目前是**纯手动**的——用户必须自己想出所有变量值并手动输入。

**痛点**：

- 用户想用"三种颜色"但懒得想具体哪三种 → 随便写 `{{red, blue, green}}`
- 用户想用"著名画家"但忘记了名字 → 打开 Google 搜索
- 用户不知道有哪些角度/光影可选 → 只写一两个，错过了探索空间

**核心洞察**：让 AI 帮用户"填空"——用户描述想要什么，AI 生成具体的变量值列表。

---

## 现有代码分析

变量解析在 `src/components/universal-generator/utils.ts`：

```
extractVariableGroups(template)  // 正则 /\{\{(.+?)\}\}/g 提取所有 {{...}} 块
  → 按逗号 split，trim 每个值
  → 返回 VariableGroup[]: { id: "var_0", values: ["a", "b"] }

computeCombinations(groups)  // 笛卡尔积展开
interpolatePrompt(template, combination)  // 替换 {{...}} 为具体值
```

`GeneratorCard.tsx` 中 textarea 每 500ms debounce 重新解析变量。`VariableGroupCard.tsx` 允许用户内联编辑每组的值。

---

## 1. AI 变量展开 `{*description*}`

### 1.1 语法

```
{*自然语言描述*}
```

`{*` 和 `*}` 之间的内容是一个自然语言描述，AI 负责将它展开为具体的变量值列表。

### 1.2 示例

| 输入                                    | AI 展开结果                                                     |
| --------------------------------------- | --------------------------------------------------------------- |
| `A {*three colors*} background`         | `A {{red, yellow, blue}} background`                            |
| `In the style of {*famous artists*}`    | `In the style of {{Picasso, Van Gogh, Monet, Dali, Warhol}}`    |
| `{*summer vibes*} scene`                | `{{beach sunset, tropical beach, pool party, ice cream}} scene` |
| `A {*3 luxury car brands*} on the road` | `A {{Porsche, Ferrari, Lamborghini}} on the road`               |
| `{*cold color palette*} lighting`       | `{{ice blue, mint green, lavender, silver}} lighting`           |

### 1.3 与 `{{...}}` 混用

```
A {*three dog breeds*} in a {{forest, beach, city}} setting
  ↓ AI 展开
A {{Golden Retriever, German Shepherd, Bulldog}} in a {{forest, beach, city}} setting
  ↓ 笛卡尔积
3 × 3 = 9 张图
```

用户也可以在一个 prompt 中使用多个 `{*...*}` 块：

```
A {*2 watch styles*} with {*3 strap materials*} strap
  ↓ AI 展开
A {{dress watch, sports watch}} with {{leather, stainless steel, silicone}} strap
  ↓
2 × 3 = 6 张图
```

### 1.4 交互流程

```
用户在 textarea 中输入：
  "A {*three colors*} watch on a white background"

按 Tab 或点击 "✨ Expand" 按钮（textarea 旁）

LLM API 调用 → 替换 {*...*} 为 {{red, yellow, blue}}

用户看到结果，可以：
  - 接受 → 直接 Generate
  - 微调 → 在 VariableGroupCard 中编辑值
  - 撤销 → Cmd+Z 回到 {*...*} 语法
  - 重试 → 再次点击 Expand，AI 可能给出不同结果
```

**为什么不全自动**：展开消耗 API 调用（有成本和延迟），而且 AI 的结果用户可能想调整。让用户主动触发，给控制感。

### 1.5 LLM 实现

在 `/api/expand-vars` 端点中调用轻量模型（如 Claude Haiku / GPT-4o-mini）：

```
System: You are a variable expander. Given a natural language description
inside {*...*}, output 3-8 concrete, diverse values as a comma-separated
list. Be specific and creative. Do not include explanations.

User: three colors
Assistant: red, yellow, blue
```

- 用少量 few-shot examples 提高输出质量
- 设置 temperature=0.7 确保多样性（用户重试会得到不同结果）
- 用 KV 缓存常见描述的结果（`expand:three colors` → `red, yellow, blue`），避免重复 API 调用

### 1.6 解析逻辑改动

在 `extractVariableGroups` 之前新增预处理步骤 `expandAiVariables`：

```
1. 正则 /\{\*(.+?)\*\}/g 找出所有 {*...*} 块
2. 逐个调用 LLM 展开（或从 KV 缓存读取）
3. 替换 {*...*} → {{expanded, values}}
4. 交给现有的 extractVariableGroups 继续处理
```

`computePromptCombinations` 不需要改动——它在 `extractVariableGroups` 之后运行，看到的就是标准的 `{{...}}` 格式。

### 1.7 边界情况

- **展开结果为空**：显示 toast "无法解析，请修改描述后重试"
- **展开结果只有 1 个值**：合法但不推荐——提示用户"只生成了 1 个值，建议增加多样性"（去掉 `{*...*}` 直接写固定值更好）
- **超长描述**：限制输入 200 字符
- **API 调用失败**：回退到保留 `{*...*}` 原文不展开，提示错误
- **中文描述**：LLM 可以处理中英文混合，不做限制

---

## 2. 实时组合数预览增强

当前：已有"Variants: N"显示。增强：

- 在 textarea 下方实时显示 "X 个变量组 · Y 种组合 · 预计消耗 Z credits"
- 如果组合数 > 100，黄色警告"组合数较多，建议减少变量值"
- 如果组合数 > 500，红色警告 + 限制生成（需要确认）

**工期**：0.5 天。

---

## 3. 实施路线图

### 3.1 Phase 1：第 1 周 | 核心功能

| 任务                                            | 涉及文件                              | 工期   |
| ----------------------------------------------- | ------------------------------------- | ------ |
| `extractVariableGroups` 扩展支持 `{*...*}` 解析 | `utils.ts` — 新增 `expandAiVariables` | 0.5 天 |
| `expandAiVariables` 实现（LLM 调用 + KV 缓存）  | 新路由 `/api/expand-vars.ts`          | 2 天   |
| Expand 按钮 + 交互（展开/撤销/重试）            | `GeneratorCard.tsx`                   | 1 天   |
| 实时组合数预览增强                              | `GeneratorCard.tsx`                   | 0.5 天 |

**交付物**：`{*...*}` AI 展开可用。

### 3.2 Phase 2：第 2 周 | 打磨

| 任务                                          | 涉及文件                       | 工期   |
| --------------------------------------------- | ------------------------------ | ------ |
| KV 缓存预热（预计算 100 个常见描述）          | 脚本                           | 0.5 天 |
| AI 展开结果质量调优（few-shot prompt tuning） | `expand-vars.ts`               | 1 天   |
| 单元测试                                      | `utils.logic.test.ts` + 新测试 | 1 天   |

---

## 4. 验证方案

1. **基本 `{*...*}` 展开**：
   - 输入 `A {*three colors*} background`
   - 点击 Expand → 确认 `{*three colors*}` 被替换为 `{{red, yellow, blue}}`（或类似的 3 个颜色）
   - 再点一次 Expand → 可能得到不同结果（temperature=0.7）

2. **混用语法**：
   - 输入 `A {*3 dog breeds*} in a {{forest, beach}} setting`
   - 点击 Expand → 确认 AI 展开部分被替换
   - Generate → 确认生成 3 × 2 = 6 张图

3. **多个 `{*...*}` 块**：
   - 输入 `{*2 styles*} watch with {*3 materials*} strap`
   - 确认两个块各自展开
   - 确认 2 × 3 = 6 种组合

4. **KV 缓存**：
   - 第一次展开"three colors" → API 调用
   - 第二次展开相同的 → 读 KV 缓存，无 API 调用（检查日志确认）
