"use client";

import { useState, useEffect } from "react";

interface CountdownProps {
  targetDate: string;
  isActive?: boolean;
}

const parseLocalEndOfDay = (dateStr: string): number => {
  // Parse "YYYY-MM-DD..." as local date at 23:59:59 to avoid UTC off-by-one in IST
  const parts = String(dateStr).split("T")[0].split("-");
  if (parts.length >= 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999).getTime();
  }
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

export default function CountdownTimer({
  targetDate = "2025-12-31T23:59:59",
  isActive = true,
}: CountdownProps) {
  const getTimeLeft = () => {
    const target = parseLocalEndOfDay(targetDate);
    const difference = target - Date.now();
    if (difference <= 0 || !isActive) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      expired: false,
    };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [targetDate, isActive]);

  if (timeLeft.expired) {
    return (
      <div className="inline-flex flex-col items-center bg-gradient-to-br from-red-50 via-red-100 to-red-50 rounded-2xl p-3 shadow-xl border border-red-200/60 mt-1">
        <h3 className="text-xs font-semibold text-red-700 tracking-wide mb-1">Booking Closed</h3>
        <div className="text-sm font-bold text-red-600">Event Ended</div>
      </div>
    );
  }

  const renderBox = (label: string, value: number) => (
    <div className="relative">
      <div className="w-14 h-10 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-lg flex flex-col items-center justify-center shadow-lg border border-amber-200/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-400/10 to-transparent"></div>
        <span className="text-xl font-bold text-amber-900 relative z-10" key={value}>
          {value}
        </span>
        <span className="text-[9px] font-medium text-amber-700/80 uppercase tracking-wide relative z-10">
          {label}
        </span>
      </div>
    </div>
  );

  return (
    <div className="inline-flex flex-col items-center bg-gradient-to-br from-orange-50/90 via-amber-50/90 to-yellow-50/90 backdrop-blur-sm rounded-2xl p-3 shadow-xl border border-amber-200/60 mt-1">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-semibold text-amber-900 tracking-wide">
          Puja Booking Closes In
        </h3>
      </div>
      <div className="flex gap-2 items-center">
        {renderBox("Days", timeLeft.days)}
        <span className="text-lg font-bold text-orange-600 pb-2">:</span>
        {renderBox("Hrs", timeLeft.hours)}
        <span className="text-lg font-bold text-orange-600 pb-2">:</span>
        {renderBox("Min", timeLeft.minutes)}
        <span className="text-lg font-bold text-orange-600 pb-2">:</span>
        {renderBox("Sec", timeLeft.seconds)}
      </div>
    </div>
  );
}
