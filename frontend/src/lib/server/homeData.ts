import { fetchAllBanners } from "@/lib/api/banner";
import { fetchNewChadhavaList } from "@/lib/api/newChadhava.api";
import { fetchAllPoojasCombined } from "@/lib/api/puja.api";
import { fetchActiveMandirs } from "@/lib/api/mandir.api";

/**
 * Server-side data for the homepage's first render.
 *
 * The homepage used to ship an empty shell: 167KB of HTML containing no puja,
 * chadhava, temple or section heading — every item was fetched after hydration.
 * That cost LCP (a long serial chain before the hero could paint) and left
 * crawlers nothing to index on the site's most important page.
 *
 * These calls run on the server, where the backend's CORS check passes them
 * through (server-to-server requests carry no Origin header). Results are handed
 * to the client components, so the first paint already has content.
 *
 * ── Why everything below is projected and capped ──
 * The four endpoints return ~1.2MB combined (chadhava 488KB, poojas 462KB,
 * mandirs 256KB). Passing those straight through inflated the HTML from 167KB
 * to 1.5MB, because data crossing a server→client component boundary is
 * serialised into the payload embedded in the page. So each list is filtered to
 * the rows that actually render, then narrowed to the fields the cards read.
 *
 * These projections are *previews*, handed to React Query as `placeholderData`
 * rather than `initialData` — they are never written to the cache, and the
 * client immediately fetches the real, complete list to replace them.
 *
 * Every fetch is individually guarded: one failing endpoint degrades that one
 * section to client-side loading rather than failing the render or the build.
 */

/** Rows to render server-side. The client fetch replaces these with the full list. */
const MAX_CHADHAVA_PREVIEW = 10;
const MAX_PUJA_PREVIEW = 6;

export interface HomeInitialData {
  banners: unknown[] | null;
  chadhava: unknown[] | null;
  poojas: unknown[] | null;
  mandirs: unknown[] | null;
}

export const EMPTY_HOME_DATA: HomeInitialData = {
  banners: null,
  chadhava: null,
  poojas: null,
  mandirs: null,
};

const safeFetch = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    // Not fatal — the matching client hook will fetch it in the browser.
    console.error(`[homeData] server fetch failed for "${label}":`, error);
    return null;
  }
};

const asArray = (value: unknown): any[] | null => (Array.isArray(value) ? value : null);

const parseBool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";

