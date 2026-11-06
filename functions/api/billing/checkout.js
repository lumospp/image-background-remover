import { apiJson, requireSameOriginPost } from '../../../lib/server/http.js';
import { getAuthenticatedUser } from '../../../lib/server/auth.js';
import { SANDBOX_CREDITS, stripeTestReady, stripeApiParams } from '../../../lib/server/stripe.js';

export async function onRequestPost({ request, env }) {
  if (!requireSameOriginPost(request)) return apiJson({ error: 'Invalid request origin' }, 403);
  if (!stripeTestReady(env) || !env?.DB) return apiJson({ error: 'Stripe test checkout is not configured' }, 503);

  let user;
  try { user = await getAuthenticatedUser(request, env); }
  catch { return apiJson({ error: 'Account is temporarily unavailable' }, 503); }
  if (!user) return apiJson({ error: 'Please sign in first' }, 401);

  const siteUrl = typeof env.SITE_URL === 'string' && /^https:\/\/[a-z0-9.-]+\/?$/i.test(env.SITE_URL)
    ? env.SITE_URL.replace(/\/$/, '') + '/'
    : 'https://lyhimageremovebg.shop/';
  const params = stripeApiParams(env.STRIPE_TEST_PRICE_ID, user, siteUrl);
  let checkout;
  try {
    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.STRIPE_TEST_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: params,
    });
    if (!resp.ok) return apiJson({ error: 'Unable to start test checkout' }, 502);
    checkout = await resp.json();
  } catch {
    return apiJson({ error: 'Stripe is temporarily unavailable' }, 502);
  }

  if (typeof checkout?.id !== 'string' || !checkout.id.startsWith('cs_test_') ||
      typeof checkout.url !== 'string' || !checkout.url.startsWith('https://checkout.stripe.com/')) {
    return apiJson({ error: 'Unexpected Stripe test checkout response' }, 502);
  }
  try {
    await env.DB.prepare(
      'INSERT INTO sandbox_checkout_orders (stripe_session_id, user_id, stripe_price_id, credits, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(checkout.id, user.id, env.STRIPE_TEST_PRICE_ID, SANDBOX_CREDITS, 'pending', Math.floor(Date.now()/1000)).run();
  } catch {
    return apiJson({ error: 'Unable to register the test checkout' }, 503);
  }
  return apiJson({ url: checkout.url, sandboxOnly: true });
}
