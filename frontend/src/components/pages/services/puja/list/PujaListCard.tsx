"use client";

import { useCallback } from "react";
import { buildDetailSlug } from "@/lib/slug";
import { useMoney } from "@/lib/currency";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { PUJA_KEYS } from "@/lib/query-keys/puja.keys";
import { fetchActivePoojaById } from "@/lib/api/puja.api";

interface PujaListCardProps {
  id: string;
  imgSrc: string;
  title: string;
  location: string;
  dateLabel: string;
  price: number;
  featured?: boolean;
  /** Overrides the default select-package route, for pujas with their own landing page. */
  href?: string;
}

const PujaListCard: React.FC<PujaListCardProps> = ({
  id,
  imgSrc,
  title,
  location,
  dateLabel,
  price,
  href,
  featured,
}) => {
  /** Prices display in the devotee's own currency; the India list price is
   *  the input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const router = useRouter();
  const queryClient = useQueryClient();

  const prefetchDetail = useCallback(() => {
    // Custom-route pujas are not in the pooja collections, so there is nothing to prefetch.
    if (!id || href) return;
    queryClient.prefetchQuery({
      queryKey: PUJA_KEYS.activeDetail(id),
      queryFn: () => fetchActivePoojaById(id),
      staleTime: 30 * 60 * 1000,
    });
  }, [id, href, queryClient]);

  return (
    <div
      className="flex gap-2.5 w-full min-w-0 bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.07)] p-2 cursor-pointer active:scale-[0.99] transition-transform"
      onTouchStart={prefetchDetail}
      onClick={() => router.push(href ?? `/services/puja/${buildDetailSlug(title, id)}/select-package`)}
    >
      <div className="relative shrink-0">
        <img
          src={imgSrc}
          alt={title}
          loading="lazy"
          className="w-[clamp(150px,42vw,170px)] h-[100px] object-cover rounded-xl"
        />
        {featured && (
          <span className="absolute top-1 left-1 flex items-center gap-0.5 rounded-md bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0.5 tracking-wide">
            <span style={{ fontSize: 8 }} aria-hidden>★</span> FEATURED
          </span>
        )}
      </div>
      <div className="flex flex-col justify-between py-0.5 min-w-0 flex-1 overflow-hidden">
        <div>
          <h3 className="font-display text-[13.5px] font-semibold text-stone-800 leading-snug line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center gap-1 text-[10.5px] text-stone-500 mt-1">
            <LocationOnRoundedIcon style={{ fontSize: 12, color: "#EA580C" }} />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center justify-between gap-1 text-[10px] text-stone-500 mt-1 min-w-0">
            <span className="flex items-center gap-1 whitespace-nowrap min-w-0">
              <CalendarMonthRoundedIcon style={{ fontSize: 12, color: "#EA580C" }} />
              <span className="truncate">{dateLabel}</span>
            </span>
            <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap">
              <AccessTimeRoundedIcon style={{ fontSize: 12, color: "#EA580C" }} />1 Day
            </span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-1.5 mt-1">
          <div className="leading-tight shrink-0">
            <div className="text-[9px] text-stone-400">From</div>
            <div className="text-[13px] font-bold text-stone-800">{money(price)}</div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-orange-600 text-white text-[10px] font-semibold px-2.5 py-1.5">
            Book Now
            <ChevronRightRoundedIcon style={{ fontSize: 13 }} />
          </span>
        </div>
      </div>
    </div>
  );
};

export default PujaListCard;
