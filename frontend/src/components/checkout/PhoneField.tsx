"use client";

import React from "react";
import { COUNTRIES, isValidPhone, sanitizePhone, useMoney, type Country } from "@/lib/currency";

/**
 * A dial-code-aware phone input.
 *
 * The value it reports is the BARE NATIONAL NUMBER (no dial code) — the same
 * thing every existing form in this app already holds in state, so a form can
 * adopt this component without touching its validation or its submit payload.
 *
 * Call `toStoredPhone(value, country)` at submit time to get the value to send:
 * bare 10 digits for India, dial-prefixed for everyone else.
 */
export function PhoneField({
  value,
  onChange,
  country,
  onCountryChange,
  placeholder,
  error,
  className = "",
  inputClassName = "",
  id,
  name,
  required,
  onBlur,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Defaults to the detected country; pass one to keep phone and address in step. */
  country?: Country;
  /** Provided only when the phone's country may differ from the pricing country. */
  onCountryChange?: (iso2: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  name?: string;
  required?: boolean;
  onBlur?: () => void;
}) {
  const money = useMoney();
  const c = country ?? money.country;

  const handleCountry = (iso2: string) => {
    // The old number belongs to the old numbering plan — re-sanitising it against
    // the new one silently truncates it, so it is cleared instead of mangled.
    onChange("");
    (onCountryChange ?? money.setCountry)(iso2);
  };

  const digits = String(value ?? "").replace(/\D/g, "");
  const showLengthHint = digits.length > 0 && !isValidPhone(digits, c);

  return (
    <div className={className}>
      <div
        className={`flex items-stretch overflow-hidden rounded-lg border ${
          error ? "border-red-400" : "border-gray-300"
        } focus-within:border-orange-500`}
      >
        {/* Same invisible-native-select trick as CountryPicker — the OS picker is
            better than anything custom, especially on a phone. */}
        <div className="relative flex items-center gap-1 bg-gray-50 px-3 text-sm text-gray-700">
          <span aria-hidden="true">{c.flag}</span>
          <span className="font-medium">+{c.dial}</span>
          <select
            aria-label="Country calling code"
            value={c.iso2}
            onChange={(e) => handleCountry(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {COUNTRIES.map((opt) => (
              <option key={opt.iso2} value={opt.iso2}>
                {opt.flag} {opt.name} (+{opt.dial})
              </option>
            ))}
          </select>
        </div>

        <input
          id={id}
          name={name}
          required={required}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={value}
          onBlur={onBlur}
          // Capped at this country's maximum national number length, so a paste of
          // "+971 50 123 4567" cannot silently become an over-long number.
          onChange={(e) => onChange(sanitizePhone(e.target.value, c))}
          placeholder={placeholder ?? (c.iso2 === "IN" ? "WhatsApp number" : "Phone number")}
          className={`w-full px-3 py-2 text-sm outline-none ${inputClassName}`}
        />
      </div>

      {error ? (
        <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>
      ) : showLengthHint ? (
        <p className="mt-1 text-[11px] text-gray-500">
          {c.phone[0] === c.phone[1]
            ? `${c.name} numbers are ${c.phone[0]} digits.`
            : `${c.name} numbers are ${c.phone[0]}–${c.phone[1]} digits.`}
        </p>
      ) : null}
    </div>
  );
}

export default PhoneField;
