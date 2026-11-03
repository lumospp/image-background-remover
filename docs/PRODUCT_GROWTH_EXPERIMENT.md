# LHY/Cutout — first growth and monetization experiment

Date: 2026-11-04. Status: hypothesis, not validation.

## What we know

- The live site had ~588 page views during 2026-10-21 through 2026-11-03 in Cloudflare analytics. That is **not** 588 humans.
- Most raw HTTP requests came from overseas datacenters and suspicious scan paths, not from proven image customers.
- During a checked 8-day window the /api/removebg path returned HTTP 200 only three times; that does **not** prove three paying customers or three genuine successful downloads.
- The tool currently uses limited provider credits and is not equipped for high-volume traffic.

## Hypothesis

A focused audience (small overseas marketplace sellers and lightweight design users) may value a frictionless one-off transparent PNG tool. But remove.bg and many other established competitors already provide this. Generic background removal is a commodity and ranking for the broad term is unlikely to be easy.

## Minimal measurement plan (14 days)

1. Use Cloudflare Analytics to track human-likely HTML pageviews separately from bot-heavy request counts.
2. Use D1 usage_counters (global upstream attempts per UTC month; IP attempts per UTC day) as **proxy operational metrics**, never as a unique-user count.
3. Review 429s, 502s, latency and actual free-credit usage, and track how many useful downloads were reported by real visitors. A future opt-in feedback link could be used to assess quality.
4. Collect at least five independent, concrete user problems: e.g., shop-ready white backgrounds, tricky hair, batch processing or consistent dimensions. Avoid manufacturing reviews or testimonials.
5. Check whether users come back to remove several images, and whether they ask for outputs not readily available from the free incumbents.

## Business model decision gate

- **Do not add paid subscriptions yet.** A backend proxy for remove.bg API credits with a different brand is not a defensible business model by itself.
- A paid feature would be more credible if it solved a particular *workflow*: batch photo optimization for Etsy/Shopify, automatic background + margins + dimensions + filenames + export, for example.
- Price must exceed upstream API cost plus payment fees, support, fraud and refunds at realistic utilization. Revalidate the provider's current credit pricing and commercial terms before making any offer.
- A no-payment MVP could add a local-browser image resizing/export utility first; that adds value without consuming provider credits.
- If legitimate repeat users remain rare after a small SEO/marketing experiment, stop spending time on this tool and focus on another opportunity.

## Suggested next small experiment

Publish an authentic tutorial targeting one concrete use case (for example, a small seller making a white-background listing image), and use observed clicks and successful tasks over 2 weeks as the decision evidence. Avoid mass AI-generated SEO pages and fake before/after examples.

## Engineering priorities

P0: correctness of quota/secret checks and API functionality.
P1: upgrade dependency versions; current Next.js 14.2.5 and npm audit reported 11 dependency vulnerabilities on 2026-11-04 (3 moderate, 6 high, 2 critical). Full audit/advisory mapping is pending.
P1: real mobile accessibility and error handling for paid-provider failure.
P2: user-requested enhancements grounded in recurring tasks.
P3: authentication, subscriptions and billing only after a viable unit-economics model.

This document is intended to be revised with new observations, not treated as product truth.
