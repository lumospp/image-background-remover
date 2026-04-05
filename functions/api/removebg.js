/**
 * Cloudflare Worker - Remove.bg API Proxy
 * 改进版: 超时 + 重试 + 文件验证 + D1 用户配额
 * 
 * 环境变量:
 * - REMOVE_BG_API_KEY: Remove.bg API Key (在 Cloudflare Pages Dashboard 设置为 secret)
 * - DB: D1 Database binding (可选，回退到 IP 配额)
 */

const FREE_DAILY_QUOTA = 50

// 超时 wrapper
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout (30s)')), ms)
    ),
  ])

// 重试 wrapper (指数退避)
const withRetry = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise((r) => setTimeout(r, 2 ** i * 1000))
    }
  }
}

// 解码 JWT payload
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload
  } catch {
    return null
  }
}

export async function onRequest({ request, env }) {
  // 只允许 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- 安全检查: API Key ---
  const apiKey = env.REMOVE_BG_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- 获取用户 ID (从 Authorization header) ---
  const authHeader = request.headers.get('Authorization') || ''
  let userId = null
  let userUsageCount = 0

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const payload = decodeJwtPayload(token)
    if (payload && payload.sub) {
      userId = payload.sub
    }
  }

  // --- 文件大小限制 (10MB) ---
  const contentLength = parseInt(request.headers.get('content-length') || '0')
  if (contentLength > 10 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- 配额检查 (D1 或 IP) ---
  if (env.DB && userId) {
    // D1 用户配额检查
    const user = await env.DB
      .prepare('SELECT usage_count FROM users WHERE google_id = ?')
      .bind(userId)
      .first()

    if (user) {
      userUsageCount = user.usage_count || 0
      if (userUsageCount >= FREE_DAILY_QUOTA) {
        return new Response(
          JSON.stringify({ error: `Daily quota exceeded. Limit: ${FREE_DAILY_QUOTA}/day. Please try again tomorrow.` }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
  } else {
    // 回退到 IP 配额 (Cloudflare KV)
    const kv = env.QUOTA_KV
    if (kv) {
      const ip = request.headers.get('CF-Connecting-IP') || 'anonymous'
      const today = new Date().toISOString().slice(0, 10)
      const quotaKey = `quota:${ip}:${today}`
      const used = parseInt((await kv.get(quotaKey)) || '0')
      if (used >= FREE_DAILY_QUOTA) {
        return new Response(
          JSON.stringify({ error: `Daily quota exceeded. Limit: ${FREE_DAILY_QUOTA}/day` }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
  }

  // --- 解析请求体 ---
  let imageFile
  try {
    const formData = await request.formData()
    imageFile = formData.get('image')
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!imageFile) {
    return new Response(JSON.stringify({ error: 'No image provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- 类型验证 ---
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(imageFile.type)) {
    return new Response(
      JSON.stringify({ error: 'Invalid file type. Use JPEG, PNG, or WebP' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // --- 构建 Remove.bg 请求 ---
  const removeBgFormData = new FormData()
  removeBgFormData.append('image_file', imageFile)
  removeBgFormData.append('size', 'regular')

  // --- 调用 Remove.bg ---
  let removeBgResponse
  try {
    removeBgResponse = await withRetry(() =>
      withTimeout(
        fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': apiKey },
          body: removeBgFormData,
        }),
        30000
      )
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: `API call failed: ${err.message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!removeBgResponse.ok) {
    const errorText = await removeBgResponse.text()
    return new Response(
      JSON.stringify({ error: `Remove.bg API error: ${errorText}` }),
      { status: removeBgResponse.status, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // --- 配额扣减 ---
  if (env.DB && userId) {
    await env.DB
      .prepare('UPDATE users SET usage_count = usage_count + 1 WHERE google_id = ?')
      .bind(userId)
      .run()
  } else if (env.QUOTA_KV) {
    const kv = env.QUOTA_KV
    const ip = request.headers.get('CF-Connecting-IP') || 'anonymous'
    const today = new Date().toISOString().slice(0, 10)
    const quotaKey = `quota:${ip}:${today}`
    const used = parseInt((await kv.get(quotaKey)) || '0')
    await kv.put(quotaKey, String(used + 1), { expirationTtl: 86400 })
  }

  const blob = await removeBgResponse.blob()
  return new Response(blob, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  })
}
