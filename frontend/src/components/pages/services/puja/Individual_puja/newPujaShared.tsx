/* ==========================================================================
   Shared between the "new pooja" browse page (Choose_package_mobile.tsx) and
   its booking page (EnterPujaBookingPage.tsx) — the view model built from a
   pooja/mandir document, the poojaColor-derived palette, booking helpers used
   when the order is actually created, and the small set of form/card
   primitives both pages render with.
   ========================================================================== */

import TempleHinduIcon from "@mui/icons-material/TempleHindu";
import OndemandVideoOutlinedIcon from "@mui/icons-material/OndemandVideoOutlined";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

/* ==========================================================================
   Booking helpers — behaviour mirrored from Payment.tsx so every entry point
   creates identical bookings.
   ========================================================================== */
export const normalizeMobile = (mobile: string) => {
  const digits = (mobile || "").replace(/\D/g, "");
  return digits.length <= 10 ? digits : digits.slice(-10);
};

export const makeSafeEmail = (mobile: string, email?: string) => {
  const trimmed = (email || "").trim();
  if (trimmed) return trimmed;
  const digits = normalizeMobile(mobile);
  return digits ? `${digits}@gmail.com` : "user@gmail.com";
};

export const formatDateToMDY = (dateValue: string | number | Date) => {
  const date = new Date(dateValue);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
};

/** "Sat, 25 Jul 2026" — how dates read on the page */
export const formatDateLong = (value: string) =>
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

export const loadRazorpay = () =>
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

/* Razorpay rejects non-integer paise, and float maths (0.29 * 100) drifts. */
export const toPaise = (rupees: number) => Math.round((Number(rupees) || 0) * 100);

/* ==========================================================================
   STATIC COPY
   --------------------------------------------------------------------------
   Everything below is either fixed chrome or a field the pooja schema does
   not carry yet. See the "NOT IN API" notes on each one — once the backend
   grows these fields, read them off the document instead.
   ========================================================================== */
export const STATIC = {
  bannerTitle: "Reserve Your Sankalp",
  shastraQuoteIntro: "The shastra says:",

  // NOT IN API — hero chips. Generic so they hold for any pooja/mandir.
  highlights: ["Puja video sent to you", "Sankalp with name & gotra", "Prasad home delivery"],

  // NOT IN API — the three assurance cards under the hero.
  featureCards: [
    {
      title: "Performed at the Dham",
      description: "Real puja by verified Ved-pathi Brahmins",
      Icon: TempleHinduIcon,
    },
    {
      title: "Video Proof",
      description: "Your name & gotra audible in the sankalp",
      Icon: OndemandVideoOutlinedIcon,
    },
    {
      title: "Secure Payment",
      description: "UPI, cards & net-banking supported",
      Icon: VerifiedUserIcon,
    },
  ],
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
export const buildViewModel = (
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

  const rawPackages: any[] = Array.isArray(pooja?.packages) ? pooja.packages : [];

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

    /**
     * Whether this puja's prasad can be shipped. `false` for legacy poojas
     * whose mandir hasn't loaded yet (`mandir` starts undefined), so the
     * prasad section only appears once that answer is actually known.
     */
    isPrasadAvailable: isNew ? !!md?.isPrasadAvailable : !!mandir?.isPrasadAvailable,

    basePrice,
    // shown struck through when it is genuinely higher than what is charged
    strikePrice: isNew && pooja?.originalPrice > basePrice ? pooja.originalPrice : 0,
    basePriceLabel: pooja?.title || "Seva (base)",

    /**
     * Bookable tiers, authored in the admin panel. When a pooja has them the
     * chosen package's price IS the order total. The yajmaan is always
     * included on top of `personCount` — `personCount` is how many ADDITIONAL
     * family members the price covers, not the total headcount — the server
     * enforces both in verifyOrderAmount. A pooja with none falls back to
     * `basePrice` alone.
     */
    packages: rawPackages
      .filter((pkg) => pkg?.label && Number.isFinite(Number(pkg?.price)))
      .map((pkg) => ({
        label: String(pkg.label),
        price: Number(pkg.price),
        personCount: Math.max(0, Math.trunc(Number(pkg.personCount)) || 0),
        image: typeof pkg.image === "string" ? pkg.image : "",
      })),

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

    featureCards: STATIC.featureCards,
  };
};

