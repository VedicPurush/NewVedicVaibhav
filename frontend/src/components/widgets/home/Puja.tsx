"use client";

import Link from "next/link";
import PujaCard from "@/components/widgets/puja/PujaCard";
import ArrowForward from "@mui/icons-material/ArrowForward";
import SectionHeader from "@/components/shared/SectionHeader";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCombinedPoojasQuery } from "@/hooks/useAllPoojas";
import { fetchAnyPoojaById } from "@/lib/api/puja.api";
import { PUJA_KEYS } from "@/lib/query-keys/puja.keys";
import { useActiveMandirsQuery } from "@/hooks/queries/useMandirQueries";

const MAX_CARDS = 6;

/**
 * Every state of this section — skeleton, error, loaded — uses this box, so the
 * section occupies one fixed height regardless of which one renders. Lighthouse
 * traced the largest layout shift on the page (0.22) to this section shrinking
 * from its reserved placeholder down to a shorter state after mount.
 * Keep in sync with the `placeholderHeight` HomePage reserves for it.
 */
const SECTION_BOX = "flex flex-col px-[3%] md:px-[6%] min-h-[257px] md:min-h-[350px]";

type PoojaMandirList = {
  mandirId: string;
  mandirName?: string; // fallback name (if backend sends)
  originalPrice: number;
  discountPrice: number;
  poojaMandirTime: string;
  poojaMandirDays: string;
  /**
   * ISO date string. The legacy collection sometimes sends a one-element array
   * here, so always read it through `firstDateString` rather than trusting the
   * declared type.
   */
  poojaMandirDates: string;
  poojaMandirBenefits: string;
  _id: string;
};

type PujaItem = {
  _id: string;
  poojaID: string;
  title: string;
  titleHindi?: string;
  poojaGod: string;
  moolmantra: string;
  mandirLists: PoojaMandirList[];
  poojaCardImage: string;
  poojaCardBenefit: string;
  poojaDescription: string;
  images: string[];
  isActive: boolean;
  isExclusive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  // --- present only on poojas from the new `newpoojas` collection ---
  source?: "new" | "legacy";
  poojaDates?: string[];
  mandirDetails?: any[];
  originalPrice?: number;
  discountPrice?: number;
};

/**
 * The date field arrives as either a string or an array of strings depending on
 * which collection the record came from. `new Date(["a","b"])` silently yields
 * Invalid Date, which used to drop poojas from the homepage without a trace.
 */
const firstDateString = (value: unknown): string => {
  if (Array.isArray(value)) return value.length ? String(value[0]) : "";
  return value == null ? "" : String(value);
};

/** Soonest date that has not passed; poojas stay listed through their own day. */
const soonestUpcoming = (dates: any[]): string => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcoming = (dates || [])
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()) && d >= startOfToday)
    .sort((a, b) => a.getTime() - b.getTime());
  return upcoming.length ? upcoming[0].toISOString() : "";
};

const SectionHeading = () => (
  <SectionHeader
    className="mb-2 md:mb-1 mt-4 md:mt-1"
    title="UPCOMING POOJAS"
    action={
      <Link
        href="/services/puja"
        aria-label="See all pujas"
        className="flex items-center gap-2 px-2 md:px-6 py-1 md:py-2 rounded-full border border-orange-400 bg-white/30 backdrop-blur-sm text-orange-700 font-semibold hover:bg-orange-50 hover:text-orange-500 transition-colors shadow-md text-[8px] md:text-sm"
      >
        See All <ArrowForward style={{ fontSize: 12 }} />
      </Link>
    }
  />
);

/** Matches the real card footprint so the strip does not resize when data lands. */
const CardSkeleton = () => (
  <div className="flex-none w-[160px] sm:w-[285px] rounded-2xl border border-gray-200 overflow-hidden bg-white">
    <div className="w-full aspect-[4/3] bg-gray-200 animate-pulse" />
    <div className="p-3 space-y-2">
      <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
      <div className="h-2 w-1/2 bg-gray-200 rounded animate-pulse" />
      <div className="h-7 w-full bg-gray-200 rounded-xl animate-pulse" />
    </div>
  </div>
);

