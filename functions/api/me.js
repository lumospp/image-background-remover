import { apiJson } from '../../lib/server/http.js';
import { getAuthenticatedUser } from '../../lib/server/auth.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await getAuthenticatedUser(request, env);
    if (!user) return apiJson({ authenticated: false });
    const row = await env.DB.prepare(
      'SELECT COALESCE(SUM(delta),0) AS credits FROM sandbox_credit_ledger WHERE user_id=?'
    ).bind(user.id).first();
    return apiJson({
      authenticated: true,
      user,
      sandboxCredits: Math.max(0, Number(row?.credits || 0)),
      // Trial bookkeeping only: sandbox credits DO NOT unlock extra remove.bg processing.
      sandboxOnly: true,
    });
  } catch {
    return apiJson({ error: 'Account service temporarily unavailable' }, 503);
  }
}
