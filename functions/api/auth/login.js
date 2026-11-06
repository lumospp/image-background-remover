import { apiJson, requireSameOriginPost, parseSmallJson } from '../../../lib/server/http.js';
import { verifyGoogleIdToken, createUserSession, cookieHeader } from '../../../lib/server/auth.js';

export async function onRequestPost({ request, env }) {
  if (!requireSameOriginPost(request)) return apiJson({ error: 'Invalid request origin' }, 403);
  if (!env?.GOOGLE_CLIENT_ID || !env?.DB) return apiJson({ error: 'Google sign-in is not configured' }, 503);

  let body;
  try {
    body = await parseSmallJson(request);
  } catch {
    return apiJson({ error: 'Invalid sign-in payload' }, 400);
  }

  let user;
  try {
    user = await verifyGoogleIdToken(body.credential, env.GOOGLE_CLIENT_ID);
  } catch {
    return apiJson({ error: 'Google sign-in verification failed' }, 401);
  }

  try {
    const token = await createUserSession(env.DB, user);
    return apiJson({ authenticated: true, user }, 200, { 'Set-Cookie': cookieHeader(token) });
  } catch {
    return apiJson({ error: 'Sign-in is temporarily unavailable' }, 503);
  }
}
