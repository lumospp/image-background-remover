/**
 * Public readiness probe. It does not reveal credentials, database identifiers,
 * account data, or upstream API usage; and does not consume remove.bg credits.
 */
export async function onRequestGet({ env }) {
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
  };

  if (!env?.REMOVE_BG_API_KEY || !env?.DB) {
    return new Response('unavailable', { status: 503, headers });
  }

  try {
    // SQLite throws if the required table/binding does not exist.
    await env.DB.prepare('SELECT used FROM usage_counters LIMIT 1').first();
    return new Response('ready', { status: 200, headers });
  } catch {
    return new Response('unavailable', { status: 503, headers });
  }
}
