"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { NEW_CHADHAVA_KEYS } from "@/lib/query-keys/newChadhava.keys";
import { fetchNewChadhavaById } from "@/lib/api/newChadhava.api";
import { buildDetailSlug } from "@/lib/slug";
import { motion } from "framer-motion";

interface ChadhavaCardProps {
  id: string;
  title: string;
  offerings: string[];
  description: string;
  location: string;
  date: string;
  imageUrl: string;
  price?: string;
}

// ---- Helpers ----
function parseToDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const normalized = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`;
  const ts = Date.parse(normalized);
  if (!Number.isFinite(ts)) return null;
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDisplayDate(dateStr: string) {
  const parsed = parseToDate(dateStr);
  if (!parsed) return "";
  return parsed.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTimeLeft(targetDate: Date | null) {
  if (!targetDate) return null;
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

const ChadhavaCard3: React.FC<ChadhavaCardProps> = ({
  id,
  title,
  offerings,
  description,
  location,
  date,
  imageUrl,
  price,
}) => {
  const qc = useQueryClient();

  const prefetchDetail = useCallback(() => {
    qc.prefetchQuery({
      queryKey: NEW_CHADHAVA_KEYS.detail(id),
      queryFn: () => fetchNewChadhavaById(id),
      staleTime: 30 * 60 * 1000,
    });
  }, [id, qc]);

  const targetDate = useMemo(() => parseToDate(date), [date]);
  const [time, setTime] = useState(() => getTimeLeft(targetDate));

  useEffect(() => {
    if (!targetDate) { setTime(null); return; }
    const tick = () => setTime(getTimeLeft(targetDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const pad = (n: number) => String(n).padStart(2, "0");

  const cleanDescription = description ? description.replace(/<[^>]*>?/gm, "") : "";
  const visibleOfferings = offerings.filter((o) => o !== title);

  return (
    <motion.div
      onMouseEnter={prefetchDetail}
      onFocus={prefetchDetail}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      viewport={{ once: true }}
      className="group relative bg-white rounded-[20px] overflow-hidden flex flex-col border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-250"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
    >
      {/* Absolute overlay Link for whole card clickability */}
      <Link href={`/newchadhavapage/detail/${buildDetailSlug(title, id)}`} className="absolute inset-0 z-10" />

      {/* ── IMAGE ZONE ─────────────────────────────────────── */}
      <div className="relative bg-[#0d1b3e] w-full overflow-hidden aspect-[16/9]">
        <img loading="lazy"
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
         />

        {/* Countdown pill — bottom-left */}
        {time && (
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 flex items-center gap-1 sm:gap-1.5 bg-white text-gray-800 text-[8px] sm:text-[10.5px] font-semibold rounded-md sm:rounded-lg px-1.5 sm:px-2.5 py-0.5 sm:py-1 shadow-sm border border-gray-100">
            <span className="w-[4px] h-[4px] sm:w-[5px] sm:h-[5px] rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
            <span className="notranslate">{time.d}d &nbsp;{pad(time.h)}:{pad(time.m)}:{pad(time.s)}</span>
          </div>
        )}
      </div>

      {/* Share — top-right (Placed outside image zone to maintain higher z-index over overlay) */}
      <button
        type="button"
        title="Share"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const text = `Participate in ${title} on ${formatDisplayDate(date)} at ${location}`;
          if (navigator.share) {
            navigator.share({ title, text, url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
          }
        }}
        className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 z-20 flex items-center justify-center rounded-full bg-white/90 text-gray-500 hover:text-orange-500 shadow-sm border border-gray-100 hover:border-orange-200 transition-colors duration-150"
      >
        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </button>

      {/* Hard separator */}
      <div className="w-full h-px bg-gray-100" />

      {/* ── CONTENT ZONE ───────────────────────────────────── */}
      <div className="flex flex-col flex-1 px-2.5 pt-2 pb-3 sm:px-4 sm:pt-3 sm:pb-4 gap-1.5 sm:gap-2.5">

        {/* Location + date meta */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[9px] sm:text-[11px] text-gray-400 font-medium gap-0.5 sm:gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 text-orange-500">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="font-semibold">{formatDisplayDate(date)}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-gray-900 font-bold text-[11.5px] sm:text-[14.5px] leading-snug line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-gray-400 text-[10px] sm:text-[11.5px] leading-relaxed line-clamp-2">
          {cleanDescription}
        </p>

        {/* Offerings chips */}
        {visibleOfferings.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleOfferings.slice(0, 2).map((o, i) => (
              <span key={`${o}-${i}`} className="text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100">
                {o}
              </span>
            ))}
          </div>
        )}

        {/* ── PRICE + CTA ROW ── */}
        <div className="border-t border-gray-100 pt-2 sm:pt-3 mt-0.5 sm:mt-1">
          {price && (
            <div className="mb-1.5 sm:mb-2 leading-none">
              <span className="text-[9px] sm:text-[11px] text-gray-400">Starting at </span>
              <span className="text-[12px] sm:text-[16px] font-extrabold text-gray-900">{price}</span>
            </div>
          )}
          <button className="w-full bg-orange-500  rounded-xl group-hover:bg-orange-600 group-active:scale-95 text-white font-bold text-[11px] sm:text-[14px] py-1.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-150 shadow-sm">
            Participate Now
          </button>
        </div>

      </div>
    </motion.div>
  );
};

export default ChadhavaCard3;
