/**
 * Stripe test-only helpers. A live secret is never accepted by this project.
 * The checkout UI is Stripe-hosted; no card details reach Pages Functions.
 */
export const SANDBOX_CREDITS = 5;

export function stripeTestReady(env) {
  return Boolean(
    env?.STRIPE_TEST_SECRET_KEY?.startsWith('sk_test_') &&
    env?.STRIPE_TEST_PRICE_ID?.startsWith('price_') &&
    env?.STRIPE_TEST_WEBHOOK_SECRET?.startsWith('whsec_')
  );
}

function hexToBytes(hex) {
  if (!/^[a-f0-9]{64}$/i.test(hex)) return null;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function verifyStripeWebhookSignature(rawBody, signatureHeader, webhookSecret, now = Math.floor(Date.now()/1000)) {
  if (typeof signatureHeader !== 'string' || !webhookSecret?.startsWith('whsec_')) return false;
  const items = signatureHeader.split(',').map(s => s.trim().split('='));
  const timestamp = items.find(([k]) => k === 't')?.[1];
  const seconds = Number(timestamp);
  if (!/^\d{10,}$/.test(timestamp || '') || !Number.isSafeInteger(seconds) || Math.abs(now - seconds) > 300) return false;
  const signatures = items.filter(([k]) => k === 'v1').map(([, val]) => hexToBytes(val || '')).filter(Boolean);
  if (!signatures.length) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(timestamp + '.' + rawBody)));
  return signatures.some(expected => {
    let difference = 0;
    for (let i = 0; i < 32; i++) difference |= expected[i] ^ signed[i];
    return difference === 0;
  });
}

export function stripeApiParams(priceId, user, siteUrl) {
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('payment_method_types[0]', 'card');
  form.set('line_items[0][price]', priceId);
  form.set('line_items[0][quantity]', '1');
  form.set('client_reference_id', user.id);
  form.set('metadata[account_user_id]', user.id);
  form.set('metadata[practice_only]', 'true');
  form.set('customer_email', user.email);
  form.set('success_url', siteUrl + '?checkout=returned');
  form.set('cancel_url', siteUrl + '?checkout=cancelled');
  return form;
}
