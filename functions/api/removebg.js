/**
 * Cloudflare Pages Function: public background removal, bounded by D1 quotas.
 *
 * All quotas are server-enforced and global across all visitors. No user-supplied
 * identity, Origin, or X-Forwarded-For header grants additional quota.
 * The global counter tracks upstream ATTEMPTS, not just successful responses:
 * this prevents retrying a failing/timeout upstream into an unexpected bill.
 */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILE_BYTES + 128 * 1024;
const MAX_DAILY_PER_IP = 3;
const MAX_MONTHLY_UPSTREAM_CALLS = 40;
const UPSTREAM_TIMEOUT_MS = 25000;

function json(message, status, extraHeaders = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function isValidImage(file, bytes) {
  if (file.type === 'image/png') {
    return bytes.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  }
  if (file.type === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }
  if (file.type === 'image/webp') {
    return bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}

async function hashedIp(ip, secret) {
  // Pseudonymous quota key; raw IP addresses are never written to D1.
  const bytes = new TextEncoder().encode(secret + '\u0000' + ip);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

async function reserve(db, scope, token, period, limit) {
  // A single SQLite statement makes each counter reservation atomic, even
  // under concurrent requests. First insert is also limited to 1 <= limit.
  const row = await db.prepare(
    'INSERT INTO usage_counters (scope, token, period, used) VALUES (?, ?, ?, 1) ' +
    'ON CONFLICT(scope, token, period) DO UPDATE SET used = used + 1 ' +
    'WHERE used < ? RETURNING used'
  ).bind(scope, token, period, limit).first();
  return !!row;
}

async function release(db, scope, token, period) {
  await db.prepare(
    'UPDATE usage_counters SET used = used - 1 ' +
    'WHERE scope = ? AND token = ? AND period = ? AND used > 0'
  ).bind(scope, token, period).run();
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json('Method not allowed', 405, { Allow: 'POST' });
  }

  // Fail closed when a security-critical binding is missing.
  if (!env?.REMOVE_BG_API_KEY || !env?.DB) {
    return json('Image processing is temporarily unavailable', 503);
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    const length = Number(contentLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > MAX_REQUEST_BYTES) {
      return json('Request too large (max image size 10 MB)', 413);
    }
  }

  // Never trust arbitrary user-controlled X-Forwarded-For headers for quota.
  const requestedOrigin = request.headers.get('Origin');
  const requestOrigin = new URL(request.url).origin;
  if (requestedOrigin && requestedOrigin !== requestOrigin) {
    return json('Cross-site uploads are not allowed', 403);
  }
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return json('Cross-site uploads are not allowed', 403);
  }

  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip || ip.length > 64) {
    return json('Unable to verify the request source', 403);
  }

  let image;
  try {
    const form = await request.formData();
    image = form.get('image');
  } catch {
    return json('Invalid image upload', 400);
  }

  if (!image || typeof image.size !== 'number' || typeof image.slice !== 'function' ||
      image.size === 0 || image.size > MAX_FILE_BYTES) {
    return json('An image of up to 10 MB is required', 400);
  }

  const signature = new Uint8Array(await image.slice(0, 12).arrayBuffer());
  if (!isValidImage(image, signature)) {
    return json('Unsupported or invalid image (JPEG, PNG, WebP only)', 415);
  }

  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const month = now.slice(0, 7);
  let ipKey;
  let ipReserved = false;
  try {
    ipKey = await hashedIp(ip, env.REMOVE_BG_API_KEY);
    ipReserved = await reserve(env.DB, 'ip', ipKey, day, MAX_DAILY_PER_IP);
    if (!ipReserved) {
      return json('Free daily limit reached. Please try again tomorrow (UTC).', 429);
    }

    const globalReserved = await reserve(
      env.DB, 'global', 'all', month, MAX_MONTHLY_UPSTREAM_CALLS
    );
    if (!globalReserved) {
      // No upstream attempt was made, so give this visitor their slot back.
      await release(env.DB, 'ip', ipKey, day);
      return json('Free processing capacity is exhausted this month.', 429);
    }
  } catch {
    if (ipReserved) {
      try { await release(env.DB, 'ip', ipKey, day); } catch {}
    }
    return json('Image processing is temporarily unavailable', 503);
  }

  // At this point both quotas are reserved. Deliberately DO NOT refund them
  // after a network error: the upstream may have charged for the attempt.
  const form = new FormData();
  form.append('image_file', image);
  form.append('size', 'preview'); // The free low-resolution API tier.
  form.append('format', 'png');

  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': env.REMOVE_BG_API_KEY },
      body: form,
      signal: abort.signal,
    });
    if (response.status === 402 || response.status === 403) {
      return json('The processing service has no available free capacity. Please try later.', 503);
    }
    if (response.status === 429) {
      return json('The processing service is busy. Please try again later.', 503);
    }
    if (!response.ok || !response.body) {
      return json('Background removal failed. Please try later.', 502);
    }
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (!type.startsWith('image/png')) {
      return json('Image service returned an unexpected response', 502);
    }
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return json('Background removal timed out or failed', 502);
  } finally {
    clearTimeout(timeout);
  }
}
