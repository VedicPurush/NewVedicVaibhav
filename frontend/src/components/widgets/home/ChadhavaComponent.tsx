"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMoney } from "@/lib/currency";
import Image from "next/image";
import Link from "next/link";
import ArrowForward from "@mui/icons-material/ArrowForward";
import SectionHeader from "@/components/shared/SectionHeader";
import { useQueryClient } from "@tanstack/react-query";
import { useNewChadhavaListQuery } from "@/hooks/queries/useNewChadhavaListQuery";
import { NEW_CHADHAVA_KEYS } from "@/lib/query-keys/newChadhava.keys";
import { fetchNewChadhavaById } from "@/lib/api/newChadhava.api";
import { buildDetailSlug } from "@/lib/slug";
import { useNowTicker } from "@/hooks/useNowTicker";
import "./ChadhavaComponent.css";

/**
 * Shared by the skeleton and the loaded strip so the section holds one height
 * through the whole load, instead of shrinking and dragging the rest of the
 * page up with it. Keep in sync with HomePage's `placeholderHeight`.
 */
const SECTION_BOX = "flex flex-col px-[3%] md:px-[6%] min-h-[280px] md:min-h-[360px]";

/**
 * A single-line card title that scrolls right-to-left when the name is too long
 * to fit.
 *
 * CSS alone cannot express "animate only if this overflows", so the overflow is
 * measured. When the title does overflow it is rendered twice, and the track
 * slides exactly half its own width — at which point copy two sits where copy
 * one began, so the loop restarts invisibly and the text only ever travels in
 * one direction. (Sliding a single copy back and forth was the previous
 * behaviour, and is what made it appear to reverse.)
 *
 * Duration is derived from the distance so every title moves at the same speed
 * rather than in the same time — otherwise a very long name would whip past
 * while a barely-long one crawled.
 *
 * Titles that fit are left completely alone: one copy, no class, no animation,
 * no compositing layer. In a strip of six cards that is usually most of them.
 */
const SCROLL_SPEED_PX_PER_SEC = 32;

/** Blank space after each copy, so the end of the title is clearly separated
 *  from the start of the next pass. Written to CSS as --marquee-gap. */
const MARQUEE_GAP_PX = 36;

