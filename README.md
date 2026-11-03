# LHY / Cutout — Image Background Remover

Production website: https://lyhimageremovebg.shop/

A small anonymous image cutout tool using Next.js static export, Cloudflare Pages Functions, D1 for usage budgets, and the remove.bg API.

## Features

- JPG, PNG and WebP uploads, maximum 10 MB.
- Background-removed PNG generation using remove.bg.
- Transparent, white, dark and custom color backgrounds for preview and PNG download.
- No account required. No permanent app image storage.
- Service-side request budget: 3 attempts per hashed IP per UTC day and 40 global upstream attempts per UTC month.
- Clear third-party data processing disclosure and a /privacy page.

## Development

**The active UI is in pages/ and components/, not the legacy Vite src/ folder.** The historical Vite index.html and src/ are not deployed. Do not deploy dist/.

Install dependencies with `npm ci`, run security regression tests with `npm test`, and build with `npm run build`.

The static export directory is out/. Uploads are handled by Cloudflare Pages Functions under functions/, rather than Next.js API routes. A local Next.js development server alone cannot emulate Cloudflare D1.

## Cloudflare production

- Project: image-bg-remover-review-2026
- Git integration: lumospp/image-background-remover, main branch
- Build command: npm ci && npm test && npm run build
- Output directory: out
- Secret: REMOVE_BG_API_KEY in Production (do not commit)
- D1 binding: DB, using bg-remover-db and the schema in schema.sql
- Readiness endpoint: GET /api/health; returns 'ready' or 'unavailable' without consuming provider credit
- Legacy manual Pages project: image-bg-remover, retained for rollback

Cloudflare builds production automatically when main changes. Changing a secret or database binding may require a fresh deployment.

## Documentation

- docs/PRODUCTION_SECURITY.md — security boundaries, quotas and deployment
- docs/PRODUCT_GROWTH_EXPERIMENT.md — measuring real demand before monetization

The old SOP Vite prototype is retained for historical reference. The working frontend uses Next.js to avoid mixing two incompatible build systems.

## Safety

- Client validation is an early usability check. The server verifies size, image signature and per-IP/global quotas.
- Images travel to remove.bg for processing. This site does not store them in D1 or an object store.
- Never test production by sending large volumes of images.
- Google login and payments are intentionally not enabled.
