"use client";

import React from "react";
import { COUNTRIES, clearCountryPin, useMoney } from "@/lib/currency";

/**
 * "Paying from 🇺🇸 United States · USD" — the pill that tells a devotee which
 * market they are being priced in, and lets them change it.
 *
 * A NATIVE <select> IS LAYERED INVISIBLY OVER THE PILL. That is the whole trick:
 * a custom dropdown would need its own keyboard handling, scroll containment and
 * mobile behaviour, and would still be worse than the OS picker on a phone. The
 * styled markup below is purely visual; every interaction is the platform's.
 */
export function CountryPicker({ className = "" }: { className?: string }) {
  const { country, currency, setCountry } = useMoney();

  const onChange = (value: string) => {
    if (value === "__auto") {
      // The escape hatch. Without it, one mis-tap pins a country for good.
      clearCountryPin();
      return;
    }
    setCountry(value);
  };

  return (
    <div
      className={`relative inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/70 px-3 py-1.5 text-[12px] font-medium text-gray-700 ${className}`}
    >
      <span className="text-gray-500">Paying from</span>
      <span aria-hidden="true">{country.flag}</span>
      <span className="font-semibold text-gray-900">{country.name}</span>
      <span className="text-gray-400">·</span>
      <span className="font-semibold text-orange-600">{currency}</span>
      <svg
        className="h-3 w-3 text-gray-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>

      <select
        aria-label="Change your country"
        value={country.iso2}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso2} value={c.iso2}>
            {c.flag} {c.name} · {c.currency}
          </option>
        ))}
        <option value="__auto">📍 Detect automatically</option>
      </select>
    </div>
  );
}

export default CountryPicker;
