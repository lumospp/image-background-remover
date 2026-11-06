export function apiJson(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
      ...headers,
    },
  });
}

export function requireSameOriginPost(request) {
  if (request.method !== 'POST') return false;
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) return false;
  return request.headers.get('Sec-Fetch-Site') !== 'cross-site';
}

export async function parseSmallJson(request, maxBytes = 16000) {
  const length = Number(request.headers.get('Content-Length') || 0);
  if (!Number.isSafeInteger(length) || length > maxBytes) throw new Error('Request too large');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) throw new Error('Request too large');
  return JSON.parse(raw);
}