export type ViewModel = ReturnType<typeof buildViewModel>;
export type PujaPackage = ViewModel["packages"][number];

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
  ink: "#423f3d",
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

export const makePalette = (poojaColor?: string) => {
  const themed = isHex(poojaColor);
  const raw = themed ? poojaColor.trim() : BASE_PRIMARY;

  // The primary sits behind white text (mandir strip, Book Puja buttons). A
  // light poojaColor — yellow, pale gold — would leave that text unreadable, so
  // darken it until it can carry white. Tints below still use the raw colour,
  // which keeps the page recognisably that hue.
  let primary = raw;
  // White-on-primary must clear WCAG AA (4.5:1): (1.05)/(L+0.05) >= 4.5 solves
  // to L <= 0.1833. 0.16 leaves margin for this loop's 0.12-sized steps, which
  // can stop a bit short of the exact cutoff. (0.22 previously — that only
  // cleared the 3:1 large-text/UI threshold, so white text on a pale poojaColor
  // like yellow or pale gold could still be genuinely hard to read.)
  while (luminance(primary) > 0.16) primary = shade(primary, 0.12);

  return {
    // --- primary family ---
    /**
     * Exactly the poojaColor set in the admin panel (or BASE_PRIMARY when
     * none is set) — never darkened. Used where the product call is to show
     * the admin's chosen color as-is (buttons, the mandir/date strip), even
     * though that means white text on a pale poojaColor can read poorly —
     * that tradeoff is intentional here, unlike `navy` below.
     */
    raw,
    navy: primary,
    navyDeep: shade(primary, 0.28),
    paper: tint(raw, 0.965),
    paperLine: tint(raw, 0.84),
    chip: tint(raw, 0.9),
    /**
     * Text colours, deliberately NOT derived from `primary`/`raw`. A shade of
     * only 10–15% off `primary` still reads as the puja's own hue whenever
     * `primary` itself is a mid-tone colour rather than a true dark navy — a
     * burnt orange or olive `poojaColor` came through as visibly
     * orange/olive body copy and headings instead of black. Content text
     * stays a fixed near-black regardless of theme; only backgrounds, bars,
     * icons and accents (price, buttons, strips) carry the puja's colour.
     */
    chipInk: BRAND.ink,
    paperInk: BRAND.ink,
    /** heading/label text — same fixed near-black, kept as its own name so a
     *  call site reads as "this is text" rather than reaching for the
     *  background/accent token `navy` by habit. */
    textDark: BRAND.ink,
    /** the pale end of a section-heading bar, and the outline on form cards */
    accentSoft: tint(raw, 0.72),
    /** mid-tone outline that keeps the bordered prose boxes visible on white */
    boxLine: tint(raw, 0.5),

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

export type Palette = ReturnType<typeof makePalette>;

/** default palette — used by chrome that renders before the pooja loads */
export const PALETTE = makePalette();

export const ERROR_RED = "#C0392B";

/* -------------------------------------------------------------------------- */
/*                          Shared form/card primitives                       */
/* -------------------------------------------------------------------------- */
export const sectionDomId = (key: string) => `puja-${key}`;

export const SectionHeading = ({
  P,
  title,
  highlighted,
}: {
  P: Palette;
  title: string;
  highlighted?: boolean;
}) => (
  <div
    className={`flex items-center gap-2 py-1.5 mb-3 ${highlighted ? "-mx-3 px-3" : ""}`}
    style={highlighted ? { backgroundImage: `linear-gradient(to right, ${P.chip}, transparent)` } : undefined}
  >
    <span
      className="w-[5px] h-5 rounded-full shrink-0"
      style={{ backgroundImage: `linear-gradient(to bottom, ${P.navy}, ${P.accentSoft})` }}
    />
    <h2 className="font-heading text-[18px] md:text-[20px] leading-none" style={{ color: P.textDark }}>
      {title}
    </h2>
  </div>
);

/** One concern per card, the way the pitru puja booking form is laid out. */
export const Card = ({
  P,
  id,
  children,
}: {
  P: Palette;
  id?: string;
  children: React.ReactNode;
}) => (
  <div
    id={id}
    className="bg-white border rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
    style={{ borderColor: P.accentSoft }}
  >
    {children}
  </div>
);

export const CardHeading = ({
  P,
  icon,
  title,
  subtitle,
}: {
  P: Palette;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}) => (
  <div className="mb-3">
    <div className="flex items-start gap-2">
      <span
        className="w-[5px] h-5 mt-0.5 rounded-full shrink-0"
        style={{ backgroundImage: `linear-gradient(to bottom, ${P.navy}, ${P.accentSoft})` }}
      />
      <h3
        className="font-heading text-[15px] min-[360px]:text-[16px] md:text-[18px] leading-snug flex-1 min-w-0 break-words"
        style={{ color: P.textDark }}
      >
        {title}
      </h3>
      {icon && (
        <span
          className="flex items-center justify-center w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 rounded-full shrink-0"
          style={{ backgroundColor: P.chip }}
        >
          {icon}
        </span>
      )}
    </div>
    {subtitle && (
      <p className="text-[12px] mt-1 pl-[13px]" style={{ color: P.inkSoft }}>
        {subtitle}
      </p>
    )}
  </div>
);

export const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[13px] text-stone-700 font-medium block mb-2">
    <span className="mr-0.5" style={{ color: ERROR_RED }}>
      *
    </span>
    {children}
  </label>
);

/** Sits directly under its field so the problem is read where it is fixed. */
export const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="flex items-start gap-1 text-[12px] mt-1.5" style={{ color: ERROR_RED }}>
      <ErrorOutlineIcon style={{ fontSize: 14 }} className="shrink-0 mt-[1px]" />
      <span>{message}</span>
    </p>
  ) : null;

