"use client";

import React, { useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import ArrowForward from "@mui/icons-material/ArrowForward";
import SectionHeader from "@/components/shared/SectionHeader";
import { useQueryClient } from "@tanstack/react-query";

import { MANDIR_KEYS } from "@/lib/query-keys/mandir.keys";
import { fetchMandirById } from "@/lib/api/mandir.api";
import { useActiveMandirsQuery } from "@/hooks/queries/useMandirQueries";
import { useAllPersonalizedPoojasQuery } from "@/hooks/queries/usePoojaQueries";
import { buildDetailSlug } from "@/lib/slug";

const safe = (v?: string) => v ?? "";

/**
 * One height across skeleton/error/loaded — see the note in Puja.tsx.
 *
 * The deity strip and the search/state bar moved to the dedicated /mandir page,
 * so this is now heading + one card row. Keep it in step with the
 * `placeholderHeight` HomePage passes for this section.
 */
const SECTION_BOX = "mx-[3%] md:mx-[6%] space-y-2 md:my-2 min-h-[193px] md:min-h-[256px]";

const CardSkeleton = () => (
  <div className="flex-shrink-0 w-[10.3rem] md:w-[14rem] rounded-xl bg-white shadow overflow-hidden">
    <div className="w-full aspect-[16/9] md:h-[7rem] bg-gray-200 animate-pulse" />
    <div className="p-1 space-y-1.5">
      <div className="h-2.5 w-3/4 bg-gray-200 rounded animate-pulse" />
      <div className="h-2 w-1/2 bg-gray-200 rounded animate-pulse" />
      <div className="h-6 w-full bg-gray-200 rounded-full animate-pulse" />
    </div>
  </div>
);

const SectionHeading = () => (
  <SectionHeader
    className="mb-2 mt-2"
    title="PERSONALIZE POOJA"
    action={
      /* Deity and state filters live on /mandir now — this is the way through. */
      <Link
        href="/mandir"
        aria-label="View all temples offering personalised puja"
        className="flex-shrink-0 flex items-center gap-2 px-2 md:px-6 py-1 md:py-2 rounded-full border border-orange-400 bg-white/30 backdrop-blur-sm text-orange-700 font-semibold hover:bg-orange-50 hover:text-orange-500 transition-colors shadow-md text-[8px] md:text-sm"
      >
        View All <ArrowForward style={{ fontSize: 12 }} />
      </Link>
    }
  />
);

const MandirHomePageComponent: React.FC = () => {
  const queryClient = useQueryClient();

  const {
    data: allMandirs = [],
    isLoading: loading,
    isError,
    isFetching,
    refetch,
  } = useActiveMandirsQuery();

  // Active personalized poojas — used to keep only mandirs that actually offer one
  const { data: personalizedPoojas = [], isLoading: poojasLoading } =
    useAllPersonalizedPoojasQuery();

  // Set of mandir ids that have at least one active personalized pooja
  const personalizedMandirIds = useMemo(() => {
    const ids = new Set<string>();
    (personalizedPoojas as any[]).forEach((p) => {
      (p?.mandirIds || []).forEach((id: string) => ids.add(String(id)));
    });
    return ids;
  }, [personalizedPoojas]);

  // Only show mandirs in which a personalized puja is available
  const mandirs = useMemo(
    () =>
      personalizedMandirIds.size === 0
        ? []
        : (allMandirs as any[]).filter((m) => personalizedMandirIds.has(String(m._id))),
    [allMandirs, personalizedMandirIds]
  );

  const prefetchMandirDetail = useCallback(
    (id: string) => {
      const mandirId = String(id || "");
      if (!mandirId) return;

      queryClient.prefetchQuery({
        queryKey: MANDIR_KEYS.detail(mandirId),
        queryFn: () => fetchMandirById(mandirId),
        staleTime: 30 * 60 * 1000,
      });
    },
    [queryClient]
  );

  if (loading || poojasLoading) {
    // Was a bare "Loading…" line that collapsed into a full card strip — a large
    // shift every time. This holds the section's real height.
    return (
      <div className={SECTION_BOX}>
        <SectionHeading />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={SECTION_BOX}>
        <SectionHeading />
        <div className="py-8 text-center">
          <p className="text-sm text-gray-600">We couldn&apos;t load the temples right now.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 px-5 py-2 rounded-full bg-orange-700 text-white text-sm font-semibold hover:bg-orange-800 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={SECTION_BOX}>
      {isFetching && (
        <div className="max-w-6xl mx-auto mt-1 mb-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur border border-orange-200 text-orange-800 text-xs font-semibold shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Updating…
          </div>
        </div>
      )}

      <SectionHeading />

      {/* RESULT CARDS */}
      <ul className="flex overflow-x-scroll gap-2 no-scrollbar scroll-smooth snap-x snap-mandatory list-none m-0 p-0">
        {mandirs.map((m: any, index: number) => (
          <li key={m._id} className="snap-start flex-shrink-0 w-[10.3rem] md:w-[14rem] mb-1">
            {/* A real link instead of an onClick div — the temple pages are now
                reachable by crawlers and by keyboard. */}
            <Link
              href={`/mandir/${buildDetailSlug(m.nameEnglish, m._id)}`}
              onMouseEnter={() => prefetchMandirDetail(m._id)}
              onFocus={() => prefetchMandirDetail(m._id)}
              onTouchStart={() => prefetchMandirDetail(m._id)}
              className="group block bg-white rounded-xl shadow hover:shadow-lg transition h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <div className="w-full aspect-[16/9] md:aspect-auto md:h-[7rem] rounded-t-xl relative overflow-hidden bg-gray-100">
                {m.mandirSectionImage ? (
                  <Image
                    src={safe(m.mandirSectionImage)}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="(max-width: 768px) 165px, 224px"
                    loading={index < 4 ? "eager" : "lazy"}
                    className="object-contain md:object-cover rounded-t-xl"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-center rounded-t-xl">
                  <span className="text-xs md:text-sm p-1 text-white relative z-10">
                    {safe(m.nameHindi)}
                  </span>
                </div>
              </div>

              <div className="p-0.5 md:p-1 space-y-0.5">
                <h3 className="text-[8px] md:text-base font-semibold text-gray-800 ps-1 truncate">
                  {safe(m.nameEnglish)}
                </h3>
                <p className="text-[8px] md:text-xs text-gray-500 ps-1 truncate">
                  {safe(m.location)}
                </p>
                <span className="block w-full text-center bg-orange-700 group-hover:bg-orange-800 text-white rounded-full font-medium transition py-1.5 text-[7px] mt-1 md:py-2 md:text-xs md:mt-2">
                  BOOK NOW
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {mandirs.length === 0 && (
        <div className="w-full text-center text-gray-400 py-8 text-base font-semibold">
          No Mandir found
        </div>
      )}
    </div>
  );
};

export default MandirHomePageComponent;
