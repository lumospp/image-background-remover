# CLAUDE.md - BG Remover Project

## Project Overview

- **Product**: Image Background Remover (lyhimageremovebg.shop)
- **Target**: E-commerce sellers, photographers (US market)
- **Stack**: Next.js 14 (static export) + Cloudflare Pages + Cloudflare Workers + D1 + Remove.bg API + Google Identity Services
- **GitHub**: lumospp/image-background-remover

---

## Tech Stack Details

### Frontend
- Next.js 14 with static export (`next build && next export`)
- Tailwind CSS + Radix UI components
- Vite preview for local dev
- Key files:
  - `pages/index.tsx` — Landing page (unauthenticated, free tier)
  - `src/App.jsx` — Full app with Google login + batch processing (Vite entry)
  - `functions/api/removebg.js` — Cloudflare Worker proxy to Remove.bg
  - `functions/api/auth.js` — Google OAuth handler → D1 user storage
  - `schema.sql` — D1 user table schema

### Backend (Cloudflare Workers)
- `/api/removebg` — Proxy to Remove.bg, handles quota (D1 user or IP-based)
- `/api/auth` — Decode Google JWT, upsert user in D1

### Environment Variables (set in Cloudflare Pages Dashboard)
```
VITE_GOOGLE_CLIENT_ID=233236227627-lv1kb5855huilcvmdampskmn6sf6fesp.apps.googleusercontent.com
REMOVE_BG_API_KEY=... (secret)
```

---

## Workflow Rules (GSD-Inspired)

### 1. Spec First
Before any code change, write/update SPEC.md with:
- What changed
- Why it changed
- Acceptance criteria (how to verify it works)

### 2. Context Windows
This project is small but auth adds complexity. Keep context clean:
- Max 3 files open at once
- If context gets thick, `/clear` and re-read only what you need
- Use `find` + grep instead of opening every file

### 3. Quality Gates
Before marking a task done:
- [ ] Build passes (`npm run build`)
- [ ] Dev server runs without errors
- [ ] Manual smoke test (upload an image)
- [ ] No console errors

### 4. File Organization
```
/
├── pages/           # Next.js routes (landing, SSG-compatible)
│   ├── _app.tsx     # Minimal, no Clerk
│   └── index.tsx    # Landing page
├── src/             # Vite + React app (Google login version)
│   ├── App.jsx      # Main app component
│   ├── components/  # DropZone, Result, BatchQueue
│   └── lib/api.js   # removeBackground() function
├── functions/       # Cloudflare Workers
│   └── api/
│       ├── removebg.js
│       └── auth.js
├── dist/            # Built static output (gitignored, deployed to Pages)
├── schema.sql       # D1 user table
└── wrangler.toml    # Worker + D1 bindings
```

### 5. Deployment
```bash
# Build static export
npm run build:export   # next build && next export → ./out/

# Preview locally
npm run preview        # vite preview ./out/

# Deploy (Cloudflare Pages)
# Push to GitHub main → auto-deploys
# Or manual: npx wrangler pages deploy ./out/
```

### 6. Auth Flow
1. User clicks "Sign in with Google" → Google Identity Services GIS popup
2. Frontend gets JWT credential
3. POST `/api/auth` with credential → D1 upsert user → return user + usageCount
4. All subsequent API calls include `Authorization: Bearer <credential>`
5. Worker checks D1 quota before calling Remove.bg

### 7. Common Tasks

**Add a new UI component:**
1. Create in `components/ui/` with Tailwind + Radix
2. Import in `pages/index.tsx` or `src/App.jsx`
3. Test with `npm run preview`

**Change API logic:**
1. Edit `functions/api/removebg.js` or `functions/api/auth.js`
2. Test via: `curl -X POST http://localhost:8787/api/removebg -F "image=@photo.jpg"`
3. Deploy via GitHub push

**Add environment variable:**
1. Set in Cloudflare Pages Dashboard → Settings → Environment Variables
2. For secrets: Settings → Variables → Reveal and add

---

## Project-Specific Rules

### Remove.bg Quota
- Free tier: 50 requests/day per user (D1) or per IP (KV fallback)
- Worker checks quota before calling Remove.bg API
- Returns 429 when exceeded

### Google Login (GIS)
- Client ID already configured: `233236227627-lv1kb5855huilcvmdampskmn6sf6fesp.apps.googleusercontent.com`
- GIS script loaded from `https://accounts.google.com/gsi/client`
- JWT decoded server-side in `auth.js`, no client secret needed

### Static Export Constraints
- No `getServerSideProps` / `getStaticProps`
- `_app.tsx` must be minimal (no ClerkProvider SSR)
- Auth state from `localStorage` + server `/api/auth` roundtrip

---

## Verification Commands
```bash
npm run build:export   # Build static site
npm run preview        # Preview ./out/ with Vite
curl -s http://localhost:8787/api/removebg  # Test worker locally
```