/** End of the given day, or NaN when unparseable. */
const endOfDay = (value: unknown): number => {
  const t = Date.parse(String(value ?? "").split("T")[0]);
  if (!Number.isFinite(t)) return NaN;
  const d = new Date(t);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

/** Mirrors ChadhavaComponent's filter, then keeps only the card's fields. */
const projectChadhava = (list: any[] | null): any[] | null => {
  if (!list) return null;
  const now = Date.now();

  return list
    .filter((item) => parseBool(item?.isActive))
    .map((item) => ({ item, when: endOfDay(item?.availableDates?.[0]) }))
    .filter(({ when }) => Number.isFinite(when) && when >= now)
    .sort((a, b) => a.when - b.when)
    .slice(0, MAX_CHADHAVA_PREVIEW)
    .map(({ item }) => {
      // The card derives its "From ₹X" by taking the minimum itemPrice across
      // every section. Collapsing that to a single synthetic item preserves the
      // computed value without shipping the whole pricing tree.
      const prices: number[] = [];
      (item.chadhavaSections || []).forEach((sec: any) =>
        (sec?.items || []).forEach((it: any) => {
          if (it?.itemPrice) prices.push(it.itemPrice);
        }),
      );
      const minPrice = prices.length ? Math.min(...prices) : 0;

      return {
        _id: item._id,
        chadhavaName: item.chadhavaName,
        isActive: true,
        availableDates: [item.availableDates?.[0]],
        selectedMandirs: item.selectedMandirs?.[0]?.nameEnglish
          ? [{ nameEnglish: item.selectedMandirs[0].nameEnglish }]
          : [],
        chadhavaWebCardImage: item.chadhavaWebCardImage?.location
          ? { location: item.chadhavaWebCardImage.location }
          : undefined,
        chadhavaInnerImages: item.chadhavaInnerImages?.[0]?.location
          ? [{ location: item.chadhavaInnerImages[0].location }]
          : [],
        chadhavaSections: minPrice ? [{ items: [{ itemPrice: minPrice }] }] : [],
      };
    });
};

/** Mirrors Puja's filter, then keeps only the card's fields. */
const projectPoojas = (list: any[] | null): any[] | null => {
  if (!list) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const from = startOfToday.getTime();

  const firstDate = (value: unknown): string => {
    if (Array.isArray(value)) return value.length ? String(value[0]) : "";
    return value == null ? "" : String(value);
  };

  const soonest = (dates: unknown[]): string => {
    const upcoming = (dates || [])
      .map((d) => new Date(d as string))
      .filter((d) => !isNaN(d.getTime()) && d.getTime() >= from)
      .sort((a, b) => a.getTime() - b.getTime());
    return upcoming.length ? upcoming[0].toISOString() : "";
  };

  return list
    .map((puja) => {
      const date =
        puja?.source === "new"
          ? soonest(puja?.poojaDates || [])
          : firstDate(puja?.mandirLists?.[0]?.poojaMandirDates);
      return { puja, date, when: date ? Date.parse(date) : NaN };
    })
    .filter(({ when }) => Number.isFinite(when) && when >= from)
    .sort((a, b) => a.when - b.when)
    .slice(0, MAX_PUJA_PREVIEW)
    .map(({ puja, date }) => ({
      _id: puja._id,
      title: puja.title,
      moolmantra: puja.moolmantra,
      poojaCardImage: puja.poojaCardImage,
      poojaCardBenefit: puja.poojaCardBenefit,
      source: puja.source,
      // Normalised to the legacy shape the card reads, with the resolved date.
      mandirLists: [
        {
          mandirId: puja?.mandirLists?.[0]?.mandirId ?? "",
          mandirName:
            puja?.mandirLists?.[0]?.mandirName ?? puja?.mandirDetails?.[0]?.name ?? undefined,
          discountPrice:
            puja?.mandirLists?.[0]?.discountPrice ?? puja?.discountPrice ?? puja?.originalPrice ?? 0,
          originalPrice: puja?.mandirLists?.[0]?.originalPrice ?? puja?.originalPrice ?? 0,
          poojaMandirDates: date,
        },
      ],
    }));
};

/** Only the temples referenced by the previewed poojas, and only their names. */
const projectMandirs = (list: any[] | null, poojas: any[] | null): any[] | null => {
  if (!list) return null;
  const needed = new Set(
    (poojas || []).map((p) => String(p?.mandirLists?.[0]?.mandirId || "")).filter(Boolean),
  );
  if (needed.size === 0) return [];

  return list
    .filter((m) => needed.has(String(m?._id)))
    .map((m) => ({ _id: m._id, nameEnglish: m.nameEnglish }));
};

export const loadHomeData = async (): Promise<HomeInitialData> => {
  // `next build` prerenders this route. A transient outage of the remote API
  // must not make creating the deployable artifact depend on that API. At
  // runtime, ISR (and the client queries) will populate these sections.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return EMPTY_HOME_DATA;
  }

  const [banners, chadhava, poojas, mandirs] = await Promise.all([
    safeFetch("banners", fetchAllBanners),
    safeFetch("chadhava", fetchNewChadhavaList),
    safeFetch("poojas", fetchAllPoojasCombined),
    safeFetch("mandirs", fetchActiveMandirs),
  ]);

  // A non-array response (an error envelope, an HTML error page) is discarded so
  // the client hook fetches instead of rendering something malformed.
  const previewedPoojas = projectPoojas(asArray(poojas));

  return {
    // Small enough (~1KB) to hand over whole — this one is real data, not a preview.
    banners: asArray(banners),
    chadhava: projectChadhava(asArray(chadhava)),
    poojas: previewedPoojas,
    mandirs: projectMandirs(asArray(mandirs), previewedPoojas),
  };
};
