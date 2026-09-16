"use client";

import React from "react";
import { useNowTicker } from "@/hooks/useNowTicker";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * The moment the puja day begins in IST. Puja dates are stored as a calendar
 * day (e.g. 2026-09-30T00:00Z), so the countdown runs to midnight of that day
 * in India rather than to the raw UTC timestamp.
 */
const pujaDayStart = (isoDate: string): number => {
  const day = new Date(isoDate).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new Date(`${day}T00:00:00+05:30`).getTime();
};

/** Short forms are used below 380px, where the full words do not fit beside the values. */
const UNITS = [
  { label: "Days", short: "D" },
  { label: "Hrs", short: "H" },
  { label: "Min", short: "M" },
  { label: "Sec", short: "S" },
] as const;

/**
 * Live "time left" to the puja date. Kept as its own component so the 1Hz tick
 * re-renders only this strip, not the whole landing page.
 */
const PujaCountdown: React.FC<{ isoDate?: string }> = ({ isoDate }) => {
  const now = useNowTicker();
  if (!isoDate) return null;

  const target = pujaDayStart(isoDate);
  if (isNaN(target)) return null;

  // `now` is 0 on the server and during hydration — show placeholders so the
  // strip keeps its height and the server HTML matches the first client render.
  const started = now > 0;
  const remaining = Math.max(0, target - now);
  if (started && remaining === 0) return null;

  const totalSeconds = Math.floor(remaining / 1000);
  const values = [
    Math.floor(totalSeconds / 86400),
    Math.floor((totalSeconds % 86400) / 3600),
    Math.floor((totalSeconds % 3600) / 60),
    totalSeconds % 60,
  ];

  return (
    <div
      className="flex items-center justify-between gap-2 rounded-t-xl bg-[#FFF1F1] border border-b-0 border-[#F3C9C9] pl-3 pr-2.5 py-1.5"
      role="timer"
      aria-live="off"
    >
      <span className="min-w-0 text-[12px] md:text-[13px] font-semibold text-[#7A0F1F] leading-tight">
        Puja begins in
      </span>
      <div className="shrink-0 flex items-center justify-end gap-1.5 min-[380px]:gap-2.5 md:gap-4">
        {UNITS.map((unit, i) => (
          <div key={unit.label} className="flex items-center gap-0.5 min-[380px]:gap-1">
            <span className="flex items-center justify-center h-7 min-w-[30px] px-1.5 rounded-[9px] bg-gradient-to-b from-[#A3213A] to-[#7A0F1F] text-white text-[14px] font-bold tabular-nums leading-none shadow-[0_1px_3px_rgba(122,15,31,0.25)]">
              {started ? pad(values[i]) : "--"}
            </span>
            <span className="text-[10px] font-medium text-stone-500 leading-none">
              <span className="hidden min-[380px]:inline">{unit.label}</span>
              <span className="min-[380px]:hidden">{unit.short}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PujaCountdown;
