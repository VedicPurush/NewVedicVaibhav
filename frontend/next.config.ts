import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/* ────────────────────────────────────────────────────────────────────────────
 *  Mode switch — mirrors backend/.env
 *
 *  Next normally picks .env.development / .env.production from the COMMAND
 *  (`next dev` vs `next build`), and gives plain `.env` the lowest precedence.
 *  Here we invert that so `APP_MODE` in .env decides, matching the backend:
 *
 *      APP_MODE=development -> .env.development
 *      APP_MODE=production  -> .env.production
 *
 *  next.config.ts is evaluated before compilation, so overwriting process.env
 *  here is what the NEXT_PUBLIC_* inlining actually reads.
 *
 *  Precedence kept intact (highest first):
 *      real shell env  >  .env.local  >  .env.<APP_MODE>
 * ──────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();

/** Minimal KEY=VALUE parser — these files have no multiline or interpolated values. */
const parseEnvFile = (file: string): Record<string, string> => {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    out[key] = trimmed.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
};

const rootEnv = parseEnvFile(path.join(ROOT, ".env"));
const localEnv = parseEnvFile(path.join(ROOT, ".env.local"));
const APP_MODE =
  (process.env.APP_MODE ?? rootEnv.APP_MODE) === "production" ? "production" : "development";

// By the time this file runs, Next has ALREADY merged .env -> .env.<command
// mode> -> .env.local into process.env. So process.env is not a clean shell
// snapshot, and blindly restoring it would undo the override below. Rebuild
// what Next would have produced; any key whose live value differs from that is
// a genuine shell variable (`FOO=bar pnpm dev`) and must keep winning.
const commandMode = process.env.NODE_ENV === "production" ? "production" : "development";
const nextsMerge: Record<string, string> = {
  ...rootEnv,
  ...parseEnvFile(path.join(ROOT, `.env.${commandMode}`)),
  ...localEnv,
};
const shellOverrides = new Set(
  Object.keys(nextsMerge).filter((k) => process.env[k] !== nextsMerge[k]),
);

// Mode file first, then .env.local on top — skipping anything the shell owns.
for (const layer of [parseEnvFile(path.join(ROOT, `.env.${APP_MODE}`)), localEnv]) {
  for (const [k, v] of Object.entries(layer)) {
    if (!shellOverrides.has(k)) process.env[k] = v;
  }
}

// A production build bakes NEXT_PUBLIC_* into the browser bundle. Building in
// development mode would ship localhost URLs to real users, so refuse loudly.
const isOptimizedBuild = process.env.NODE_ENV === "production";
if (isOptimizedBuild && APP_MODE === "development" && !process.env.ALLOW_DEV_MODE_BUILD) {
  throw new Error(
    "\n[env] Refusing to build: APP_MODE=development in frontend/.env.\n" +
      `      That would bake ${process.env.NEXT_PUBLIC_API_BASE_URL} into the browser bundle.\n` +
      "      Set APP_MODE=production in frontend/.env before `pnpm build`.\n" +
      "      (Intentional? Re-run with ALLOW_DEV_MODE_BUILD=1.)\n",
  );
}

// Next evaluates this config in several worker processes; the marker is
// inherited by children, so the banner prints once per command instead of ~4×.
if (!process.env.__VV_ENV_BANNER_SHOWN) {
  process.env.__VV_ENV_BANNER_SHOWN = "1";
  console.log(
    `[env] APP_MODE=${APP_MODE} → .env.${APP_MODE} | API=${process.env.NEXT_PUBLIC_API_BASE_URL}`,
  );
}

const nextConfig: NextConfig = {
  // Lets a profiling/CI build run against its own output directory without
  // clobbering the `.next` a running dev server owns. Defaults to `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  compiler: {
    // A handful of ported components use styled-components.
    styledComponents: true,
  },
  images: {
    // Product/temple/blog imagery comes from the DO Spaces CDN plus arbitrary
    // CMS-entered hosts, so remote optimization must accept any https host.
    remotePatterns: [{ protocol: "https", hostname: "**" }, { protocol: "http", hostname: "**" }],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // antd and the MUI icon set are barrel files; without this every import of a
    // single icon or grid primitive pulls the whole package into the client bundle.
    optimizePackageImports: ["antd", "@mui/material", "@mui/icons-material", "@ant-design/icons"],
  },
  eslint: {
    // Linting runs separately via `pnpm lint`; it must not block production builds.
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      // NOTE: the /services/Banke-Bihariji legacy redirect used to live here and
      // caused an infinite loop — `source` is matched CASE-INSENSITIVELY, so the
      // canonical lowercase /services/banke-bihariji matched it too and redirected
      // onto itself (ERR_TOO_MANY_REDIRECTS on the real page). Any redirect whose
      // source and destination differ only by case has to go in middleware.ts,
      // where the comparison can be exact. Keep this list free of case-variant
      // pairs.
      { source: "/newchadhavapage", destination: "/chadhava", permanent: false },

      /**
       * Prasad is retired. These are 307s (permanent: false), not 308s, so the
       * decision stays reversible — a permanent redirect gets cached hard by
       * browsers and is painful to undo if prasad comes back. The `:path*`
       * variants catch deep links such as /newprasad/detail/<id> that customers
       * may still have bookmarked, so they land on the homepage rather than a 404.
       * The matching entries were removed from sitemap.ts.
       */
      { source: "/services/prasad", destination: "/", permanent: false },
      { source: "/services/prasad/:path*", destination: "/", permanent: false },
      { source: "/newprasad", destination: "/", permanent: false },
      { source: "/newprasad/:path*", destination: "/", permanent: false },
      // The prasad payment-failure page was reachable only from the retired
      // checkout, and its component is now deleted — redirect rather than 404.
      { source: "/Prasad-payment-failure", destination: "/", permanent: false },

      /**
       * Death rituals (Atma Shanti) is retired — page, components and the whole
       * backend module are gone. Same 307 reasoning as prasad above, and it
       * matters more here: this page was in the sitemap and is indexed, so a
       * bare 404 would strand real search traffic. Removed from sitemap.ts too.
       */
      { source: "/services/death-rituals", destination: "/", permanent: false },
      { source: "/services/death-rituals/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
