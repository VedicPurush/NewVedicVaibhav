# Vedic Vaibhav — Vite→Next.js migration conventions

Source (read-only): `/Users/rahul/Development/Vedic-Vaibhav/vedic-vaibhav` (Vite + react-router SPA)
Target (write here): `/Users/rahul/Development/Vedic-Vaibhav/frontend` (Next.js 15 App Router, TypeScript strict, Tailwind v3, pnpm)

**Prime directive: the rendered design must be pixel-identical to the old site.** Port JSX and CSS
faithfully — same class names, same inline styles, same breakpoints, same fonts (loaded globally in
`src/app/layout.tsx`; literal families like "Poppins" resolve). Clean up code, never design.

## Target structure

```
src/
  app/                    # routes only — thin wrappers, no page logic here
  components/
    layout/               # Layout, Navbar, Footer, FeaturedBanner, ScrollProgressBar
    shared/               # LoadingGif, PhoneAutoFillInput, ProgressBar, LanguageSelector, ...
    global/               # GlobalUI (route analytics, translate init, popups)
    providers/            # AppProviders (Redux + React Query persist + i18n + Music)
    pages/<area>/...      # ported page components (client), colocated css/api/subcomponents
    widgets/<area>/...    # ported Widgets/*
  hooks/                  # ported hooks + hooks/queries
  lib/                    # api client, api modules, query-keys, gtag, referral, utm, i18n, dayjs
  store/                  # redux slices
  locales/<lng>/translation.json
```

Path alias: `@/*` → `src/*`.

## Routing pattern (mandatory)

Every old `<Route path=X element={<C/>}>` becomes an `src/app/<x>/page.tsx` **server** wrapper plus a
**client** page component under `src/components/pages/...`:

```tsx
// src/app/services/puja/page.tsx
import type { Metadata } from "next";
import PujaPage from "@/components/pages/services/puja/PujaPage";

export const metadata: Metadata = { title: "...", description: "..." }; // from the old <Helmet> block
export default function Page() {
  return <PujaPage />;
}
```

- Dynamic params: `/chadhava/detail/:id` → `src/app/chadhava/detail/[id]/page.tsx`. The wrapper reads
  `params` (`export default async function Page({ params }: { params: Promise<{ id: string }> })`) and
  passes them as props, OR the client component uses `useParams()` from `next/navigation`.
- `react-helmet` blocks → the wrapper's `metadata` export (title/description/OG/canonical). Delete the
  Helmet code from the client component.
- Client page components start with `"use client"`.

## API conversion (mandatory)

- `import.meta.env.VITE_API_BASE_URL ...` and every hardcoded `http://localhost:5009` →
  `import { api, apiUrl, API_BASE_URL } from "@/lib/api"`.
  - axios call sites: use the shared `api` instance with relative paths: `api.get("/getallpoojas")`.
  - `fetch(...)` call sites: `fetch(apiUrl("/getallpoojas"))`.
- Keep endpoint paths and payloads EXACTLY as in old code.
- `VITE_CHAT_API_URL` / `VITE_CHAT_SOCKET_URL` / OpenAI keys → that feature is removed; skip the file (see Exclusions).

## Library conversions

| Old | New |
| --- | --- |
| `react-router-dom` `useNavigate()` | `useRouter()` from `next/navigation` (`router.push/replace/back`) |
| `useParams()` (react-router) | `useParams()` from `next/navigation` |
| `useLocation().pathname` | `usePathname()` |
| `useLocation().search` | `useSearchParams()` |
| `<Link to="...">` | `next/link` `<Link href="...">` |
| `<Navigate to=... replace />` | `router.replace(...)` in an effect, or `redirect()` in server wrappers |
| `React.lazy(() => import(x))` | plain import (Next code-splits per route); use `next/dynamic` with `{ ssr: false }` ONLY for components that break on the server (window at module scope, canvas, etc.) |
| `react-helmet` | `metadata` export in the server wrapper |
| `sweetalert` (v1) | `sweetalert2` (already a dep) — same visual intent |
| `react-image-lightbox` | simple modal/dialog with the same look (do not add new deps) |
| `import { Helmet }`, `react-scripts`, `process` shims | delete |

