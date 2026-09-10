# Vedic Vaibhav — Backend

Express 5 + TypeScript (strict) + Mongoose 8 API server for vedicvaibhav.com and the mobile app.
This is the clean rewrite of the legacy `server/` codebase: Astro Vaibhav and Vedic Shop (e-com)
code is gone; every remaining route keeps its legacy URL, method, and JSON shape, so existing
clients keep working unchanged.

## Requirements

- Node.js ≥ 20.9
- pnpm 10 (`corepack enable`)

## Setup

```bash
pnpm install
cp .env.example .env                                  # holds only NODE_ENV
cp .env.development.example .env.development          # then fill in the test credentials
pnpm dev                                              # NODE_ENV=development, testing databases
```

Production:

```bash
cp .env.production.example .env.production            # then fill in the live credentials
pnpm build
pnpm start                                            # NODE_ENV=production, live databases
```

## Environment system

`.env` contains **one line** — the mode. Every credential lives in the mode file that gets
loaded, so there is exactly one place to look for any given value:

| File | Committed | Purpose |
| --- | --- | --- |
| `.env` | **no** | the mode switch: `NODE_ENV=development` or `NODE_ENV=production`, nothing else |
| `.env.development` | **no** | everything for dev: **testing** Mongo cluster, Razorpay **test** keys, sandbox gateways |
| `.env.production` | **no** | everything for prod: **live** Mongo cluster, Razorpay **live** keys, live gateways |
| `.env.example` | yes | template for `.env` |
| `.env.development.example` | yes | template for `.env.development` — add every new key here too |
| `.env.production.example` | yes | template for `.env.production` — add every new key here too |

Precedence (first hit wins): **process env → `.env` → `.env.<mode>`**. An explicit
`NODE_ENV=... pnpm dev|start` on the command line beats `.env`, and the host's own environment
settings beat everything. The resolved mode is logged at boot
(`NODE_ENV=production → LIVE databases, payments=live, …`).

Both mode files use the **same key names** — `MONGO_URI_VEDIC_VAIBHAV_MAIN` points at the
testing cluster in `.env.development` and the live one in `.env.production`. There is no
`TESTING_` prefix and no live-vs-testing branch in the code: the file that gets loaded *is*
the answer. The same holds for `RAZORPAY_KEY_ID`/`_SECRET` and `PAYMENT_MODE`.

- `NODE_ENV` alone decides partner-affiliate routing: development → `localhost:9001`,
  production → the live engine. (The old `APP_ENV` switch was redundant and is gone.)
- `PAYMENT_MODE` (`test`/`live`) only labels which key set is loaded — it appears in boot logs.

## Payments

**Razorpay is the only payment gateway.** The PhonePe and Easebuzz integrations were removed
entirely — env keys, config, controller code and routes. Removed endpoints:

| Removed route | Module |
| --- | --- |
| `POST /final-payment-phonepe`, `POST /final-payment-phonepe-app` | pooja |
| `GET|POST /payment-status`, `GET|POST /status` | pooja |
| `POST /prasad-booking`, `POST /prasad-booking-for-app`, `GET /prasad-payment-status` | prasad |
| `GET /chadhava/payment-status/:orderID`, `POST /chadhava/phonepe/callback` | chadhava |
| all `/sharadh/*` routes — the module was deleted entirely (see below) | jyotirlinga |
| `gateway=easebuzz` branch of jyotirlinga subscription initiate/verify | jyotirlinga |

Old **mobile app** builds calling the removed `-app` endpoints will get a 404.

`subscription.model.ts` keeps its `provider: "razorpay" | "easebuzz"` field so existing
records stay readable.

### Sharadh module (removed)

The Sharadh / Pitra Dosh pooja module (`shradh.model.ts`, `shradh.controller.ts`,
`shradh.routes.ts`) was deleted. It was PhonePe-only with no Razorpay path, nothing in the
frontend ever called it, and both of its collections (`sharadhBookings`,
`pendingSharadhBookings`) were empty in production — it never took a single booking.

