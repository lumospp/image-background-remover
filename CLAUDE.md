# CLAUDE.md - BG Remover

> 来源：https://github.com/forrestchang/andrej-karpathy-skills (46.5K stars)
> 基于 Karpathy 观察到的 LLM 编程缺陷，是 forrestchang 总结的 4 条核心原则。

---

## 核心原则

### 1. Think Before Coding
**不要假设。不要隐藏疑惑。说清楚权衡。**

实现之前：
- 明确说出你的假设。不确定的地方，反问。
- 有多种解释时，先呈现，不静默选一个。
- 发现更简单的方案，说出来，有理由就 push back。
- 有不清楚的地方，停下来，说清楚什么不清楚，问。

### 2. Simplicity First
**最小代码解决问题。不加投机性代码。**

- 不加没人要求的功能。
- 不为单次使用的代码建抽象。
- 不加没人要求的"灵活性"或"配置"。
- 不处理不可能发生的错误。
- 200 行能写成 50 行，就重写。

自问："高级工程师会觉得这太复杂吗？"是的话，简化。

### 3. Surgical Changes
**只动该动的地方。只清理自己的烂摊子。**

改代码时：
- 不"顺便"优化相邻代码/注释/格式。
- 不重构没坏的东西。
- 匹配现有风格，哪怕你自己会写得不一样。
- 发现无关的死代码，说出来，不删——除非明确要求。

自己的改动造成的孤儿：移除未使用的 import/变量/函数。但不删已有的死代码，除非明确要求。

验证标准：**每行改动的代码，都能追溯到用户的明确要求。**

### 4. Goal-Driven Execution
**定义成功标准。循环直到验证通过。**

把任务转化为可验证的目标：
- "添加验证" → "为无效输入写测试，然后让它们通过"
- "修 bug" → "写一个复现 bug 的测试，然后让它通过"
- "重构 X" → "确保重构前后测试都通过"

多步骤任务，先声明计划：
```
1. [步骤] → 验证：[检查点]
2. [步骤] → 验证：[检查点]
3. [步骤] → 验证：[检查点]
```

强成功标准让你可以独立循环。弱标准（"让它工作"）需要不断确认。

---

## 判断标准

这些准则在起作用的表现：
- PR 里的 diff 变干净，没有莫名其妙的格式改动
- 代码第一次就足够简单，不用返工
- Claude 开始在动手之前先问问题，而不是假设完直接写
- PR 不再附带一堆顺手重构

---

## 项目适配

### 文件结构
```
/
├── pages/           # Next.js 落地页（未登录用户看到的内容）
├── src/             # Vite + React 完整版（Google 登录 + 批处理）
├── functions/       # Cloudflare Workers
│   └── api/
│       ├── removebg.js   # Remove.bg 代理 + D1 配额
│       └── auth.js       # Google JWT → D1 用户
├── dist/            # 静态构建产物
├── schema.sql       # D1 用户表
└── wrangler.toml    # Worker + D1 绑定
```

### 改动流程
任何代码改动前，先回答：
1. **What** — 改什么？
2. **Why** — 为什么这个改法，不是别的？
3. **Verify** — 怎么验证它是对的？

### 质量门禁
- [ ] `npm run build` 通过
- [ ] `npm run preview` 本地可跑
- [ ] 手动测试：上传一张图片，成功返回透明 PNG
- [ ] 无 console 报错

### 部署
```bash
npm run build:export   # next build && next export → ./out/
npm run preview        # vite preview ./out/
# GitHub push → Cloudflare Pages 自动部署
```

---

## 认证流程（本项目特有关键知识）

1. 用户点击 Google 登录 → GIS popup
2. 前端拿到 JWT credential
3. POST `/api/auth` → D1 upsert 用户 → 返回 user + usageCount
4. 后续请求带 `Authorization: Bearer <credential>`
5. Worker 检查 D1 配额 → 通过才调 Remove.bg

---

**这些准则在起作用的表现：**
- fewer unnecessary changes in diffs
- fewer rewrites due to overcomplication
- clarifying questions come before implementation rather than after mistakes
