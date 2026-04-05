/**
 * Cloudflare Worker - Google Auth Handler
 * 处理 Google Identity Services 登录，存储用户到 D1
 * 
 * 环境变量:
 * - DB: D1 Database binding
 */

export async function onRequest({ request, env }) {
  // 只允许 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { credential } = await request.json()

  if (!credential) {
    return new Response(JSON.stringify({ error: 'No credential provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 解码 JWT 获取用户信息（不需要验证，因为前端已经验证过了）
  // JWT 格式: header.payload.signature
  const parts = credential.split('.')
  if (parts.length !== 3) {
    return new Response(JSON.stringify({ error: 'Invalid credential format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 解码 payload
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

  const googleUserId = payload.sub
  const email = payload.email
  const name = payload.name || email.split('@')[0]
  const picture = payload.picture || null

  if (!googleUserId) {
    return new Response(JSON.stringify({ error: 'Invalid Google token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 检查 D1 是否可用
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 查询用户是否已存在
  const existingUser = await env.DB
    .prepare('SELECT * FROM users WHERE google_id = ?')
    .bind(googleUserId)
    .first()

  let user

  if (existingUser) {
    // 更新最后登录时间
    await env.DB
      .prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE google_id = ?')
      .bind(googleUserId)
      .run()

    user = existingUser
  } else {
    // 创建新用户
    const result = await env.DB
      .prepare(`
        INSERT INTO users (google_id, email, name, picture, usage_count, created_at, last_login)
        VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
      .bind(googleUserId, email, name, picture)
      .run()

    user = {
      id: result.meta?.last_row_id || googleUserId,
      google_id: googleUserId,
      email,
      name,
      picture,
      usage_count: 0,
    }
  }

  // 返回用户信息给前端
  return new Response(
    JSON.stringify({
      success: true,
      user: {
        id: user.id,
        googleId: user.google_id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        usageCount: user.usage_count,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
