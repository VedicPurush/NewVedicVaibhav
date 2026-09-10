"use client";

/**
 * PhoneAutoFillInput
 * ------------------
 * A self-contained WhatsApp/phone input that:
 *  - Accepts exactly 10 digits
 *  - Debounces 500 ms then calls GET /get-user-by-phone/:phone
 *  - Fires `onUserFetched` with a normalised UserFetchResult when found
 *  - Shows an inline spinner while fetching and a "✓ Details filled" hint on success
 *
 * Usage (drop into any payment form):
 *
 *   <PhoneAutoFillInput
 *     value={form.whatsapp}
 *     onChange={(val) => setForm((p) => ({ ...p, whatsapp: val }))}
 *     onUserFetched={({ name, email, gotra }) =>
 *       setForm((p) => ({
 *         ...p,
 *         name: name || p.name,
 *         email: email || p.email,
 *         gotra: gotra || p.gotra,
 *       }))
 *     }
 *     error={errors.whatsapp}
 *   />
 */

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface UserFetchResult {
  name: string; // full name (combined first + last, or .name)
  email: string;
  gotra: string;
  phone: string; // normalised 10-digit
  raw: Record<string, any>; // original API user object if you need other fields
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Controlled value (digits only, max 10) */
  value: string;
  /** Called with cleaned digit-only string on every keystroke */
  onChange: (value: string) => void;
  /** Called once when a matching user is found in the DB */
  onUserFetched?: (result: UserFetchResult) => void;
  /** Validation error message shown below the field */
  error?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Extra className on the outer wrapper div */
  className?: string;
}

// ─── Internals ────────────────────────────────────────────────────────────────

const PHONE_RE = /^[6-9]\d{9}$/;

function normaliseUser(u: Record<string, any>): UserFetchResult {
  const fn = u.firstname || u.firstName || u.given_name || "";
  const ln = u.lastname || u.lastName || u.family_name || "";
  const full = `${fn} ${ln}`.trim() || u.name || "";
  let ph = (u.phone || "").replace(/\D/g, "");
  if (ph.startsWith("91") && ph.length === 12) ph = ph.slice(2);
  return { name: full, email: u.email || "", gotra: u.gotra || "", phone: ph, raw: u };
}

// ─── Component ────────────────────────────────────────────────────────────────

const PhoneAutoFillInput = ({
  value,
  onChange,
  onUserFetched,
  error,
  placeholder = "10-digit WhatsApp number",
  className = "",
}: Props) => {
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const lastFetched = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef(onUserFetched);

  // Keep callback ref fresh without re-triggering the effect
  useEffect(() => {
    cbRef.current = onUserFetched;
  });

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    const ph = value.trim();

    // Reset hint when user clears or edits to < 10 digits
    if (!PHONE_RE.test(ph)) {
      setStatus("idle");
      return;
    }

    // Don't re-fetch the same number
    if (ph === lastFetched.current) return;

    setStatus("loading");
    timer.current = setTimeout(async () => {
      lastFetched.current = ph;
      try {
        const { data } = await api.get(`/get-user-by-phone/${ph}`);
        if (data?.user) {
          setStatus("found");
          cbRef.current?.(normaliseUser(data.user));
        } else {
          setStatus("notfound");
        }
      } catch (err: any) {
        // 404 = new user, not an error worth showing
        setStatus(err?.response?.status === 404 ? "notfound" : "idle");
      }
    }, 500);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);

  const borderColor = error
    ? "border-red-400"
    : status === "found"
      ? "border-green-400"
      : "border-orange-200 focus-within:border-orange-400";

  return (
    <div className={className}>
      {/* Input row */}
      <div
        className={`flex items-center rounded-xl border-2 overflow-hidden bg-white transition-colors ${borderColor}`}
      >
        {/* Country prefix */}
        <span className="pl-3 pr-2 text-sm font-semibold text-gray-400 select-none shrink-0">
          +91
        </span>
        <div className="w-px h-5 bg-gray-200 shrink-0" />

        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          className="flex-1 py-2.5 px-3 outline-none text-sm text-gray-800 placeholder:text-gray-400 bg-white"
        />

        {/* Status indicator */}
        <span className="pr-3 shrink-0">
          {status === "loading" && (
            <svg className="animate-spin w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {status === "found" && (
            <svg className="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </div>

      {/* Hints below the input */}
      {status === "found" && !error && (
        <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
          ✓ Details filled from your profile
        </p>
      )}
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠️ {error}</p>}
    </div>
  );
};

export default PhoneAutoFillInput;
