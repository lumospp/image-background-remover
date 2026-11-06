import { apiJson, requireSameOriginPost } from '../../../lib/server/http.js';
import { destroySession, clearSessionCookie } from '../../../lib/server/auth.js';

export async function onRequestPost({ request, env }) {
  if (!requireSameOriginPost(request)) return apiJson({ error: 'Invalid request origin' }, 403);
  try {
    await destroySession(request, env);
    return apiJson({ authenticated: false }, 200, { 'Set-Cookie': clearSessionCookie() });
  } catch {
    return apiJson({ error: 'Unable to end session' }, 503);
  }
}
