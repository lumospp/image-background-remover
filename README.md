# Image Background Remover

使用 AI 一键移除图片背景的网站。

## 技术栈

- **前端**: React + Vite + Tailwind CSS
- **后端**: Cloudflare Worker (API代理)
- **AI服务**: Remove.bg API

## 部署到 Cloudflare

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

在 `wrangler.toml` 或 Cloudflare Dashboard 中设置 `REMOVE_BG_API_KEY` 环境变量。

### 3. 部署

```bash
# 构建前端
npm run build

# 部署到 Cloudflare Pages
npx wrangler pages deploy dist
```

### 4. 配置域名（可选）

在 Cloudflare Dashboard 中绑定自定义域名。

## 本地开发

```bash
npm run dev
```

访问 http://localhost:5173

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_API_URL` | API地址，默认 `/api` |

## Remove.bg API Key

1. 访问 https://www.remove.bg/api
2. 注册账号获取免费 API Key（每月50次）
3. 将 Key 设置到 Cloudflare Worker 环境变量中

## 项目结构

```
image-bg-remover/
├── src/
│   ├── App.jsx          # 主组件
│   ├── main.jsx         # 入口
│   ├── index.css        # 全局样式
│   ├── components/
│   │   ├── DropZone.jsx # 上传组件
│   │   └── Result.jsx   # 结果展示
│   └── lib/
│       └── api.js       # API调用
├── functions/
│   └── [[catchall]].js  # Cloudflare Worker
├── public/
├── package.json
├── vite.config.js
├── tailwind.config.js
└── wrangler.toml
```

## License

MIT
# Image Background Remover
