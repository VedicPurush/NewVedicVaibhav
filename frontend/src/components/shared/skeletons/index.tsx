import type { CSSProperties, ReactNode } from "react";

/**
 * Route-level loading skeletons.
 *
 * These are deliberately plain server components with no "use client" and no
 * imports beyond React: a `loading.tsx` is the very first thing streamed on a
 * navigation, so anything it pulls in has to be downloaded and parsed BEFORE the
 * user sees any feedback at all — which is the opposite of the point. Everything
 * here is markup plus the `.vv-skel` rule in globals.css.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export function Skel({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div aria-hidden="true" className={`vv-skel ${className}`} style={style} />;
}

/**
 * Stands in for the fixed header.
 *
 * Navbar/Footer live in components/layout/Layout, which is rendered by the page
 * itself rather than by the root layout — so during a navigation the real header
 * is gone too, and without this the fallback reads as a blank white page. The
 * wrapper below reuses the same `.header-offset` class the real Layout uses, so
 * the skeleton content starts exactly where the real content will and the swap
 * does not jump.
 */
function HeaderSkeleton() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-[#fffaf4]">
      <div className="h-8 w-full bg-[#f5e6d6]" />
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-10">
        <Skel className="h-10 w-24 md:h-14 md:w-36" />
        <div className="hidden flex-1 items-center justify-center gap-7 md:flex">
          {range(5).map((i) => (
            <Skel key={i} className="h-4 w-16" />
          ))}
        </div>
        <Skel className="h-9 w-9 rounded-full md:h-10 md:w-24" />
      </div>
    </div>
  );
}

/** Page chrome shared by every route fallback. */
export function PageSkeleton({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-label="Loading" className="min-h-screen">
      <HeaderSkeleton />
      <div className="header-offset px-4 pb-20 md:px-10">{children}</div>
      <span className="sr-only">Loading, please wait…</span>
    </div>
  );
}

/** A grid of seva / temple / blog cards. */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
      {range(count).map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl bg-white/70 p-3 shadow-sm">
          <Skel className="mb-3 w-full rounded-xl" style={{ aspectRatio: "4 / 3" }} />
          <Skel className="mb-2 h-4 w-4/5" />
          <Skel className="mb-3 h-3 w-3/5" />
          <Skel className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Listing pages: mandirs, chadhavas, pujas, blogs. */
export function ListingSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <>
      <div className="mx-auto mb-8 mt-6 flex max-w-2xl flex-col items-center gap-3">
        <Skel className="h-7 w-2/3 md:h-9" />
        <Skel className="h-4 w-11/12" />
        <Skel className="h-4 w-3/4" />
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        {range(4).map((i) => (
          <Skel key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <CardGridSkeleton count={cards} />
    </>
  );
}

/**
 * Detail pages (a temple, a chadhava, a puja) — the click that used to sit on a
 * frozen screen while the server fetched the record.
 */
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl pt-6">
      <Skel className="mb-6 w-full rounded-2xl" style={{ aspectRatio: "16 / 9" }} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <Skel className="mb-3 h-7 w-4/5 md:h-9" />
          <Skel className="mb-6 h-4 w-2/5" />

          <div className="mb-8 flex flex-wrap gap-3">
            {range(3).map((i) => (
              <Skel key={i} className="h-8 w-28 rounded-full" />
            ))}
          </div>

          <div className="mb-8 space-y-3">
            {range(5).map((i) => (
              <Skel key={i} className={`h-4 ${i === 4 ? "w-2/3" : "w-full"}`} />
            ))}
          </div>

          <Skel className="mb-4 h-6 w-1/3" />
          <div className="grid gap-4 sm:grid-cols-2">
            {range(4).map((i) => (
              <div key={i} className="rounded-xl bg-white/70 p-4 shadow-sm">
                <Skel className="mb-2 h-5 w-3/4" />
                <Skel className="mb-2 h-3 w-full" />
                <Skel className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>

        {/* Booking / price panel */}
        <div className="rounded-2xl bg-white/70 p-5 shadow-sm lg:sticky lg:top-32 lg:self-start">
          <Skel className="mb-4 h-6 w-1/2" />
          {range(3).map((i) => (
            <Skel key={i} className="mb-3 h-12 w-full rounded-lg" />
          ))}
          <Skel className="mt-5 h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Long-form text routes: blogs, aartis, chalisas, scriptures. */
export function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-3xl pt-8">
      <Skel className="mb-4 h-8 w-11/12 md:h-10" />
      <div className="mb-8 flex gap-3">
        <Skel className="h-4 w-28" />
        <Skel className="h-4 w-20" />
      </div>
      <Skel className="mb-8 w-full rounded-2xl" style={{ aspectRatio: "16 / 9" }} />
      <div className="space-y-4">
        {range(14).map((i) => (
          <Skel key={i} className={`h-4 ${i % 5 === 4 ? "w-3/5" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

/** The default fallback, for routes without a hand-tailored one. */
export function GenericSkeleton() {
  return (
    <div className="mx-auto max-w-6xl pt-6">
      <Skel className="mb-8 w-full rounded-2xl" style={{ aspectRatio: "21 / 9" }} />
      <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3">
        <Skel className="h-7 w-2/3" />
        <Skel className="h-4 w-full" />
        <Skel className="h-4 w-4/5" />
      </div>
      <CardGridSkeleton count={4} />
    </div>
  );
}
