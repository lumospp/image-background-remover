# Google login + Stripe TEST MODE practice

This is a learning exercise, not a live paid product. **Never add live Stripe keys**. Checkout uses a one-time test purchase, not a subscription. Existing anonymous image processing and quotas remain unchanged.

## Architecture

- Next.js uses static export. Google Identity Services runs in browser; Cloudflare Pages Functions verify the signed RS256 Google ID token, aud, iss, expiration and identity before creating a session.
- A random session token is stored only as a SHA-256 hash in D1. Browser session cookie is HttpOnly, Secure, SameSite=Lax, seven days.
- Stripe hosts the checkout. The server accepts only sk_test keys and server-side configured price and credits.
- Raw Stripe webhook payload must pass Stripe-Signature HMAC verification within a five-minute timestamp tolerance. A paid test Checkout Session matching a stored order grants exactly five demo credits, idempotently.
- Demo credits are practice bookkeeping; they do **not** unlock extra Remove.bg requests. Anonymous free usage stays limited to 3 per IP daily and 40 total upstream attempts per month.

## Configure once

1. Apply migration **migrations/0002_auth_stripe_sandbox.sql** to remote Cloudflare D1 database **bg-remover-db** (additive, leaves original quotas unchanged).
2. In Google Cloud Console, create an OAuth Web Client ID, configure Google Auth Platform consent, and add **https://lyhimageremovebg.shop** as an Authorized JavaScript Origin. Client ID may be displayed publicly.
3. In Stripe Dashboard choose **Test Mode** and create a single, non-recurring test Product with a one-time Price. Copy the ID beginning with price_. Create a Webhook endpoint pointing to **https://lyhimageremovebg.shop/api/billing/webhook** and subscribe to checkout.session.completed (optional: checkout.session.async_payment_succeeded). Copy that endpoint's whsec_ signing secret.
4. In Cloudflare Pages project **image-bg-remover-review-2026** → Settings → Variables and Secrets → Production, add these entries:
   - GOOGLE_CLIENT_ID = Google OAuth Web Client ID, plain text.
   - STRIPE_TEST_SECRET_KEY = sk_test_..., secret.
   - STRIPE_TEST_PRICE_ID = price_..., plain text.
   - STRIPE_TEST_WEBHOOK_SECRET = whsec_..., secret.
   - Optional SITE_URL = https://lyhimageremovebg.shop, plain text.
5. Redeploy from current GitHub main so new environment variables are loaded. Never send keys through chat, issues or commits.
6. Test Google login, then Stripe TEST checkout using a Stripe test card (4242 4242 4242 4242, future expiration and CVC). Confirm Stripe's webhook delivery is HTTP 200, then refresh account: +5 **sandbox credits**. Resend the same Stripe event and verify no duplicate credit.
7. Sign out, sign in again and check existing balance persists.

## API

- GET /api/auth/config — public Google Client ID and test feature flags (no secrets)
- POST /api/auth/login — cryptographic Google ID token verification and session creation
- POST /api/auth/logout — destroy session and clear HttpOnly cookie
- GET /api/me — authenticated user and test ledger balance
- POST /api/billing/checkout — logged-in, one-time Test Checkout
- POST /api/billing/webhook — signature verification, paid test session and replay-safe ledger entry

## Explicit boundaries

- Missing configuration => fail closed; login button hidden until Google configured. Existing anonymous uploads still work.
- This does not support subscriptions, live charges, live credit consumption, refund/chargeback reconciliation, tax/VAT, billing support or real payouts. Production monetization needs those plus capacity and unit-economics validation.
- D1 stores Google subject ID, email, display name, hashed session identifiers, sandbox checkout orders and sandbox credit ledger. Update Privacy page accordingly.
- Stripe Live key prefixes are rejected. Checkout does not accept the client-side price, amount, currency or requested credits.
