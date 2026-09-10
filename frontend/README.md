# Vedic Vaibhav — Frontend

Next.js 15 (App Router) + TypeScript (strict) + Tailwind rewrite of the legacy Vite SPA
(`vedic-vaibhav/`). Same design, same URLs — Astro Vaibhav and Vedic Shop code removed.

## Requirements

- Node.js ≥ 20.9
- pnpm 10 (`corepack enable`)

## Setup

```bash
pnpm install
pnpm dev        # http://localhost:3000, talks to the backend on :5009
```

Production:

```bash
pnpm build
pnpm start
```

## Environment system

| File | Committed | Purpose |
| --- | --- | --- |
| `.env.development` | yes | dev config (API on localhost:5009, analytics off) |
| `.env.production` | yes | prod config (live API, GA/Ads/Pixel IDs) |
| `.env.local` | **no** | personal overrides |
| `.env.example` | yes | documented template |

Only `NEXT_PUBLIC_*` variables reach the browser. The backend origin is read exactly once, in
[src/lib/api.ts](src/lib/api.ts) — every request goes through the shared `api` axios instance or
`apiUrl()`. (The legacy app hardcoded `http://localhost:5009` in ~370 places and patched it at
build time; that mechanism is gone.)

## Structure

```
src/
  app/                 # routes — thin server wrappers that own SEO metadata
  components/
    layout/            # Navbar, Footer, Layout shell
    pages/<area>/      # ported page components (client), colocated CSS
    widgets/<area>/    # home/puja/mandir/map/music widget families
    shared/            # LoadingGif, phone inputs, language selector, …
    providers/         # Redux + persisted React Query + i18n + music context
    global/            # GlobalUI: route analytics, Google Translate, popups
  hooks/               # React Query hooks (same names as legacy)
  lib/                 # api client, api modules, query keys, gtag, referral, i18n
  store/               # Redux Toolkit slices (cart, user)
  locales/<lng>/       # 17-language i18n JSON
```

## What changed vs the legacy app (behavior preserved)

- Per-route code splitting + SSR shell via the App Router (replaces manual `React.lazy` walls).
- SEO: `metadata` exports per route, root-level JSON-LD schemas, `robots.ts`, `sitemap.ts`
  (replaces react-helmet + a 700-line index.html).
- Analytics (GA4, Google Ads, Meta Pixel), Google Translate integration, and partner `?ref=`
  capture live in the root layout / `GlobalUI` with env-driven IDs.
- Removed: all `/shop*` e-commerce pages, astrology pages, home chat, MahaKumbh — and the OpenAI
  key that was baked into the client bundle.