/**
 * Shared input shell. The border colour is driven through `--puja-line` rather
 * than an inline `border-color`, because an inline style outranks the
 * stylesheet and would stop `:focus-within` from ever showing the focus ring.
 */
export const fieldStyle = (P: Palette, hasError?: boolean) =>
  ({ ["--puja-line" as string]: hasError ? ERROR_RED : P.line } as React.CSSProperties);

export const FIELD_CLASS =
  "puja-field flex items-stretch overflow-hidden rounded-xl border bg-white transition-colors";

/** Injected once by whichever page mounts first — both pages rely on these
 *  same class names (`.puja-field`, `.puja-rich-text`, `.puja-tabs`). */
export const PUJA_SHARED_STYLES = `
  .puja-rich-text span { background-color: transparent !important; color: inherit !important; }
  .puja-rich-text p:empty { display: none; }
  /* Admin-pasted copy can carry a wide image, table or an unbroken URL —
     clamp it so it never widens the page on a 320px phone. */
  .puja-rich-text { overflow-wrap: break-word; }
  .puja-rich-text img, .puja-rich-text table { max-width: 100%; height: auto; }
  /* The border colour travels as a custom property so :focus-within can
     override it — an inline border-color would outrank the stylesheet. */
  .puja-field { border-color: var(--puja-line); }
  .puja-field:focus-within { border-color: var(--puja-primary); }
  /* The tab strip scrolls below ~380px. The global scrollbar rules paint a
     thick orange bar there, which reads as a second border under the tabs,
     so this one is 3px and barely tinted. */
  .puja-tabs { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.22) transparent; }
  .puja-tabs::-webkit-scrollbar { height: 3px; background: transparent; }
  .puja-tabs::-webkit-scrollbar-track { background: transparent; }
  .puja-tabs::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.22); border-radius: 999px; }
`;

/* -------------------------------------------------------------------------- */
/*                              Sankalp banner                                */
/* -------------------------------------------------------------------------- */
/* appImage is a finished banner — mantra, heading and wavy edge are baked into
   the artwork, so nothing is overlaid on top of it. */
export const SankalpBanner = ({ PUJA }: { PUJA: ViewModel }) => {
  if (!PUJA.bannerImage) return null; // an empty src re-requests the page
  return (
    <img
      src={PUJA.bannerImage}
      alt={`${PUJA.bannerTitle} — ${PUJA.title}`}
      loading="lazy"
      className="block h-auto w-full rounded-xl"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
};
