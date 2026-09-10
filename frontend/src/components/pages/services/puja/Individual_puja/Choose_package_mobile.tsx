"use client";

﻿import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/layout/Layout";
import { useAnyPoojaDetailQuery, useMandirByIdQuery } from "@/hooks/useAllPoojas";
import { getVvUtm } from "@/lib/utm";
import { api } from "@/lib/api";
import { orderRequestFields, useMoney, toInr } from "@/lib/currency";
import { extractIdFromSlug } from "@/lib/slug";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";

/* ==========================================================================
   Booking helpers — behaviour mirrored from Payment.tsx so both entry points
   create identical bookings.
   ========================================================================== */
const normalizeMobile = (mobile: string) => {
  const digits = (mobile || "").replace(/\D/g, "");
  return digits.length <= 10 ? digits : digits.slice(-10);
};

const makeSafeEmail = (mobile: string, email?: string) => {
  const trimmed = (email || "").trim();
  if (trimmed) return trimmed;
  const digits = normalizeMobile(mobile);
  return digits ? `${digits}@gmail.com` : "user@gmail.com";
};

const formatDateToMDY = (dateValue: string | number | Date) => {
  const date = new Date(dateValue);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
};

/** "Sat, 25 Jul 2026" — how dates read on the page */
const formatDateLong = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * Upcoming dates only, earliest first. A puja stays bookable for the whole of
 * its own day, so the cutoff is the start of today rather than "now".
 */
const upcomingDates = (dates: any[]): string[] => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return (dates || [])
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()) && d >= startOfToday)
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => d.toISOString());
};

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.getElementById("razorpay-js");
    if (existing) return resolve(true);
    const script = document.createElement("script");
    script.id = "razorpay-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

/* ==========================================================================
   STATIC COPY
   --------------------------------------------------------------------------
   Everything below is either fixed chrome or a field the pooja schema does
   not carry yet. See the "NOT IN API" notes on each one — once the backend
   grows these fields, read them off the document instead.
   ========================================================================== */
const STATIC = {
  bannerTitle: "Reserve Your Sankalp",
  perMemberPrice: 101, // NOT IN API — no per-extra-member price on the mandir entry
  shastraQuoteIntro: "The shastra says:",

  // NOT IN API — hero chips. Generic so they hold for any pooja/mandir.
  highlights: ["Puja video sent to you", "Sankalp with name & gotra", "Prasad home delivery"],

  trust: {
    primary: {
      title: "Performed at the Dham",
      subtitle: "Real puja by verified Ved-pathi Brahmins",
    },
    secondary: [
      { title: "Video Proof", subtitle: "Your name & gotra audible in the sankalp", icon: "🎥" },
      { title: "Secure Payment", subtitle: "UPI, cards & net-banking supported", icon: "🛡️" },
    ],
  },
};

/* Pooja/mandir documents store rich text authored in the admin panel. */
const stripHtml = (html?: string): string => {
  if (!html) return "";
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "").trim();
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || el.innerText || "").trim();
};

/* The shape the layout below consumes.
   --------------------------------------------------------------------------
   Two document shapes feed this:
     "new"    — `newpoojas`: mandir embedded in mandirDetails[], one price pair
                on the document, poojaTags[] for the hero chips
     "legacy" — `poojas`:    mandir referenced via mandirLists[].mandirId and
                fetched separately, price inside singlePackage
   Everything below the switch is shape-agnostic. */
