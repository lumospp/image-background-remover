/**
 * Cloudflare Worker - Remove.bg API Proxy
 * 
 * 设置环境变量:
 * - REMOVE_BG_API_KEY: Remove.bg API Key
 */

export async function onRequest({ request }) {
  // 只允许 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = request.env.REMOVE_BG_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const formData = await request.formData()
    const imageFile = formData.get('image')

    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 调用 Remove.bg API
    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    })

    if (!removeBgResponse.ok) {
      const errorText = await removeBgResponse.text()
      return new Response(JSON.stringify({ error: `Remove.bg API error: ${errorText}` }), {
        status: removeBgResponse.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 返回图片
    const blob = await removeBgResponse.blob()
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
