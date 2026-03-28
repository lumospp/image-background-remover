/**
 * Cloudflare Worker - Remove.bg API Proxy
 * 改进版: 超时 + 重试 + 文件验证 + 后端配额
 * 
 * 环境变量:
 * - REMOVE_BG_API_KEY: Remove.bg API Key (必须在 Cloudflare Pages Dashboard 设置为 secret)
 * - QUOTA_KV: Cloudflare KV Namespace for quota tracking (可选)
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
      await new Promise((r) => setTimeout(r, 2 ** i * 1000)) // 1s, 2s, 4s
    }
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

  // --- 文件大小限制 (10MB) ---
  const contentLength = parseInt(request.headers.get('content-length') || '0')
  if (contentLength > 10 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- 配额检查 (Cloudflare KV) ---
  const ip = request.headers.get('CF-Connecting-IP') || 'anonymous'
  const kv = env.QUOTA_KV
  const today = new Date().toISOString().slice(0, 10)
  const quotaKey = `quota:${ip}:${today}`

  if (kv) {
    const used = parseInt((await kv.get(quotaKey)) || '0')
    if (used >= FREE_DAILY_QUOTA) {
      return new Response(
        JSON.stringify({ error: `Daily quota exceeded. Limit: ${FREE_DAILY_QUOTA}/day` }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
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
  removeBgFormData.append('size', 'regular') // 费用优化: 用 regular 而非 auto

  // --- 调用 Remove.bg (超时 30s + 重试 3 次) ---
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
  if (kv) {
    const used = parseInt((await kv.get(quotaKey)) || '0')
    await kv.put(quotaKey, String(used + 1), { expirationTtl: 86400 })
  }

  const blob = await removeBgResponse.blob()
  return new Response(blob, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  })
}