const buildViewModel = (
  pooja: any,
  mandir: any,
  colorOverride?: string,
  source: "new" | "legacy" = "legacy"
) => {
  const isNew = source === "new";

  const md = pooja?.mandirDetails?.[0]; // new shape
  const m = pooja?.mandirLists?.[0]; // legacy shape
  const mandirRef = typeof m?.mandirId === "object" ? m.mandirId : null;

  const mandirName = isNew
    ? md?.name || ""
    : mandir?.nameEnglish || mandirRef?.nameEnglish || "";

  const state = isNew ? md?.state || "" : mandir?.state || "";
  const location = isNew
    ? md?.location || [md?.city, md?.state].filter(Boolean).join(", ")
    : [mandir?.city, mandir?.state].filter(Boolean).join(", ");

  // new: discountPrice is what the devotee pays, originalPrice is the strike-through
  const basePrice = isNew
    ? pooja?.discountPrice ?? pooja?.originalPrice ?? 0
    : m?.singlePackage?.price ?? 0;

  const tags: string[] = Array.isArray(pooja?.poojaTags) ? pooja.poojaTags.filter(Boolean) : [];

  // the by-id endpoint does not filter on isActive, so the page must.
  const rawDates: any[] = (isNew ? pooja?.poojaDates : m?.poojaMandirDates) || [];
  const dates = upcomingDates(rawDates);
  // had a schedule once, but every date has passed
  const isExpired = rawDates.length > 0 && dates.length === 0;
  const isBookable = !!pooja && pooja.isActive !== false && !isExpired;

  return {
    // ?themeColor=%23C1440E previews a colour before it is set on the document
    palette: makePalette(colorOverride || pooja?.poojaColor),
    source,

    heroImage: pooja?.images?.[0] || pooja?.poojaCardImage || "",
    mandirName,
    state,
    title: pooja?.title || "",
    titleHindi: pooja?.titleHindi || "",
    shortDescription: stripHtml(pooja?.poojaCardBenefit),
    // the new schema carries real tags; legacy still has none, so fall back
    highlights: tags.length
      ? tags
      : mandirName
      ? [...STATIC.highlights, `At ${mandirName}`]
      : STATIC.highlights,

    // the temple photo is the sankalp banner; appImage is the fallback for
    // poojas that still ship a pre-composed banner instead
    bannerImage: isNew
      ? md?.image || pooja?.appImage || ""
      : pooja?.appImage || mandir?.mandirPoojaImage || "",
    bannerTitle: STATIC.bannerTitle,

    // new shape schedules on the pooja itself; legacy schedules per mandir
    poojaDates: dates,
    poojaTime: isNew ? md?.timings || "" : m?.poojaMandirTime || "",
    isBookable,
    isExpired,

    basePrice,
    // shown struck through when it is genuinely higher than what is charged
    strikePrice: isNew && pooja?.originalPrice > basePrice ? pooja.originalPrice : 0,
    basePriceLabel: pooja?.title || "Seva (base)",
    // must match what the server recomputes in verifyOrderAmount, or the order
    // is rejected — the document is the source of truth, not STATIC
    perMemberPrice: isNew
      ? pooja?.familyMemberPrice ?? STATIC.perMemberPrice
      : STATIC.perMemberPrice,

    aboutHtml: isNew
      ? pooja?.poojaDescription || ""
      : m?.singlePackage?.description || pooja?.poojaDescription || "",
    shastraQuote: pooja?.moolmantra || "", // moolmantra stands in for the quote line
    aboutClosing: isNew ? md?.significance || "" : stripHtml(m?.poojaMandirBenefits),

    templeFacts: (isNew
      ? [
          { label: "Temple", value: md?.name || "" },
          { label: "Presiding Deity", value: md?.deity || pooja?.poojaGod || "" },
          { label: "Location", value: location },
          { label: "Significance", value: md?.significance || "" },
          { label: "Sacred Landmarks", value: (md?.sacredLandmarks || []).join(", ") },
          { label: "Darshan Season", value: md?.darshanSeason || "" },
          { label: "Timings", value: md?.timings || "" },
        ]
      : [
          { label: "Temple", value: mandirName },
          { label: "Presiding Deity", value: pooja?.poojaGod || "" },
          { label: "Location", value: location },
          // legacy mandir has no significance / landmarks / season fields
        ]
    ).filter((row) => row.value),

    benefits: [
      { heading: pooja?.poojaBenefits?.benefit1Heading, desc: pooja?.poojaBenefits?.benefit1Desc },
      { heading: pooja?.poojaBenefits?.benefit2Heading, desc: pooja?.poojaBenefits?.benefit2Desc },
      { heading: pooja?.poojaBenefits?.benefit3Heading, desc: pooja?.poojaBenefits?.benefit3Desc },
    ].filter((b) => b.heading && b.desc),

    trust: STATIC.trust,
  };
};

type ViewModel = ReturnType<typeof buildViewModel>;

/* ========================================================================== */

/* --------------------------------------------------------------------------
   Theming
   --------------------------------------------------------------------------
   `poojaColor` on the pooja document is the primary colour for that puja.
   Everything that used to be hard-coded navy is derived from it; the warm
   cream/orange base stays fixed as the brand ground it sits on.
   -------------------------------------------------------------------------- */
const BASE_PRIMARY = "#16264A";

const isHex = (v?: string): v is string => !!v && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());

const toRgb = (hex: string) => {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ] as const;
};

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0")).join("");

/** ratio 0 → untouched, 1 → white */
const tint = (hex: string, ratio: number) => {
  const [r, g, b] = toRgb(hex);
  return toHex(r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio);
};

/** ratio 0 → untouched, 1 → black */
const shade = (hex: string, ratio: number) => {
  const [r, g, b] = toRgb(hex);
  return toHex(r * (1 - ratio), g * (1 - ratio), b * (1 - ratio));
};

/* When poojaColor is absent the palette must reproduce the original navy/cream
   design exactly, so the untinted brand values are kept as the fallback set. */
const BRAND = {
  gold: "#D9A441",
  cream: "#FDF4E7",
  creamCard: "#FBEFDD",
  line: "#E7D6BC",
  orange: "#C1440E",
  ink: "#2C2118",
  inkSoft: "#6B5C4A",
};

/** WCAG relative luminance, 0 (black) → 1 (white) */
const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const makePalette = (poojaColor?: string) => {
  const themed = isHex(poojaColor);
  const raw = themed ? poojaColor.trim() : BASE_PRIMARY;

  // The primary sits behind white text (hero panel, Book Puja buttons). A light
  // poojaColor — yellow, pale gold — would leave that text unreadable, so
  // darken it until it can carry white. Tints below still use the raw colour,
  // which keeps the page recognisably that hue.
  let primary = raw;
  // 0.22 is the point where white text clears WCAG AA (4.5:1) against it
  while (luminance(primary) > 0.22) primary = shade(primary, 0.12);

  return {
    // --- primary family ---
    navy: primary,
    navyDeep: shade(primary, 0.28),
    heroFade: toRgb(primary), // hero gradient needs the channels, not the hex
    paper: tint(raw, 0.965),
    paperLine: tint(raw, 0.84),
    chip: tint(raw, 0.9),
    chipInk: shade(primary, 0.1),
    paperInk: shade(primary, 0.15),

    // --- page ground ---
    // themed: light tints of the puja colour, so the whole page carries it.
    // untinted: the original cream brand values, pixel-identical to before.
    cream: themed ? tint(raw, 0.955) : BRAND.cream,
    creamCard: themed ? tint(raw, 0.915) : BRAND.creamCard,
    line: themed ? tint(raw, 0.8) : BRAND.line,
    gold: themed ? tint(raw, 0.45) : BRAND.gold,
    // accent stays a deepened, more saturated cousin of the primary rather than
    // a fixed orange, so labels and totals still read as "the puja's colour"
    orange: themed ? shade(primary, 0.2) : BRAND.orange,
    ink: themed ? shade(primary, 0.72) : BRAND.ink,
    inkSoft: themed ? tint(shade(primary, 0.5), 0.35) : BRAND.inkSoft,
  };
};

type Palette = ReturnType<typeof makePalette>;

