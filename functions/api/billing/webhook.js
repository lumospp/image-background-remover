import { apiJson } from '../../../lib/server/http.js';
import { verifyStripeWebhookSignature } from '../../../lib/server/stripe.js';

export async function onRequestPost({ request, env }) {
  if (!env?.DB || !env?.STRIPE_TEST_WEBHOOK_SECRET?.startsWith('whsec_')) {
    return apiJson({ error: 'Webhook is not configured' }, 503);
  }
  const length = Number(request.headers.get('Content-Length') || 0);
  if (!Number.isSafeInteger(length) || length > 262144) return apiJson({ error: 'Payload too large' }, 413);

  let raw;
  try {
    raw = await request.text();
    if (new TextEncoder().encode(raw).length > 262144) return apiJson({ error: 'Payload too large' }, 413);
  } catch {
    return apiJson({ error: 'Invalid payload' }, 400);
  }

  let verified = false;
  try {
    verified = await verifyStripeWebhookSignature(raw, request.headers.get('Stripe-Signature'), env.STRIPE_TEST_WEBHOOK_SECRET);
  } catch {
    return apiJson({ error: 'Unable to verify webhook' }, 503);
  }
  if (!verified) return apiJson({ error: 'Invalid Stripe signature' }, 400);

  let event;
  try { event = JSON.parse(raw); } catch { return apiJson({ error: 'Invalid event JSON' }, 400); }
  if (!event || event.livemode !== false || typeof event.id !== 'string' || !event.id.startsWith('evt_')) {
    return apiJson({ error: 'Live or malformed events are not supported' }, 400);
  }
  if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) {
    return apiJson({ received: true });
  }
  const session = event.data?.object;
  if (!session || !session.id?.startsWith('cs_test_') ||
      session.livemode !== false || session.payment_status !== 'paid' ||
      session.mode !== 'payment' || typeof session.client_reference_id !== 'string') {
    return apiJson({ error: 'Unexpected checkout state' }, 400);
  }

  try {
    const order = await env.DB.prepare(
      'SELECT user_id, credits, status FROM sandbox_checkout_orders WHERE stripe_session_id=?'
    ).bind(session.id).first();
    if (!order) {
      return apiJson({ error: 'Checkout order is not yet available' }, 503);
    }
    if (order.user_id !== session.client_reference_id || order.credits !== 5) {
      return apiJson({ error: 'Checkout integrity mismatch' }, 400);
    }
    const createdAt = Math.floor(Date.now()/1000);
    // Unique source_ref makes retries and concurrent events idempotent.
    await env.DB.prepare(
      "INSERT OR IGNORE INTO sandbox_credit_ledger (entry_id, user_id, delta, kind, source_ref, created_at) " +
      "VALUES (?, ?, ?, 'test_checkout', ?, ?)"
    ).bind('test-checkout:' + session.id, order.user_id, order.credits, session.id, createdAt).run();
    await env.DB.prepare(
      "UPDATE sandbox_checkout_orders SET status='paid', paid_at=COALESCE(paid_at, ?) " +
      "WHERE stripe_session_id=? AND status='pending'"
    ).bind(createdAt, session.id).run();
    await env.DB.prepare(
      'INSERT OR IGNORE INTO sandbox_webhook_events (stripe_event_id, type, received_at) VALUES (?, ?, ?)'
    ).bind(event.id, event.type, createdAt).run();
    return apiJson({ received: true });
  } catch {
    return apiJson({ error: 'Unable to record test payment' }, 503);
  }
}
