# Production security and deployment notes

## Current production architecture (verified 2026-11-04)

- Site: https://lyhimageremovebg.shop
- Pages project: image-bg-remover (Pages.dev: image-bg-remover-21c.pages.dev).
- Active UI: static **Next.js** export from pages/, not the legacy Vite src/ app.
- The latest successful Pages deployment was 2026-04-02; the 2026-04-16 manual deployment failed.
- Existing Pages project was manually deployed (ad_hoc) and has no confirmed Git source integration. **A push to main does not by itself verify a production deployment.**
- Build: npm ci && npm run build; output: out.
- Production env: secret REMOVE_BG_API_KEY.
- Required runtime D1 binding: DB (database bg-remover-db, schema.sql applied).

## Security boundaries

- The API is public and anonymous; Google sign-in is intentionally disabled until real cryptographic token verification is added.
- An image upload requires a Cloudflare-provided client IP, a valid image signature, and <= 10 MB. Never trust an Authorization header, custom IP header, or client-side quota.
- Before calling remove.bg, it atomically reserves a D1 daily counter per hashed IP (3) and a global monthly counter (40). Global budget counts **upstream attempts**, including failures/timeouts, to bound liability.
- Missing DB or API key => HTTP 503, **never** an unmetered fallback.
- Backend never stores images, raw IPs, or emails in D1. Images are sent to the third-party remove.bg service; don't claim files never leave the browser.
- Remove.bg billing/free allowance is independent of our limits. Check external account balance and set spend alerts or hard limits on the provider if available.
- The 40-call cap is conservative and is not a pricing/monetization strategy. Raise it only after economics and monitoring are validated.
- Cloudflare WAF rate limiting and Turnstile can add bot protection; they do not replace the D1 global budget.

## One-time deployment preparation

1. On the production Cloudflare account, create D1 database bg-remover-db (if it doesn't exist).
2. Apply schema.sql to the remote database and confirm usage_counters exists.
3. Configure the project's **production** D1 binding under the exact name DB. Preview can have its own isolated database or fail closed.
4. Ensure the secret REMOVE_BG_API_KEY exists in production; never commit it.
5. Check Pages build output directory is out, not dist.
6. Run npm ci, npm test and npm run build (CI enforces this).
7. Inspect PR changes and test /api/removebg with a real small PNG. Verify 200 image/png and that quota usage increments; verify 429 after daily limit.
8. Deploy Pages from the tested commit (or connect Pages to GitHub main via Cloudflare dashboard if automatic deployments are desired). Verify the exact deployed SHA.
9. Confirm the custom domain, download functionality, error handling, and monitor worker failures / remove.bg credit balance.
10. To roll back, use Cloudflare Pages deployment rollback to the last known good successful deployment. Do not delete D1 on rollback.

## Explicitly deferred

- Paid subscriptions / payment provider / webhook.
- Google sign-in (existing JWT decoder must not be revived).
- Rewriting legacy Vite code or removing historic source files.
- Client analytics until the privacy implications and measurement goals are agreed.

## Tests

- \`npm test\` — unit tests for fail-closed, invalid images, concurrent-style counter contract, per-IP and global budget, and inactive Google login endpoint.
- \`npm run build\` — static Next.js export into out/.
- Tests mock the network and D1 and do not prove deployed Cloudflare bindings or the provider API are functioning; a live end-to-end smoke test is still mandatory.

## Deployment verification

The connected Cloudflare Pages validation project is `image-bg-remover-review-2026`. It runs `npm ci && npm test && npm run build` against the security branch before the production site is changed. This project is for build validation, not the public custom domain.