/** default palette — used by chrome that renders before the pooja loads */
const PALETTE = makePalette();

/* Prices may carry paise (the new schema stores e.g. 399.99), and the amount
   shown must equal the amount charged — so never floor. Whole rupees render
   without a decimal, anything else keeps both places. */
const formatINR = (n: number) => {
  const value = Number(n) || 0;
  const hasPaise = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(value);
};

/* Razorpay rejects non-integer paise, and float maths (0.29 * 100) drifts. */
const toPaise = (rupees: number) => Math.round((Number(rupees) || 0) * 100);

/* -------------------------------------------------------------------------- */
/*                               Section heading                              */
/* -------------------------------------------------------------------------- */
const SectionHeading = ({ P, children }: { P: Palette; children: React.ReactNode }) => (
  <div className="mb-2.5 mt-6 flex items-center gap-2 px-4">
    <span
      className="h-[18px] w-[5px] shrink-0 rounded-full"
      style={{ backgroundImage: `linear-gradient(to bottom, #FFFFFF 0%, ${P.navy} 100%)` }}
    />
    <span className="text-[13.5px] font-semibold" style={{ color: P.navy }}>
      {children}
    </span>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                   Hero                                     */
/* -------------------------------------------------------------------------- */
const Hero = ({ PUJA }: { PUJA: ViewModel }) => {
  const P = PUJA.palette;
  const [fr, fg, fb] = P.heroFade;

  return (
  <section
    className="relative overflow-hidden rounded-b-[26px]"
    style={{ backgroundColor: P.navy }}
  >
    {/* Photo — full-bleed, flush with the coloured panel below it.
        Rendered only when there is a URL: an empty src makes the browser
        re-request the page and draw a broken-image icon. A dead URL hides
        itself on error, leaving the coloured panel behind it. */}
    <div className="relative">
      {PUJA.heroImage ? (
        <img
          src={PUJA.heroImage}
          alt={PUJA.mandirName || PUJA.title}
          loading="eager"
          className="block h-[230px] w-full object-cover"
          style={{ backgroundColor: P.navyDeep }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="h-[120px] w-full" style={{ backgroundColor: P.navyDeep }} />
      )}
      {/* fades the bottom of the photo into the panel — transparent stop must
          be the same hue, otherwise it greys out mid-gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(${fr},${fg},${fb},0) 0%, ${P.navy} 100%)`,
        }}
      />
    </div>

    <div className="relative px-5 pb-7 pt-1">
      <span
        className="inline-block rounded-full border px-3.5 py-1.5 text-[12px] font-medium text-white"
        style={{ borderColor: "rgba(255,255,255,0.28)", backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        {[PUJA.mandirName, PUJA.state].filter(Boolean).join(" • ")}
      </span>

      <h1 className="mt-3.5 text-[30px] font-semibold leading-[1.15] tracking-tight text-white">
        {PUJA.title}
      </h1>

      <p className="mt-2.5 text-[14px] leading-relaxed text-white">{PUJA.titleHindi}</p>

      {/* When the puja is performed — surfaced here so it is visible without
          scrolling down to the form. */}
      {PUJA.poojaDates.length > 0 && (
        <div className="mt-3.5 flex items-center gap-2">
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 text-white/70" fill="currentColor">
            <path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm10 6H4v8h12V8Z" />
          </svg>
          <span className="text-[13px] font-medium text-white">
            {formatDateLong(PUJA.poojaDates[0])}
            {PUJA.poojaTime ? ` • ${PUJA.poojaTime}` : ""}
          </span>
          {PUJA.poojaDates.length > 1 && (
            <span className="text-[12px] text-white/60">
              +{PUJA.poojaDates.length - 1} more {PUJA.poojaDates.length === 2 ? "date" : "dates"}
            </span>
          )}
        </div>
      )}

      <p className="mt-3 line-clamp-3 text-[12.5px] leading-[1.65] text-white/70">{PUJA.shortDescription}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PUJA.highlights.map((chip) => (
          <span
            key={chip}
            className="rounded-full border px-3.5 py-1.5 text-[12px] text-white/90"
            style={{ borderColor: "rgba(255,255,255,0.28)", backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                              Sankalp banner                                */
/* -------------------------------------------------------------------------- */
/* appImage is a finished banner — mantra, heading and wavy edge are baked into
   the artwork, so nothing is overlaid on top of it. */
const SankalpBanner = ({ PUJA }: { PUJA: ViewModel }) => {
  if (!PUJA.bannerImage) return null; // an empty src re-requests the page
  return (
    <section>
      <img
        src={PUJA.bannerImage}
        alt={`${PUJA.bannerTitle} — ${PUJA.title}`}
        loading="lazy"
        className="block h-auto w-full rounded-t-2xl"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                                Sankalp form                                */
/* -------------------------------------------------------------------------- */
type Member = { id: number; name: string; gotra: string };

const SankalpForm = ({
  PUJA,
  formRef,
  submitRef,
  onBook,
  onTotalChange,
  onSubmittingChange,
  onCtaVisibilityChange,
}: {
  PUJA: ViewModel;
  formRef: React.RefObject<HTMLDivElement | null>;
  /** the sticky bar fires this form's submit, so both CTAs behave identically */
  submitRef: React.RefObject<(() => void) | null>;
  onBook: (payload: {
    name: string;
    mobile: string;
    gotra: string;
    date: string;
    members: Member[];
    total: number;
  }) => Promise<void>;
  /** keeps the sticky bar's price in step with the family list */
  onTotalChange: (total: number) => void;
  /** both CTAs sit in the same "opening checkout" state while one is working */
  onSubmittingChange: (submitting: boolean) => void;
  /** the sticky bar hides while this form's own CTA is on screen */
  onCtaVisibilityChange: (visible: boolean) => void;
}) => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const P = PUJA.palette;
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [gotra, setGotra] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  /* The puja runs on a fixed schedule, so the date is not the devotee's to
     choose. Read straight off the view model rather than mirroring it in state,
     which would go stale if the pooja loads after this form mounts. */
  const date = PUJA.poojaDates[0] || "";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const membersTotal = members.length * PUJA.perMemberPrice;
  const total = PUJA.basePrice + membersTotal;

  const ctaRef = useRef<HTMLButtonElement>(null);

  /* Keyed by exactly the strings validate() writes into `errors`, so the first
     offending key maps straight back to the input that has to come on screen. */
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const setFieldRef = (key: string) => (el: HTMLInputElement | null) => {
    fieldRefs.current[key] = el;
  };

  // push the running total up so the sticky bar shows the same number
  useEffect(() => {
    onTotalChange(total);
  }, [total, onTotalChange]);

  // the sticky bar's button mirrors this one, including its disabled state
  useEffect(() => {
    onSubmittingChange(submitting);
  }, [submitting, onSubmittingChange]);

  // hide the sticky bar once this form's own CTA is on screen — two identical
  // buttons at once is confusing, and the bar covers the trust row below it
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => onCtaVisibilityChange(entry.isIntersecting),
      // fire slightly before it clears the bar's own height
      { rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      // the form is unmounting; never leave the bar permanently hidden
      onCtaVisibilityChange(false);
    };
  }, [onCtaVisibilityChange]);

  const addMember = () => setMembers((prev) => [...prev, { id: Date.now(), name: "", gotra: "" }]);
  const removeMember = (id: number) => setMembers((prev) => prev.filter((m) => m.id !== id));
  const updateMember = (id: number, field: keyof Member, value: string) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));

  /* Sankalp is spoken aloud using these values and prasad is dispatched on the
     mobile number, so every field is mandatory before money is taken. */
  const validate = () => {
    const next: Record<string, string> = {};

    // no date validation — the schedule is fixed, not user input
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      next.mobile = "Enter a valid 10-digit mobile number";
    }
    if (name.trim().length < 2) {
      next.name = "Please enter the yajmaan's full name";
    }
    if (gotra.trim().length < 2) {
      next.gotra = "Please enter your gotra (write Kashyap if unknown)";
    }
    members.forEach((m, i) => {
      if (m.name.trim().length < 2) next[`m-${m.id}-name`] = `Enter member ${i + 1}'s name`;
      if (m.gotra.trim().length < 2) next[`m-${m.id}-gotra`] = `Enter member ${i + 1}'s gotra`;
    });

    setErrors(next);
    return next;
  };

  const handleSubmit = async () => {
    if (!PUJA.isBookable || submitting) return;
    const found = validate();
    /* validate() inserts its keys in field order, so the first one is the
       topmost field still to be filled. Resolve it through fieldRefs rather
       than querying [data-invalid]: setErrors() has not rendered yet at this
       point, so the DOM still describes the *previous* attempt. */
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      const el = fieldRefs.current[firstInvalid];
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      // focusing straight away cancels the smooth scroll on iOS Safari
      window.setTimeout(() => el?.focus({ preventScroll: true }), 450);
      return;
    }
    setSubmitting(true);
    try {
      await onBook({ name: name.trim(), mobile, gotra: gotra.trim(), date, members, total });
    } finally {
      setSubmitting(false);
    }
  };

  /* The sticky bar at the bottom of the page has no form state of its own, so
     it drives this handler: same validation, same errors, same checkout.
     No dependency array — the handler closes over state that changes on every
     keystroke, and the ref must always hold the current one. */
  useEffect(() => {
    submitRef.current = handleSubmit;
    return () => {
      submitRef.current = null;
    };
  });

  const labelClass = "text-[13px] font-semibold tracking-wide";
  const inputClass =
    // focus colour comes from the --puja-primary var set on the section, since
    // a Tailwind arbitrary value can't hold a runtime colour
    "mt-1.5 w-full appearance-none rounded-xl border bg-white px-3.5 py-3 text-[15px] outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--puja-primary)]";

  const ERROR_RED = "#C0392B";
  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? (
      <span className="mt-1 block text-[12px]" style={{ color: ERROR_RED }}>
        {msg}
      </span>
    ) : null;

  return (
    <section
      ref={formRef}
      className="rounded-b-2xl bg-white p-5"
      style={{ ["--puja-primary" as string]: P.navy } as React.CSSProperties}
    >
      {/* Puja date — fixed by the schedule, shown as a fact rather than an
          input. Hidden entirely when nothing is scheduled. */}
      {date && (
        <div className="mb-4 block">
          <span className={labelClass} style={{ color: P.navy }}>
            PUJA DATE
          </span>
          <div
            className="mt-1.5 rounded-xl border px-3.5 py-3 text-[15px]"
            style={{ borderColor: P.line, backgroundColor: P.cream, color: P.ink }}
          >
            {formatDateLong(date)}
            {PUJA.poojaTime ? ` • ${PUJA.poojaTime}` : ""}
          </div>
        </div>
      )}

      <label className="block">
        <span className={labelClass} style={{ color: P.navy }}>
          MOBILE NUMBER
        </span>
        <input
          value={mobile}
          // keep digits only — the numeric keypad still allows paste and some
          // Android keyboards emit spaces, dashes and +91
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          placeholder="10-digit mobile number"
          ref={setFieldRef("mobile")}
          data-invalid={!!errors.mobile}
          className={inputClass}
          style={{ borderColor: errors.mobile ? ERROR_RED : P.line, color: P.ink }}
        />
        <FieldError msg={errors.mobile} />
      </label>

      <label className="mt-4 block">
        <span className={labelClass} style={{ color: P.navy }}>
          YOUR NAME (MUKHYA YAJMAAN)
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name.."
          autoComplete="name"
          ref={setFieldRef("name")}
          data-invalid={!!errors.name}
          className={inputClass}
          style={{ borderColor: errors.name ? ERROR_RED : P.line, color: P.ink }}
        />
        <FieldError msg={errors.name} />
      </label>

      <label className="mt-4 block">
        <span className={labelClass} style={{ color: P.navy }}>
          YOUR GOTRA
        </span>
        <input
          value={gotra}
          onChange={(e) => setGotra(e.target.value)}
          placeholder="Gotra.."
          ref={setFieldRef("gotra")}
          data-invalid={!!errors.gotra}
          className={inputClass}
          style={{ borderColor: errors.gotra ? ERROR_RED : P.line, color: P.ink }}
        />
        <FieldError msg={errors.gotra} />
      </label>

      {/* Family sankalp list */}
      <div className="mt-6 flex items-baseline justify-between">
        <span className="text-[15px] font-bold" style={{ color: P.ink }}>
          Family Sankalp List
        </span>
        <span className="text-[13px]" style={{ color: P.inkSoft }}>
          {money(PUJA.perMemberPrice)} / member
        </span>
      </div>

      {members.map((m, i) => (
        <div
          key={m.id}
          className="mt-3 rounded-[10px] border p-3"
          style={{ borderColor: P.line, backgroundColor: P.cream }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold" style={{ color: P.navy }}>
              Member {i + 1}
            </span>
            <button
              type="button"
              onClick={() => removeMember(m.id)}
              className="text-[12px] font-semibold"
              style={{ color: P.orange }}
            >
              Remove
            </button>
          </div>
          <input
            value={m.name}
            onChange={(e) => updateMember(m.id, "name", e.target.value)}
            placeholder="Name"
            ref={setFieldRef(`m-${m.id}-name`)}
            data-invalid={!!errors[`m-${m.id}-name`]}
            className="mt-2 w-full appearance-none rounded-xl border bg-white px-3 py-2.5 text-[14px] outline-none placeholder:text-slate-400"
            style={{ borderColor: errors[`m-${m.id}-name`] ? ERROR_RED : P.line }}
          />
          <FieldError msg={errors[`m-${m.id}-name`]} />
          <input
            value={m.gotra}
            onChange={(e) => updateMember(m.id, "gotra", e.target.value)}
            placeholder="Gotra"
            ref={setFieldRef(`m-${m.id}-gotra`)}
            data-invalid={!!errors[`m-${m.id}-gotra`]}
            className="mt-2 w-full appearance-none rounded-xl border bg-white px-3 py-2.5 text-[14px] outline-none placeholder:text-slate-400"
            style={{ borderColor: errors[`m-${m.id}-gotra`] ? ERROR_RED : P.line }}
          />
          <FieldError msg={errors[`m-${m.id}-gotra`]} />
        </div>
      ))}

      <button
        type="button"
        onClick={addMember}
        className="mt-3 w-full rounded-xl border border-dashed py-3 text-[15px] font-bold"
        style={{ borderColor: P.gold, color: P.orange, backgroundColor: P.cream }}
      >
        + Add Family Member ({money(PUJA.perMemberPrice)})
      </button>

      <p className="mt-3 text-[13px] leading-[1.6]" style={{ color: P.inkSoft }}>
        Add parents, spouse, children — everyone's name is spoken in the sankalp. Up to 10 members.
      </p>

      {/* Price breakdown */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-[14px]" style={{ color: P.inkSoft }}>
          <span>{PUJA.basePriceLabel}</span>
          <span style={{ color: P.ink }}>{money(PUJA.basePrice)}</span>
        </div>
        {/* a "Family members (0) — ₹0" line is noise; the row only earns its
            place once someone has actually been added to the sankalp */}
        {members.length > 0 && (
          <div className="flex items-center justify-between text-[14px]" style={{ color: P.inkSoft }}>
            <span>Family members ({members.length})</span>
            <span style={{ color: P.ink }}>{money(membersTotal)}</span>
          </div>
        )}
      </div>

      <div className="my-4 h-px" style={{ backgroundColor: P.line }} />

      <div className="flex items-center justify-between">
        <span className="text-[17px] font-bold" style={{ color: P.ink }}>
          Total Seva
        </span>
        <span className="text-[24px] font-bold" style={{ color: P.orange }}>
          {money(total)}
        </span>
      </div>

      <button
        ref={ctaRef}
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !PUJA.isBookable}
        className="mt-5 w-full rounded-xl py-4 text-[17px] font-semibold text-white transition-opacity active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: P.navy }}
      >
        {!PUJA.isBookable
          ? PUJA.isExpired
            ? "Booking closed for this puja"
            : "Currently unavailable"
          : submitting
          ? "Opening secure checkout…"
          : `Book Puja – ${money(total)}`}
      </button>

      <div className="mt-4 flex items-center justify-center gap-5 text-[12px]" style={{ color: P.inkSoft }}>
        <span>🔒 Secure payment</span>
        <span>📞 Support on WhatsApp</span>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                                About cards                                 */
/* -------------------------------------------------------------------------- */
const AboutProse = ({ PUJA }: { PUJA: ViewModel }) => {
  const P = PUJA.palette;
  return (
  <section
    className="mx-4 rounded-2xl border p-5"
    style={{ backgroundColor: P.paper, borderColor: P.paperLine }}
  >
    {/* admin-authored rich text (headings, bullet lists) from the pooja doc */}
    <div
      className="text-[13px] leading-[1.7] [&_h2]:mb-2 [&_h2]:text-[16px] [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-[14px] [&_h3]:font-bold [&_li]:mb-1 [&_li]:list-disc [&_ol]:mb-3 [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc"
      style={{ color: P.paperInk }}
      dangerouslySetInnerHTML={{ __html: PUJA.aboutHtml }}
    />

    {PUJA.shastraQuote && (
      <p className="mb-3 mt-3 text-[13px] leading-[1.7]" style={{ color: P.paperInk }}>
        {STATIC.shastraQuoteIntro}{" "}
        <span className="font-semibold" style={{ color: P.orange }}>
          “{PUJA.shastraQuote}”
        </span>
      </p>
    )}

    {PUJA.aboutClosing && (
      <p className="text-[13px] leading-[1.7]" style={{ color: P.paperInk }}>
        {PUJA.aboutClosing}
      </p>
    )}
  </section>
  );
};

const AboutFacts = ({ PUJA }: { PUJA: ViewModel }) => {
  const P = PUJA.palette;
  return (
  <section
    className="mx-4 rounded-2xl border p-4 bg-white"
    style={{ borderColor: P.line }}
  >
    {PUJA.templeFacts.map((row, i) => (
      <div key={row.label}>
        {i > 0 && <div className="my-3 h-px" style={{ backgroundColor: P.line }} />}
        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.orange }}>
          {row.label}
        </div>
        <div className="mt-1 text-[13px] leading-relaxed" style={{ color: P.ink }}>
          {row.value}
        </div>
      </div>
    ))}
  </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                                Trust badges                                */
/* -------------------------------------------------------------------------- */
const TrustBadges = ({ PUJA }: { PUJA: ViewModel }) => {
  const P = PUJA.palette;
  return (
  <section className="mx-4 mt-4 space-y-3">
    <div
      className="flex items-center gap-3 rounded-2xl border p-3 bg-white"
      style={{ borderColor: P.line }}
    >
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[18px]"
        style={{ backgroundColor: "rgba(217,164,65,0.2)" }}
      >
        🪔
      </div>
      <div>
        <div className="text-[13px] font-semibold" style={{ color: P.ink }}>
          {PUJA.trust.primary.title}
        </div>
        <div className="text-[11px]" style={{ color: P.inkSoft }}>
          {PUJA.trust.primary.subtitle}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {PUJA.trust.secondary.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border p-3 text-center bg-white"
          style={{ borderColor: P.line }}
        >
          <div
            className="mx-auto grid h-10 w-10 place-items-center rounded-full text-[16px]"
            style={{ backgroundColor: "rgba(22,38,74,0.08)" }}
          >
            {item.icon}
          </div>
          <div className="mt-2 text-[12px] font-semibold" style={{ color: P.ink }}>
            {item.title}
          </div>
          <div className="mt-0.5 text-[10px] leading-snug" style={{ color: P.inkSoft }}>
            {item.subtitle}
          </div>
        </div>
      ))}
    </div>
  </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */
const Choose_package_mobile = () => (
  <div>
    <Layout content={<Choose_package_mobile_content />} activeIndex="puja" />
  </div>
);
export default Choose_package_mobile;

const Choose_package_mobile_content = () => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  // The route param is a "name-id" slug (see lib/slug.ts) — recover the real
  // Mongo id for every lookup/API call below. A bare legacy id still works.
  const pujaId = extractIdFromSlug(id);

  const formRef = useRef<HTMLDivElement>(null);
  /* Filled in by SankalpForm. The sticky bar submits the form instead of just
     scrolling to it, so one tap either surfaces the empty fields or opens
     checkout — the same thing the form's own CTA does. */
  const submitFormRef = useRef<(() => void) | null>(null);
  const submitForm = () => {
    if (submitFormRef.current) return submitFormRef.current();
    // form not mounted yet (pooja still resolving) — at least get the user there
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // resolves against `newpoojas` first, then the legacy `poojas` collection
  const { data: detail, isLoading: isPoojaLoading } = useAnyPoojaDetailQuery(pujaId);
  const pooja = detail?.pooja;
  const source: "new" | "legacy" = detail?.source === "new" ? "new" : "legacy";

  // Legacy poojas reference their mandir and need a second fetch; new poojas
  // embed it in mandirDetails[], so the query stays disabled for them.
  const mandirIdRaw = pooja?.mandirLists?.[0]?.mandirId;
  const mandirId =
    source === "new"
      ? ""
      : typeof mandirIdRaw === "string"
      ? mandirIdRaw
      : mandirIdRaw?._id || "";
  const { data: mandir } = useMandirByIdQuery(mandirId);

  // lets you preview any theme colour without touching the database:
  //   /services/puja/<id>/select-package?themeColor=%23C1440E
  const themeOverride = useSearchParams()?.get("themeColor") || undefined;

  const PUJA = useMemo(
    () => buildViewModel(pooja, mandir, themeOverride, source),
    [pooja, mandir, themeOverride, source]
  );
  const P = PUJA.palette; // derived from pooja.poojaColor

  // live total from the form (base + family members); null until it reports
  const [liveTotal, setLiveTotal] = useState<number | null>(null);
  const [formCtaVisible, setFormCtaVisible] = useState(false);
  // mirrored from the form so the sticky button cannot re-open checkout
  const [formSubmitting, setFormSubmitting] = useState(false);

  // stable identities — these are effect dependencies inside the form
  const handleTotalChange = useCallback((t: number) => setLiveTotal(t), []);
  const handleCtaVisibility = useCallback((v: boolean) => setFormCtaVisible(v), []);
  const handleSubmittingChange = useCallback((v: boolean) => setFormSubmitting(v), []);

  const barTotal = liveTotal ?? PUJA.basePrice;
  // Formatting now belongs to money(), which also picks the currency — this
  // stays the raw rupee number rather than a pre-formatted "1,100" string.
  const startingPrice = barTotal;

  const handleBook = async (payload: {
    name: string;
    mobile: string;
    gotra: string;
    date: string;
    members: Member[];
    total: number;
  }) => {
    const md = pooja?.mandirDetails?.[0]; // new only
    const mobileNo = normalizeMobile(payload.mobile);
    const email = makeSafeEmail(mobileNo);
    const merchantTransactionId = `TXN${Date.now()}`;

    // yajmaan first, then each family member — order matters, the sankalp is
    // read out in this sequence and bhaktaNames[0] is treated as the yajmaan
    const bhaktaNames = [payload.name, ...payload.members.map((x) => x.name.trim())];
    const gotras = [payload.gotra, ...payload.members.map((x) => x.gotra.trim())];

    const [firstname, ...rest] = payload.name.trim().split(/\s+/);
    const lastname = rest.join(" ");

    // keep the handoff payload for the success page / any later step
    localStorage.setItem(
      "selectedPackage",
      JSON.stringify({
        pujaId,
        packageName: "singlePackage",
        yajmaanName: payload.name,
        yajmaanMobile: mobileNo,
        yajmaanGotra: payload.gotra,
        poojaDate: payload.date,
        familyMembers: payload.members.map(({ name, gotra }) => ({ name, gotra })),
        totalAmount: payload.total,
      })
    );

    try {
      // 1. create/lookup the user so the booking is attached to an account
      const authRes = await api.post(`/phone-login-or-register`, {
        phone: mobileNo,
        email,
        firstname,
        lastname,
        gotra: payload.gotra,
        familyMembers: bhaktaNames,
      });
      const { user, token } = authRes.data || {};
      if (token) localStorage.setItem("token", token);
      if (user) localStorage.setItem("userDetails", JSON.stringify({ user }));

      /* ⚠️ BEFORE ADDING PRASAD DELIVERY TO THIS PAGE, READ THIS.
         Legacy poojas point mandirID at a real Mandir document. New poojas
         embed their temple as free text, so the best available value is the
         mandirDetails sub-document id — a valid ObjectId that resolves to
         nothing in the `mandirs` collection.

         That is inert today only because this page sends isAddressSelected:
         false. Every consumer of mandirID in poojaBookingController (pandit
         lookup -> prasad pickup pincode -> Shiprocket) is gated behind that
         flag. Set it true without first giving mandirDetails a real
         `mandirId` ref and Pandit.find() returns [], the controller logs
         "No pandit found", and prasad is silently never shipped. */
      const resolvedMandirID = source === "new" ? md?._id || "" : mandirId;

      /* The booking record requires userID and mandirID, and it is written
         *after* Razorpay confirms payment. If either is missing the save fails
         once the money is already taken, so refuse to open checkout at all. */
      if (!user?._id || !resolvedMandirID) {
        throw new Error(
          "This puja is not ready for booking yet. Please contact support — no payment has been taken."
        );
      }

      const bookingDetails = {
        userID: user._id,
        mandirID: resolvedMandirID,
        poojaSource: source,
        poojaID: pujaId,
        totalPrice: payload.total,
        bookingDate: new Date(),
        package: "singlePackage",
        referralCode: localStorage.getItem("vedicvaibhav_ref_code"),
        gotra: gotras,
        bhaktaNames,
        dakshinaToPandit: null,
        donateToMandir: null,
        brahmanBhoj: null,
        poojaStatus: "booked",
        // this page does not collect a delivery address
        isAddressSelected: false,
        prasadStatus: "pending",
        address1: "",
        address2: "",
        city: "",
        state: "",
        country: "",
        pincode: 0,
        email,
        firstname,
        lastname,
        mobile: mobileNo,
        mandirimage: pooja?.poojaCardImage,
        mandirname: PUJA.mandirName,
        poojaname: pooja?.title,
        // the date the devotee picked (both shapes now carry a schedule)
        poojadate: payload.date ? formatDateToMDY(payload.date) : "",
        poojadateISO: payload.date || "",
        poojatime: PUJA.poojaTime,
        // meta / tracking
        fbp: document.cookie.match(/_fbp=([^;]+)/)?.[1],
        fbc: document.cookie.match(/_fbc=([^;]+)/)?.[1],
        eventSourceUrl: window.location.href,
        vv_utm: getVvUtm(),
      };

      // 2. backend creates the Razorpay order and returns its key
      const orderRes = await api.post(`/create-razorpay-order`, {
        // Still the INDIA LIST TOTAL in paise, unchanged — the server checks it
        // against the catalog and only then applies any foreign markup.
        amount: toPaise(payload.total), // paise
        receipt: merchantTransactionId,
        merchantTransactionId,
        bookingDetails,
        // Presentment request: which currency to bill in, and the market.
        ...orderRequestFields(),
      });
      const { orderId, key, amount: orderAmount, currency: orderCurrency } = orderRes.data || {};
      if (!orderId || !key) throw new Error("Could not start checkout. Please try again.");

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not reach Razorpay. Check your connection.");

      // 3. open checkout
      const rzp = new (window as any).Razorpay({
        key,
        /**
         * ⚠️ TAKEN FROM THE CREATE-ORDER RESPONSE, never re-computed here — the
         * server may have fallen back to INR for a currency the account is not
         * enabled for, and a checkout that opens on a different currency than the
         * order carries either fails or verifies against the wrong expectation.
         */
        amount: orderAmount ?? toPaise(payload.total),
        currency: orderCurrency || "INR",
        name: "Vedic Vaibhav",
        description: pooja?.title || "Pooja Booking Payment",
        order_id: orderId,
        notes: { merchantTransactionId, poojaId: pujaId, userId: user?._id || "" },
        prefill: { name: payload.name, email, contact: mobileNo },
        theme: { color: P.navy },
        handler: async (response: any) => {
          try {
            // 4. the server verifies the signature — never trust the client here.
            // The payment is already captured by now, so retry through the webhook
            // race instead of calling it a failure (see lib/verify-payment.ts).
            const outcome = await verifyPaymentWithRetry<any>({
              attempt: async () =>
                (
                  await api.post(`/verify-razorpay-payment`, {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    merchantTransactionId,
                  })
                ).data,
            });

            if (outcome.status === "declined") {
              window.gtag?.("event", "payment_failed", {
                currency: "INR",
                value: toInr(payload.total),
                items: [{ item_id: pujaId, item_name: pooja?.title || "Puja Booking" }],
              });
              alert("We could not verify your payment. If money was debited, contact support with ID " + merchantTransactionId);
              return;
            }

            // Retained from the retry work: the booking id read below comes from
            // the verified response, which is empty while the webhook settles.
            const verifyRes = { data: outcome.status === "confirmed" ? outcome.data : ({} as any) };

            // GA4 Purchase is NOT sent here — PujaPaymentSuccessful sends it on
            // /pujapaymentsuccess below. Firing in both places double-counted
            // every mobile booking, under two different transaction ids.

            localStorage.setItem("bookedpujaID", pujaId);
            localStorage.setItem("bookingId", verifyRes.data.bookingId || "");
            localStorage.setItem("merchantTransactionId", merchantTransactionId);
            localStorage.setItem("lastPujaAmount", String(payload.total));
            localStorage.setItem("lastPujaOrderId", verifyRes.data.bookingId || merchantTransactionId);

            router.push("/pujapaymentsuccess");
          } catch (err: any) {
            console.error("Verification failed", err?.response?.data || err);
            alert("We could not verify your payment. If money was debited, contact support with ID " + merchantTransactionId);
          }
        },
      });

      rzp.on("payment.failed", (resp: any) => {
        console.error("Razorpay payment failed", resp?.error);
        window.gtag?.("event", "payment_failed", {
          currency: "INR",
          value: toInr(payload.total),
          items: [{ item_id: pujaId, item_name: pooja?.title || "Puja Booking" }],
        });
        alert(resp?.error?.description || "Payment failed. Please try again.");
      });

      rzp.open();
    } catch (err: any) {
      console.error("Booking failed", err?.response?.data || err);
      alert(err?.response?.data?.message || err?.message || "Could not start payment. Please try again.");
    }
  };

  if (isPoojaLoading || !pooja) {
    return (
      <div
        className="grid min-h-screen place-items-center font-sans text-[14px]"
        style={{ backgroundColor: PALETTE.cream, color: PALETTE.inkSoft }}
      >
        Loading puja details…
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: P.cream, color: P.ink }}>
      <div className="mx-auto max-w-[430px]">
        <Hero PUJA={PUJA} />

        {/* cream body sits below the rounded-off hero. The tall bottom padding
            clears the fixed CTA bar so the last section stays reachable. */}
        <div
          className="relative"
          style={{
            backgroundColor: P.cream,
            paddingBottom: "calc(104px + env(safe-area-inset-bottom))",
          }}
        >
        {/* Banner + form share one continuous outline */}
        <div
          className="mx-4 mt-4 rounded-2xl outline outline-1 -outline-offset-1"
          style={{ outlineColor: P.line }}
        >
          <SankalpBanner PUJA={PUJA} />

          <SankalpForm
            PUJA={PUJA}
            formRef={formRef}
            submitRef={submitFormRef}
            onBook={handleBook}
            onTotalChange={handleTotalChange}
            onSubmittingChange={handleSubmittingChange}
            onCtaVisibilityChange={handleCtaVisibility}
          />
        </div>

        <SectionHeading P={P}>About This Puja</SectionHeading>
        <AboutProse PUJA={PUJA} />

        <SectionHeading P={P}>About The Temple</SectionHeading>
        <AboutFacts PUJA={PUJA} />

          <TrustBadges PUJA={PUJA} />
        </div>

        {/* Sticky CTA — pinned to the bottom of the viewport. It tracks the
            430px column rather than the viewport so it stays aligned with the
            page on wider screens. */}
        <section
          aria-hidden={formCtaVisible}
          className={`fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-between gap-3 px-5 pt-4 shadow-[0_-8px_24px_-8px_rgba(44,33,24,0.34)] transition-[transform,opacity] duration-300 ease-out ${
            formCtaVisible ? "pointer-events-none translate-y-full opacity-0" : "translate-y-0 opacity-100"
          }`}
          style={{
            backgroundImage: `linear-gradient(to right, ${P.chip} 0%, #FFFFFF 100%)`,
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          {/* type and padding scale with the viewport so the row holds its
              shape from a 320px phone up to the 430px cap */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span
                className="truncate font-bold leading-tight"
                style={{ color: P.navy, fontSize: "clamp(20px, 6vw, 24px)" }}
              >
                {money(startingPrice)}
              </span>
              {/* the struck price only describes the base seva, so drop it
                  once family members have been added to the total */}
              {PUJA.strikePrice > 0 && barTotal === PUJA.basePrice && (
                <span
                  className="shrink-0 line-through"
                  style={{ color: P.inkSoft, fontSize: "clamp(12px, 3.4vw, 14px)" }}
                >
                  {money(PUJA.strikePrice)}
                </span>
              )}
            </div>
            <div
              className="mt-0.5 truncate"
              style={{ color: P.inkSoft, fontSize: "clamp(13px, 3.8vw, 15px)" }}
            >
              {barTotal > PUJA.basePrice ? "Total Seva" : "Start From"}
            </div>
          </div>
          <button
            type="button"
            onClick={submitForm}
            disabled={!PUJA.isBookable || formSubmitting}
            className="shrink-0 whitespace-nowrap rounded-full py-3.5 font-semibold text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: P.navy,
              fontSize: "clamp(14px, 4vw, 16px)",
              paddingInline: "clamp(20px, 7vw, 32px)",
            }}
          >
            {!PUJA.isBookable ? "Unavailable" : formSubmitting ? "Opening…" : "Book Puja"}
          </button>
        </section>
      </div>
    </div>
  );
};
