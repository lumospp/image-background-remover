import { apiJson } from './http.js';

const COOKIE_NAME = '__Host-lhy_session';
const SESSION_SECONDS = 7 * 24 * 3600;
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function decodeBase64url(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('Invalid token encoding');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(raw, ch => ch.charCodeAt(0));
}

function jsonPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64url(value)));
}

/**
 * Google GIS ID-token verification is cryptographic, never payload-only.
 * Checks Google RS256 signature against rotating Google JWKs, aud, iss, exp,
 * iat, subject and verified email. Not used as a long-lived application token.
 */
export async function verifyGoogleIdToken(idToken, clientId) {
  if (!clientId || typeof idToken !== 'string' || idToken.length > 12000) throw new Error('Login is not configured');
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid Google token');
  const header = jsonPart(parts[0]);
  const claims = jsonPart(parts[1]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) throw new Error('Unsupported Google signing key');

  const jwksResponse = await fetch(GOOGLE_JWKS_URL, { headers: { Accept: 'application/json' } });
  if (!jwksResponse.ok) throw new Error('Google key verification is temporarily unavailable');
  const jwks = await jwksResponse.json();
  const jwk = Array.isArray(jwks.keys) ? jwks.keys.find(k => k.kid === header.kid && k.kty === 'RSA' && k.use === 'sig' && k.alg === 'RS256') : null;
  if (!jwk) throw new Error('Unrecognized Google signing key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const signed = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeBase64url(parts[2]), signed);
  if (!valid) throw new Error('Invalid Google signature');

  const now = Math.floor(Date.now() / 1000);
  if ((claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') ||
      claims.aud !== clientId ||
      !Number.isInteger(claims.exp) || claims.exp <= now ||
      !Number.isInteger(claims.iat) || claims.iat > now + 120 ||
      (claims.nbf != null && claims.nbf > now + 120) ||
      typeof claims.sub !== 'string' || !/^[0-9]{8,64}$/.test(claims.sub) ||
      claims.email_verified !== true) {
    throw new Error('Google identity claims could not be verified');
  }
  return {
    id: claims.sub,
    email: typeof claims.email === 'string' ? claims.email.slice(0, 320) : '',
    name: typeof claims.name === 'string' ? claims.name.slice(0, 120) : 'Google user',
  };
}

export function cookieHeader(token, maxAge = SESSION_SECONDS) {
  // __Host- requires HTTPS, no Domain attribute, Path=/ and Secure.
  return COOKIE_NAME + '=' + token + '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=' + maxAge;
}

export function clearSessionCookie() {
  return cookieHeader('', 0);
}

export async function createUserSession(db, user) {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    'INSERT INTO auth_users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ' +
    'ON CONFLICT(id) DO UPDATE SET email=excluded.email, display_name=excluded.display_name, updated_at=excluded.updated_at'
  ).bind(user.id, user.email, user.name, now, now).run();
  await db.prepare(
    'INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(hash, user.id, now, now + SESSION_SECONDS).run();
  return token;
}

export function sessionCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)__Host-lhy_session=([a-f0-9]{64})(?:;|$)/);
  return match?.[1] || null;
}

export async function getAuthenticatedUser(request, env) {
  if (!env?.DB) return null;
  const token = sessionCookie(request);
  if (!token) return null;
  const hash = await sha256Hex(token);
  const row = await env.DB.prepare(
    'SELECT u.id, u.email, u.display_name AS name FROM auth_sessions s ' +
    'JOIN auth_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?'
  ).bind(hash, Math.floor(Date.now()/1000)).first();
  return row || null;
}

export async function destroySession(request, env) {
  const token = sessionCookie(request);
  if (token && env?.DB) {
    const hash = await sha256Hex(token);
    await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(hash).run();
  }
}

export function configResponse(env) {
  return apiJson({
    googleClientId: typeof env?.GOOGLE_CLIENT_ID === 'string' ? env.GOOGLE_CLIENT_ID : null,
    stripeTestEnabled: Boolean(
      env?.STRIPE_TEST_SECRET_KEY?.startsWith('sk_test_') &&
      env?.STRIPE_TEST_PRICE_ID?.startsWith('price_') &&
      env?.STRIPE_TEST_WEBHOOK_SECRET?.startsWith('whsec_')
    ),
    demoCreditsPerPurchase: 5,
  });
}