Everything else (MUI, antd, framer-motion, swiper, react-slick, styled-components, formik/yup,
notistack, lottie, react-icons, dayjs, etc.) is installed — import as before. MUI is v7 and antd v5
with the React-19 patch (applied globally in AppProviders); if a deep import path changed in MUI v7,
fix the import, not the component. Do NOT add dependencies; if code truly needs one, note it in your
final report.

## SSR safety (mandatory)

Client components still render once on the server. Any `window` / `localStorage` /
`document` / `navigator` access must live inside `useEffect`/event handlers, or be guarded with
`typeof window !== "undefined"`. Module-scope access is a build breaker. State initialized from
localStorage: start with a default, hydrate in `useEffect`.

## CSS

- Plain `.css` imports are allowed in any client component in the App Router — keep the old `.css`
  files as-is (same file content, colocated next to the component).
- Do not rename classes; do not "modernize" styles.

## Images

Keep `<img>` tags as-is (pixel parity, arbitrary CDN hosts). Do not convert to `next/image` unless
the old code already computed exact dimensions.

## Exclusions — never port

- Anything under `Pages/E-com`, `Pages/Shop`, `Pages/Astrology`, `Widgets/Astrology`,
  `Widgets/AstroUserKundali`, `Widgets/Shop`, `Pages/MahaKumbh`, `Pages/HomeChatModule`,
  `Pages/Diwali`, `Pages/Box`, AstroLayout/AstroNavbar, bottle/sangam-water code.
  EXCEPTION: the three legal pages routed on the main site (EcomPrivacyPolicy, EcomCancelpolicy,
  Ecomshippingpolicy) are ported into `components/pages/legal/`.
- `Widgets/Home/HomeChatScreen.tsx`, `Widgets/Home/Gift.tsx`, `Widgets/Home/AI Chat/*` (contains a
  leaked OpenAI key — must not reach the new repo). If another file imports these, remove the import
  and the render site, and note it in your report.
- Commented-out routes/components in old `App.tsx`.

## Canonical shared paths (import these; another agent creates them)

- `@/components/layout/Layout` (default export; old signature `<Layout content={...} activeIndex="...">` preserved)
- `@/components/layout/{Navbar,Footer,FeaturedBanner,ScrollProgressBar}`
- `@/components/shared/LoadingGif` (old `loadinggif.tsx`)
- `@/components/shared/{PhoneAutoFillInput,PhoneAutoVerification,AppDownloadModal,ProgressBar}`
- `@/components/shared/{I18nText,LanguageSelector,MobileLangSelector}`
- `@/components/widgets/home/*` (old `Widgets/Home/*`), `@/components/widgets/puja/*`,
  `@/components/widgets/mandir/*`, `@/components/widgets/map/*`, `@/components/widgets/services/*`,
  `@/components/widgets/music/*`, `@/components/widgets/auth/*`, `@/components/widgets/prashad/*`
- `@/components/pages/services/puja/shri-banke-bihari/BannerShriBankeBihariji` (home page banner)
- `@/store/{store,cartSlice,userSlice}` (same action/selector names as old)
- `@/lib/{api,gtag,referral,utm,sessionutils,videoLinkParser,dayjs,react-query,i18n}`
- `@/lib/api/*` = old `src/api/*` modules (same export names), `@/lib/query-keys/*` = old `react-query-keys/*`
- `@/hooks/*` and `@/hooks/queries/*` (same export names as old `src/hooks`)

## Quality bar

Strict TypeScript must pass (`pnpm typecheck`): no implicit any, `import type` for types, remove dead
code/commented blocks/unused imports and console.logs (keep `console.error` in catch paths). Keep
files under ~400 lines where the old file allows splitting without changing behavior.
