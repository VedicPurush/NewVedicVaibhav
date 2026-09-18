"use client";

import { useCallback } from "react";
import { buildDetailSlug } from "@/lib/slug";
import { useMoney } from "@/lib/currency";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { PUJA_KEYS } from "@/lib/query-keys/puja.keys";
import { fetchActivePoojaById } from "@/lib/api/puja.api";
import type { PujaBadge } from "./badgePresets";

interface PujaGridCardProps {
  id: string;
  imgSrc: string;
  title: string;
  location: string;
  dateLabel: string;
  description?: string;
  price: number;
  badge: PujaBadge;
  /** Overrides the default select-package route, for pujas with their own landing page. */
  href?: string;
}

const PujaGridCard: React.FC<PujaGridCardProps> = ({
  id,
  imgSrc,
  title,
  location,
  dateLabel,
  description,
  price,
  href,
  badge,
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
      className="group h-full min-w-0 overflow-hidden rounded-2xl border border-orange-100/80 bg-white shadow-[0_4px_18px_rgba(120,53,15,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_12px_30px_rgba(120,53,15,0.14)] cursor-pointer flex flex-col"
      onMouseEnter={prefetchDetail}
      onFocus={prefetchDetail}
      onClick={() => router.push(href ?? `/services/puja/${buildDetailSlug(title, id)}/select-package`)}
    >
      <div className="relative overflow-hidden bg-orange-50">
        <img
          src={imgSrc}
          alt={title}
          loading="lazy"
          className="block w-full h-[158px] object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white shadow-md ${badge.className}`}
        >
          <span aria-hidden>{badge.icon}</span>
          {badge.label}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1 min-h-[170px]">
        <h3 className="font-display text-[15px] font-semibold text-stone-800 leading-snug line-clamp-2 min-h-[38px]">
          {title}
        </h3>
        <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-stone-500">
          <LocationOnRoundedIcon style={{ fontSize: 14, color: "#EA580C" }} />
          <span className="truncate">{location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-stone-500">
          <CalendarMonthRoundedIcon style={{ fontSize: 14, color: "#EA580C" }} />
          <span>{dateLabel}</span>
        </div>
        {description && (
          <p className="text-[12px] text-stone-500 leading-relaxed line-clamp-2">{description}</p>
        )}
        <div className="mt-auto pt-3 flex items-end justify-between gap-3 border-t border-stone-100">
          <div>
            <div className="text-[10px] text-stone-400 leading-none">From</div>
            <div className="text-[15px] font-bold text-stone-800">{money(price)}</div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-orange-600 group-hover:bg-orange-700 text-white text-[12px] font-semibold px-4 py-2 shadow-sm transition-colors">
            Book Now
            <ChevronRightRoundedIcon style={{ fontSize: 15 }} />
          </span>
        </div>
      </div>
    </div>
  );
};

export default PujaGridCard;