The collections themselves still exist in Mongo and were not touched.

### Death-rituals module (removed)

The death-rituals / Atma Shanti feature was deleted end to end: `src/modules/death-rituals/`,
its five `/death-rituals/*` routes, the `dbDeathRituals` connection and the
`MONGO_URI_DEATH_RITUALS` key, plus the frontend `/services/death-rituals` page and its 19
components. Unlike the Sharadh module above, this one **was live and did take bookings**.

Its database was a separate `death-rituals` Mongo database on the production cluster and was
not touched — the booking history is still there, but nothing in this codebase can read it
any more. `/services/death-rituals` now 307-redirects to `/` rather than 404ing, because the
page was in the sitemap and is indexed.

### Pandit registration module (removed)

The pandit-registration feature was deleted end to end: `src/modules/pandit/`,
`src/utils/uploadPandit.ts`, the `POST /pandit` and `GET /location-suggestions` routes, and on
the frontend the `/pandit-register` page, its form, both footer links and the `PANDITFORM`
translations.

Three things went with it, because that feature was their only consumer:

- **Object storage.** It was the only upload path in the project, so the `S3_*` keys, the
  `env.storage` block, and the `multer-s3` / `@aws-sdk/client-s3` dependencies are all gone.
  Nothing uploads to DigitalOcean Spaces any more; the many hardcoded CDN image URLs across
  the site are read-only and unaffected. (`multer` itself stays — the contact-us form uses
  memory storage to attach files to an email, which never touches S3.)
- **The PanditJiAtRequest database connection** (`dbPanditJiAtRequest`) and its
  `MONGO_URI_PANDIT_JI_AT_REQUEST` key. The backend is down to **4** connections. That
  database and its data are untouched — it belongs to a separate product.
- Note "Pandit Ji at Request" brand promotion in the frontend footer / about page is a
  *different* thing and was deliberately kept, as is `modules/mandir/pandit.model.ts`, the
  prasad Shiprocket pickup contact and now the only Pandit model in the backend.

Everything is validated with zod at boot in [src/config/env.ts](src/config/env.ts) — the server
fails fast naming the missing variable *and* the mode file it belongs in. **Never read
`process.env` anywhere else.**

Deploys: neither `.env` nor the mode files are committed. Place `.env` + `.env.production` on
the server out-of-band, or set the same keys in the host's environment settings (those win over
both files).

## Structure

```
src/
  server.ts            # bootstrap: env → DBs → cron → listen (+ graceful shutdown)
  app.ts               # middleware + every route mount (legacy paths preserved)
  config/env.ts        # layered dotenv + zod validation → typed `env`
  config/db.ts         # 3 named mongoose connections (main, jyotirling, partner-affiliate)
  middleware/          # error handler, rate limiters, auth (JWT)
  lib/                 # logger (pino), ApiError, razorpay client (live/test via PAYMENT_MODE)
  modules/<domain>/    # <name>.routes.ts / .controller.ts / .model.ts per domain
  utils/               # mail, otp, whatsapp, meta CAPI, partner-affiliate helpers
  jobs/                # cron jobs (chadhava cleanup)
  scripts/             # one-off scripts (pnpm tsx src/scripts/<name>.ts)
```

Domains: users, pooja, payments, promo, chadhava, prasad, delivery, mandir, personalized-pooja,
content (blogs/banner/gods/library/video-proof/feedback/messages), analytics, jyotirlinga,
yatra (4-dham/banke-bihari/gau-seva), affiliate.

## Conventions

- Controllers throw `ApiError` (Express 5 forwards rejected promises automatically).
- Payments: the Razorpay client and signature helpers live in `src/lib/razorpay.ts`;
  `PAYMENT_MODE` (test/live) picks the key pair. Webhooks are mounted with `express.raw()` so the
  HMAC is verified over the exact bytes Razorpay signed.
- Logging via pino (`src/lib/logger.ts`); no `console.log`.
- `pnpm typecheck` and `pnpm lint` must stay clean.
