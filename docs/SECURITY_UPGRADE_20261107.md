# Next.js 16 security maintenance (2026-11-07)

## Purpose
- Replace unsupported Next.js 14.2.5 with currently supported stable 16.4.5.
- Preserve Pages Router static export + Cloudflare Pages Functions; do not migrate to a server framework or remove the public domain.
- Remove unused legacy Vite, old Clerk login UI, Radix components and checked-in dist/.
- Retain D1 atomic quota and secret binding, and request only preview-size PNG from remove.bg.
- Add Origin/Fetch Metadata checks to prevent drive-by cross-site form uploads.

## Release gate
- Lockfile regenerated in an isolated Cloudflare build environment and committed to this branch.
- npm ci, regression tests, TS typecheck, Next.js static export, and dependency audit reviewed.
- Cloudflare preview site inspected before merging to main; rollback remains available from previous production deployments.

## Known constraints
- remove.bg currently supplies 50 free low-resolution API calls per month, not unlimited high-resolution processing.
- Existing global allowance remains capped at 40 upstream attempts/month for safety.
- Current user-facing design has already been refreshed; this maintenance PR is intentionally not a redesign.

## Verified in the isolated Cloudflare Pages build

- Next.js 16.4.5, React 18.3.x, Node 22.
- 12 regression tests pass; TypeScript typecheck and static export pass.
- npm audit --omit=dev --audit-level=high reports **0 vulnerabilities** after dependency lock refresh.
- package-lock.json contains 142 package entries, is regenerated from the official npm registry and does not reference third-party mirrors.
- Temporary lockfile emission script and build overrides are removed before production merge.
