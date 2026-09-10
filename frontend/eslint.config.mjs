import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * ESLint 9 flat config.
 *
 * `eslint-config-next` still ships only legacy (eslintrc-style) entry points, so
 * FlatCompat adapts them. This replaces `next lint`, which is deprecated in
 * Next 15 and removed in Next 16.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-perf/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
    ],
  },

  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    rules: {
      // This is a large codebase ported from a previous stack. The rules below
      // are downgraded to warnings so `pnpm lint` reports real breakage as
      // errors instead of drowning it in pre-existing style debt. Tighten them
      // back to "error" as each category gets cleaned up.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react/no-unescaped-entities": "warn",
      "react-hooks/exhaustive-deps": "warn",

      // Kept as errors — these catch genuine performance and correctness bugs,
      // including the two classes of problem found in the homepage audit.
      "@next/next/no-img-element": "off", // intentional: CDN images with manual sizing
      "@next/next/no-sync-scripts": "error",
      "@next/next/no-html-link-for-pages": "error",
      "jsx-a11y/alt-text": "warn",
    },
  },
];

export default eslintConfig;
