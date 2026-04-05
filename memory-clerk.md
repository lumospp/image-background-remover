---
name: 抠图网站
description: AI编程出海第一个产品，Stable v2已确认，v3添加Clerk认证
type: project
date: 2026-03-26
updated: 2026-04-03
---

## 项目概述

- **产品名称**: Image Background Remover
- **定位**: 面向国外小电商卖家的AI抠图工具
- **技术栈**: Next.js (static export) + Cloudflare Pages + Remove.bg API + Clerk

## 当前状态

- **Stable v2 URL**: https://ea928447.image-bg-remover-21c.pages.dev/
- **v3 (Clerk认证)**: 代码已集成，先生需提供Clerk Key激活
- **状态**: v3 build通过，待部署，先生需：
  1. 注册 Clerk 账号并创建 App
  2. 在 Clerk Dashboard 启用 Google 登录
  3. 填入 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` 环境变量
  4. 重新部署

## 版本记录

| 版本 | 日期 | 说明 |
|------|------|------|
| Stable v2 | 2026-04-03 | Claude Code重构，先生满意 |
| v3 (Clerk) | 2026-04-03 | 添加Google登录+历史记录，build通过 |

## Clerk 集成详情

### 安装的包
- `@clerk/nextjs@5.7.5` (兼容 Next.js 14)
- `@clerk/react` (已安装)

### 修改的文件
- `pages/_app.tsx` - ClerkProvider 动态加载（支持 static export）
- `pages/index.tsx` - 登录按钮 + 历史记录功能
- `components/result-view.tsx` - 添加 onDownload 回调
- `.env.local.example` - Clerk Key 说明

### 登录后历史记录
- 使用 localStorage 存储，key = `bg-history-{userId}`
- 最多保存50条
- 历史记录支持下载

### 先生需要做的事
1. 注册 https://dashboard.clerk.com/
2. 创建 Application → 选择 Google 登录
3. 复制 Publishable Key
4. 在 Cloudflare Pages 环境变量中添加 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
5. 重新部署

## 决策记录

- Clerk 作为认证服务（训练营标准）
- history 使用 localStorage（简单方案，无需后端）
- ClerkProvider 使用 dynamic import 支持 static export

## 技术细节

- Remove.bg API Key: Cloudflare Pages Dashboard secret
- Clerk Publishable Key: Cloudflare Pages 环境变量
- Cloudflare Pages 部署 (static export from Next.js)
- GitHub仓库: lumospp/image-background-remover