interface PujaProps {
  /** Server-fetched lists, so these cards appear in the server HTML. */
  initialPoojas?: unknown[] | null;
  initialMandirs?: unknown[] | null;
}

export default function Puja({ initialPoojas, initialMandirs }: PujaProps) {
  const {
    data: pujaData = [],
    isLoading,
    isError,
    isFetching: isPoojasFetching,
    refetch,
  } = useCombinedPoojasQuery(initialPoojas); // legacy `poojas` + new `newpoojas`

  /**
   * React requires the FIRST client render to produce exactly what the server
   * sent; anything else is a hydration mismatch and the tree is thrown away.
   *
   * That is not guaranteed here. The app is wrapped in PersistQueryClientProvider
   * (see AppProviders — an IndexedDB-backed cache), so by the time this component
   * hydrates React Query can already hold a *different* pooja list than the one
   * the server rendered from. And the query seeds with `placeholderData`, which
   * loses to any cached entry. The visible symptom: the server found no upcoming
   * poojas and emitted nothing, while the client — holding a persisted list —
   * rendered the whole section.
   *
   * So the first client render deliberately reads the same input the server had,
   * and only after mount does it switch to live query data. The swap is a normal
   * post-hydration update, which React is happy with.
   */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const sourcePoojas = hydrated ? pujaData : ((initialPoojas as typeof pujaData) ?? []);
  // Loading and error states can likewise only differ after mount — the server
  // never fetches, so it can be in neither.
  const showSkeleton = hydrated && isLoading;
  const showError = hydrated && isError;

  const queryClient = useQueryClient();

  const prefetchPujaDetail = useCallback(
    (pujaId: string) => {
      const id = String(pujaId || "");
      if (!id) return;

      // must match the key/fetcher the detail page uses, or the warmed entry
      // is never read
      queryClient.prefetchQuery({
        queryKey: PUJA_KEYS.anyDetail(id),
        queryFn: () => fetchAnyPoojaById(id),
        staleTime: 30 * 60 * 1000,
      });
    },
    [queryClient]
  );

  // New-collection poojas embed their temple and hold one price pair on the
  // document. Project them into the mandirLists shape the rest of this widget
  // reads, so cards, prices, dates and sorting keep working unchanged.
  const normalizedPujaData: PujaItem[] = useMemo(() => {
    return (sourcePoojas || []).map((puja: PujaItem) => {
      if (puja.source !== "new") return puja;
      const md = puja.mandirDetails?.[0];
      return {
        ...puja,
        mandirLists: [
          {
            mandirId: "",
            // undefined (not "") so the card's ?? fallback still reaches "—"
            mandirName: md?.name || undefined,
            discountPrice: puja.discountPrice ?? puja.originalPrice ?? 0,
            originalPrice: puja.originalPrice ?? 0,
            // A plain string, matching the declared type. This used to be
            // wrapped in an array and cast through `any`.
            poojaMandirDates: soonestUpcoming(puja.poojaDates || []),
          } as PoojaMandirList,
        ],
      };
    });
  }, [sourcePoojas]);

  // One shared, cached request for every active mandir instead of a separate
  // round trip per unique mandir id — that fan-out (and gating render on all
  // of them resolving, below) was the main reason this section loaded slowly.
  const { data: activeMandirs = [] } = useActiveMandirsQuery(initialMandirs as never);

  const mandirMap = useMemo(() => {
    const map: Record<string, any> = {};
    (activeMandirs || []).forEach((m: any) => {
      if (m?._id) map[String(m._id)] = m;
    });
    return map;
  }, [activeMandirs]);

  const getLowestDiscountPrice = (mandirLists: PoojaMandirList[]): number => {
    // Math.min() of an empty list is Infinity — guard so a pooja with no
    // mandir entries shows 0 rather than "₹Infinity".
    if (!mandirLists?.length) return 0;
    return Math.min(...mandirLists.map((mandir) => mandir.discountPrice));
  };

  // Filter out past pujas and sort by nearest upcoming date
  const sortedPujaData = useMemo(() => {
    if (!Array.isArray(normalizedPujaData)) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const withDate = normalizedPujaData
      .map((puja) => {
        const raw = firstDateString(puja.mandirLists?.[0]?.poojaMandirDates);
        const time = raw ? new Date(raw).getTime() : NaN;
        return { puja, raw, time };
      })
      .filter(({ time }) => Number.isFinite(time) && time >= today.getTime());

    return withDate.sort((a, b) => a.time - b.time).slice(0, MAX_CARDS);
  }, [normalizedPujaData]);

  // An empty array (as opposed to null) means the server ran the query and found
  // nothing upcoming. Trust that and render nothing on the client too.
  //
  // Without this the section jumps: React Query reports isLoading=false during
  // the server render (nothing is fetching there) so the server emits an empty
  // slot, then reports isLoading=true on the client and a 280px skeleton appears
  // in a gap that was closed — shoving the rest of the page down. `null` here is
  // the state the section will settle in anyway, so it never moves.
  const serverFoundNothing = Array.isArray(initialPoojas) && initialPoojas.length === 0;
  if (serverFoundNothing && sortedPujaData.length === 0) return null;

  if (showSkeleton) {
    return (
      <div className={SECTION_BOX}>
        <SectionHeading />
        <div className="w-full overflow-hidden mb-3">
          <div className="flex gap-2.5">
            {Array.from({ length: MAX_CARDS }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // This section is server-rendered. If the server produced nothing here (no
  // upcoming poojas), the slot is closed in the delivered HTML — so injecting an
  // error block after a failed client refetch would shove the entire rest of the
  // page down. Measured: a 280px jump, 0.10 of CLS on its own.
  //
  // A failed refetch when the server *did* render cards is already handled by
  // the `sortedPujaData.length === 0` guard below: the existing cards stay put.
  const serverRenderedEmpty = !initialPoojas?.length;

  if (showError && sortedPujaData.length === 0 && serverRenderedEmpty) {
    console.error("[Puja] list unavailable; section left empty to avoid a layout shift");
    return null;
  }

  if (showError && sortedPujaData.length === 0) {
    // A failed request is not the same as "no poojas scheduled" — reporting a
    // real outage as planned maintenance hid failures from users and from us.
    return (
      <div className={SECTION_BOX}>
        <SectionHeading />
        <div className="w-full py-8 text-center">
          <p className="text-sm text-gray-600">We couldn&apos;t load the upcoming poojas.</p>
          <button
            type="button"
            // refetch(), not window.location.reload() — a full reload threw away
            // the entire React Query cache, including the persisted one.
            onClick={() => refetch()}
            className="mt-3 px-5 py-2 rounded-full bg-orange-700 text-white text-sm font-semibold hover:bg-orange-800 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (sortedPujaData.length === 0) return null;

  return (
    <div className={SECTION_BOX}>
      <SectionHeading />

      {isPoojasFetching && (
        <div className="max-w-6xl mx-auto mt-2 mb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur border border-orange-200 text-orange-800 text-xs font-semibold shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Updating…
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto hide-scrollbar mb-3 [-webkit-overflow-scrolling:touch]">
        <ul className="flex flex-nowrap items-stretch gap-2.5 list-none m-0 p-0 py-0.5">
          {sortedPujaData.map(({ puja, raw }) => {
            const mandirId = puja.mandirLists[0]?.mandirId;
            const mandirDetails = mandirMap[String(mandirId)];

            // fallback if mandir query hasn't filled yet
            const mandirName =
              mandirDetails?.nameEnglish ?? puja.mandirLists?.[0]?.mandirName ?? "—";

            const [year, month, date] = raw.split("T")[0].split("-");
            const mandirDate = year && month && date ? `${date}-${month}-${year}` : "Unknown Date";

            return (
              <li
                key={puja._id}
                onMouseEnter={() => prefetchPujaDetail(puja._id)}
                onFocus={() => prefetchPujaDetail(puja._id)}
                onTouchStart={() => prefetchPujaDetail(puja._id)}
                className="flex-none w-[160px] sm:w-[285px] max-w-[180px] sm:max-w-[300px]"
              >
                <PujaCard
                  MoolMantra={puja.moolmantra}
                  id={puja._id}
                  Title={puja.title}
                  imgSrc={puja.poojaCardImage}
                  poojaCardBenefit={puja.poojaCardBenefit}
                  price={getLowestDiscountPrice(puja.mandirLists)}
                  mandirName={mandirName}
                  mandirDate={mandirDate}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