const MarqueeTitle = ({ text }: { text: string }) => {
  const clipRef = useRef<HTMLHeadingElement>(null);
  const chunkRef = useRef<HTMLSpanElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [cycleSec, setCycleSec] = useState(0);

  useEffect(() => {
    const clip = clipRef.current;
    const chunk = chunkRef.current;
    if (!clip || !chunk) return;

    const measure = () => {
      // The chunk carries the trailing gap only while scrolling, so subtract it
      // to get the text's own width and keep the comparison stable across both
      // states — otherwise enabling the animation would change the measurement
      // that decided to enable it.
      const chunkWidth = chunk.offsetWidth;
      const textWidth = isScrolling ? chunkWidth - MARQUEE_GAP_PX : chunkWidth;

      // A few px of slack: sub-pixel text metrics otherwise put titles that
      // visually fit into a permanent 1px shuffle.
      const overflows = textWidth - clip.clientWidth > 4;
      setIsScrolling(overflows);
      // One full cycle travels one copy plus its gap.
      if (overflows) setCycleSec((textWidth + MARQUEE_GAP_PX) / SCROLL_SPEED_PX_PER_SEC);
    };

    measure();

    // Card widths change with the breakpoint, and text widths change when the
    // web font swaps in — a first-pass-only measurement would be wrong by then.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(clip);
    observer.observe(chunk);
    return () => observer.disconnect();
  }, [text, isScrolling]);

  return (
    <h3
      ref={clipRef}
      className="chadhava-title text-gray-900 font-bold text-[11px] leading-snug"
      // The full name for anyone hovering. The visible text is complete for
      // assistive tech either way — it is clipped, not truncated.
      title={text}
    >
      <span
        className={`chadhava-title__track${isScrolling ? " chadhava-title__track--marquee" : ""}`}
        style={
          isScrolling
            ? ({
                "--marquee-gap": `${MARQUEE_GAP_PX}px`,
                "--marquee-duration": `${cycleSec.toFixed(1)}s`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <span ref={chunkRef} className="chadhava-title__chunk">
          {text}
        </span>
        {/* The second copy is what makes the wrap seamless; it is decorative
            duplication, so it is hidden from screen readers. */}
        {isScrolling && (
          <span className="chadhava-title__chunk chadhava-title__chunk--dup" aria-hidden="true">
            {text}
          </span>
        )}
      </span>
    </h3>
  );
};

interface ChadhavaCardProps {
  id: string;
  imageUrl: string;
  title: string;
  location: string;
  date: string;
  price?: number;
  /** First card in the strip — loads its image without deferring. */
  priority?: boolean;
}

function parseToDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const base = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const ts = Date.parse(base);
  if (!Number.isFinite(ts)) return null;
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDisplayDate(dateStr: string) {
  const parsed = parseToDate(dateStr);
  if (!parsed) return dateStr;
  return parsed.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTimeLeft(target: Date | null, now: number) {
  if (!target || now === 0) return null;
  const diff = target.getTime() - now;
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

const ChadhavaCard: React.FC<ChadhavaCardProps> = ({
  id,
  imageUrl,
  title,
  location,
  date,
  price,
  priority = false,
}) => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const queryClient = useQueryClient();
  const detailPath = `/newchadhavapage/detail/${buildDetailSlug(title, id)}`;

  const prefetchDetail = useCallback(() => {
    const cid = String(id || "");
    if (!cid) return;
    queryClient.prefetchQuery({
      queryKey: NEW_CHADHAVA_KEYS.detail(cid),
      queryFn: () => fetchNewChadhavaById(cid),
      staleTime: 5 * 60 * 1000,
    });
  }, [id, queryClient]);

  const targetDate = useMemo(() => parseToDate(date), [date]);

  // One shared clock for every card on the page, rather than one interval each.
  const now = useNowTicker();
  const time = getTimeLeft(targetDate, now);

  const onShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}${detailPath}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Join ${title} at ${location}`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // User dismissed the share sheet, or the clipboard was blocked — neither
      // is worth surfacing.
    }
  };

  return (
    /* The card used to be role="button" with a <button> and a <Link><button>
       inside it. Now: exactly one link covering the card, and the share control
       as a DOM sibling layered above it — no nested interactive elements, and a
       real crawlable href to the detail page. */
    <article className="group relative bg-white rounded-[18px] overflow-hidden flex flex-col border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-200 h-full shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
      <button
        type="button"
        title="Share"
        aria-label={`Share ${title}`}
        onClick={onShare}
        className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 text-gray-400 hover:text-orange-500 shadow-sm border border-gray-100 hover:border-orange-200 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>

      <Link
        href={detailPath}
        onMouseEnter={prefetchDetail}
        onFocus={prefetchDetail}
        onTouchStart={prefetchDetail}
        className="flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-[18px]"
      >
        {/* ── IMAGE ZONE ── */}
        <div className="relative bg-[#0d1b3e] w-full overflow-hidden flex-shrink-0 aspect-[16/9]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              // Kept in step with the card widths on the <li> below — this is
              // what decides which resized file the optimizer serves.
              sizes="(max-width: 600px) 175px, 320px"
              // Only the first card is anywhere near the viewport; the rest of the
              // strip is off to the right. Every card used to be loading="eager".
              priority={priority}
              loading={priority ? undefined : "lazy"}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-900 to-amber-700" />
          )}

          {time && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white text-gray-800 text-[9px] font-semibold rounded-md px-1.5 py-0.5 shadow-sm border border-gray-100">
              <span className="w-[4px] h-[4px] rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
              <span className="notranslate">
                {time.d}d {pad(time.h)}:{pad(time.m)}:{pad(time.s)}
              </span>
            </div>
          )}
        </div>

        <div className="w-full h-px bg-gray-100 flex-shrink-0" />

        {/* ── CONTENT ZONE ── */}
        <div className="flex flex-col flex-1 px-2.5 pt-2 pb-2.5 gap-1">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
            <svg className="w-2.5 h-2.5 text-orange-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="truncate">{location}</span>
          </div>

          <MarqueeTitle text={title} />

          <div className="flex items-center gap-1 text-[10px] text-orange-700 font-semibold">
            <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="truncate">{formatDisplayDate(date)}</span>
          </div>

          <div className="flex-1" />

          <div className="border-t border-gray-100 pt-2 mt-0.5 flex items-center justify-between gap-2">
            {price !== undefined && price > 0 ? (
              <div className="flex-shrink-0">
                <span className="text-[9px] text-gray-500 block leading-none mb-0.5">From</span>
                <span className="text-[13px] font-extrabold text-gray-900 leading-none">{money(price)}</span>
              </div>
            ) : (
              <div className="flex-shrink-0" />
            )}
            <span className="flex-1 min-w-0 text-center bg-orange-700 group-hover:bg-orange-800 text-white font-bold text-[10px] py-2 rounded-xl transition-all duration-150 shadow-sm whitespace-nowrap">
              Participate Now
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
};

/** Matches the real card footprint so the strip does not resize when data lands. */
const CardSkeleton = () => (
  <div className="flex-none w-[175px] sm:w-[320px] rounded-[18px] border border-gray-200 overflow-hidden bg-white">
    <div className="w-full aspect-[16/9] bg-gray-200 animate-pulse" />
    <div className="p-2.5 space-y-2">
      <div className="h-2 w-1/2 bg-gray-200 rounded animate-pulse" />
      <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
      <div className="h-2 w-2/3 bg-gray-200 rounded animate-pulse" />
      <div className="h-7 w-full bg-gray-200 rounded-xl animate-pulse" />
    </div>
  </div>
);

const SectionHeading = () => (
  <SectionHeader
    className="mb-2 md:mb-1 mt-4 md:mt-1"
    title="UPCOMING CHADHAVA"
    action={
      <Link
        href="/chadhava"
        aria-label="See all chadhava"
        className="flex items-center gap-2 px-2 md:px-6 py-1 md:py-2 rounded-full border border-orange-400 bg-white/30 backdrop-blur-sm text-orange-700 font-semibold hover:bg-orange-50 hover:text-orange-500 transition-colors shadow-md text-[8px] md:text-sm"
      >
        See All <ArrowForward style={{ fontSize: 12 }} />
      </Link>
    }
  />
);

interface ChadhavaComponentProps {
  /** Server-fetched list, so these cards appear in the server HTML. */
  initialChadhava?: unknown[] | null;
}

const ChadhavaComponent = ({ initialChadhava }: ChadhavaComponentProps) => {
  const {
    data: chadhavaData = [],
    isLoading,
    isError,
    refetch,
  } = useNewChadhavaListQuery(true, initialChadhava as never);

  const filteredData = useMemo(() => {
    if (!Array.isArray(chadhavaData)) return [];
    const now = new Date();
    const parseBool = (v: any) => v === true || v === "true" || v === 1 || v === "1";

    return chadhavaData
      .filter((item: any) => {
        if (!parseBool(item.isActive)) return false;
        if (!item.availableDates?.[0]) return false;
        const d = new Date(item.availableDates[0]);
        if (isNaN(d.getTime())) return false;
        d.setHours(23, 59, 59, 999);
        return d >= now;
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.availableDates[0]).getTime() - new Date(b.availableDates[0]).getTime(),
      );
  }, [chadhavaData]);

  // Same as Puja: an empty array means the server checked and found nothing
  // scheduled, so the client must not flash a skeleton into a closed slot.
  const serverFoundNothing = Array.isArray(initialChadhava) && initialChadhava.length === 0;
  if (serverFoundNothing && filteredData.length === 0) return null;

  if (isLoading) {
    // A 50vh centred spinner that collapsed to a ~250px strip was two layout
    // shifts per load. This skeleton occupies the final height.
    return (
      <div className={SECTION_BOX}>
        <SectionHeading />
        <div className="w-full overflow-hidden mb-3">
          <div className="flex gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // A failed request and "nothing scheduled" are different situations. The
  // error keeps the section's reserved height (so the page below it does not
  // jump) and offers a retry; a genuinely empty schedule collapses, because
  // leaving an empty box on the page would be worse than the one-off reflow.
  //
  // `filteredData.length === 0` guards it: when the server already rendered a
  // preview, a failed client refetch keeps showing that content rather than
  // replacing real cards with an error box.
  // Same reasoning as Puja: when the server rendered this slot empty, a late
  // error block would push everything below it down. Stay silent instead.
  if (isError && filteredData.length === 0 && !initialChadhava?.length) {
    console.error("[Chadhava] list unavailable; section left empty to avoid a layout shift");
    return null;
  }

  if (isError && filteredData.length === 0) {
    return (
      <div className={SECTION_BOX}>
        <SectionHeading />
        <div className="w-full py-8 text-center">
          <p className="text-sm text-gray-600">We couldn&apos;t load the upcoming chadhava.</p>
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

  if (filteredData.length === 0) return null;

  return (
    <div className={SECTION_BOX}>
      <SectionHeading />

      <div className="w-full overflow-x-auto hide-scrollbar mb-3 [-webkit-overflow-scrolling:touch]">
        <ul className="flex flex-nowrap items-stretch gap-2.5 list-none m-0 p-0 py-0.5">
          {filteredData.map((chadhava: any, index: number) => {
            const mandirName = chadhava.selectedMandirs?.[0]?.nameEnglish || "In Temple";
            const imgUrl =
              chadhava.chadhavaWebCardImage?.location ||
              chadhava.chadhavaInnerImages?.[0]?.location ||
              "";

            let minPrice = 0;
            if (chadhava.chadhavaSections) {
              const allPrices: number[] = [];
              chadhava.chadhavaSections.forEach((sec: any) => {
                sec.items?.forEach((it: any) => {
                  if (it.itemPrice) allPrices.push(it.itemPrice);
                });
              });
              if (allPrices.length > 0) minPrice = Math.min(...allPrices);
            }

            return (
              <li
                key={chadhava._id}
                className="flex-none flex flex-col w-[165px] sm:w-[280px] max-w-[200px] sm:max-w-[290px]"
              >
                <ChadhavaCard
                  id={chadhava._id}
                  imageUrl={imgUrl}
                  title={chadhava.chadhavaName}
                  price={minPrice > 0 ? minPrice : undefined}
                  location={mandirName}
                  date={String(chadhava.availableDates?.[0] ?? "").split("T")[0]}
                  priority={index === 0}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ChadhavaComponent;
