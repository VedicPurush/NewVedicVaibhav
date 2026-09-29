"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import TempleHinduIcon from '@mui/icons-material/TempleHindu';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { notification } from 'antd';
import { getVvUtm } from "@/lib/utm";
import VerticalPaymentLoader from "./PaymentLoader";
import { gtag } from "@/lib/gtag";
import { api } from "@/lib/api";
import { orderRequestFields, useMoney, shipsPrasad, toInr, sanitizePhone, isValidPhone } from "@/lib/currency";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";
import { displayPlace } from "@/lib/place";
import { useNewChadhavaDetailQuery } from "@/hooks/queries/useNewChadhavaDetailQuery";
import { useVedicPromosQuery } from "@/hooks/queries/usePromoQueries";
import { validatePromo, type AppliedPromo, type PromoCode } from "@/lib/api/promo.api";

// --- Meta Pixel safe tracker (queues until fbq is ready) ---
const isFbq = (fn: unknown): fn is (...args: any[]) => void =>
  typeof fn === 'function';

const getCookie = (name: string): string => {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
};

const getFbp = (): string => getCookie('_fbp');
const getFbc = (): string => {
  const cookieFbc = getCookie('_fbc');
  if (cookieFbc) return cookieFbc;
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get('fbclid');
  if (fbclid) return `fb.1.${Date.now()}.${fbclid}`;
  return '';
};

/** Inline field error — sits directly under its field, so the problem is read
 *  where it is fixed. */
const InlineError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="flex items-start gap-1 text-[12px] text-[#C0392B] mt-1.5">
      <ErrorOutlineIcon style={{ fontSize: 14 }} className="shrink-0 mt-[1px]" />
      <span>{message}</span>
    </p>
  ) : null;


const fbqTrack = (event: string, params?: Record<string, any>, options?: { eventID?: string }) => {
  if (typeof window === 'undefined') return;

  // If fbq is available, fire immediately
  const fbq = (window as any).fbq;
  if (isFbq(fbq)) {
    try {
      // 4th argument is for options like eventID
      fbq('track', event, params || {}, options);
    } catch (e) {
      console.warn('fbq track failed', e);
    }
    return;
  }

  // Otherwise, queue and start a short poll to flush when ready
  const win = window as any;
  win._fbqQueue = win._fbqQueue || [];
  win._fbqQueue.push({ event, params, options });

  if (!win._fbqInterval) {
    win._fbqInterval = window.setInterval(() => {
      const fbq = (window as any).fbq;
      if (isFbq(fbq)) {
        const q = win._fbqQueue || [];
        q.forEach((e: any) => {
          try {
            fbq('track', e.event, e.params || {}, e.options);
          } catch (err: any) {
            console.warn('fbq queued track failed', err);
          }
        });
        win._fbqQueue = [];
        window.clearInterval(win._fbqInterval);
        win._fbqInterval = 0;
      }
    }, 400);
  }
};

/** The server explains exactly why a coupon was refused, and the reason is
 *  usually actionable ("needs a minimum order of ₹499"), so show it verbatim. */
const apiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/**
 * Coupons offered in "View all coupons". Influencer codes still work when typed,
 * they are just not advertised (same rule as the puja checkout); app-only codes
 * are rejected on the website, so they are not offered either.
 */
const isListablePromo = (promo: PromoCode, now: number) =>
  promo.isActive &&
  !promo.isAppOnly &&
  promo.promoType?.toLowerCase() !== "influencer-promo" &&
  new Date(promo.startDate).getTime() <= now &&
  new Date(promo.expiryDate).getTime() >= now;

function formatShortDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr + (dateStr.includes('T') ? "" : "T00:00:00"));
  if (isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString('en-IN', { day: 'numeric' });
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
  return `${day} ${month}, ${weekday}`;
}


// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 120, damping: 12 }
  }
};

/** Chadhava orange — the accent the detail page is built on, so checkout reads
 *  as the next step of that page rather than a different site. */
const ORANGE = "#EA580C";

/** Shared input shell. Every field on this page goes through it: the old mix of
 *  per-input border widths, ring shadows and focus scales gave each one a
 *  slightly different size and weight, which is what made the form look
 *  unsettled even when nothing was wrong with it. */
const fieldShell = (hasError?: boolean) =>
  `rounded-xl border bg-white transition-colors ${
    hasError ? "border-[#C0392B] focus-within:border-[#C0392B]" : "border-stone-300 focus-within:border-[#EA580C]"
  }`;

const Card: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <motion.div
    id={id}
    variants={itemVariants}
    className="bg-white border border-[#F3D3B5] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
  >
    {children}
  </motion.div>
);

const SectionHeading: React.FC<{ icon?: React.ReactNode; title: string; subtitle?: string }> = ({
  icon,
  title,
  subtitle,
}) => (
  <div className="mb-1.5">
    <div className="flex items-start gap-2">
      <span className="w-[5px] h-5 mt-0.5 rounded-full bg-gradient-to-b from-[#EA580C] to-[#FBD4B4] shrink-0" />
      <h2 className="font-heading text-[15px] min-[360px]:text-[16px] md:text-[18px] text-[#C2410C] leading-snug flex-1 min-w-0 break-words">
        {title}
      </h2>
      {icon && (
        <span className="flex items-center justify-center w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 rounded-full bg-[#FFF1E6] shrink-0">
          {icon}
        </span>
      )}
    </div>
    {subtitle && <p className="text-[12px] text-stone-500 mt-1 pl-[13px]">{subtitle}</p>}
  </div>
);

const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[13px] text-stone-700 font-medium block mb-2">
    <span className="text-[#C0392B] mr-0.5">*</span>
    {children}
  </label>
);

const OptionalLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[13px] text-stone-700 font-medium block mb-2">
    {children}
    <span className="text-stone-400 font-normal ml-1">(optional)</span>
  </label>
);

/** One field, one shape. `prefix` renders as a tinted segment inside the same
 *  shell (the +91 badge) rather than as a floating pill that changed the row's
 *  height; `optional` only swaps the label. */
const ModernInput = ({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  error,
  touched,
  prefix,
  maxLength,
  pattern,
  inputMode,
  disabled,
  optional,
  hint,
  id,
}: any) => {
  const hasError = !!(error && touched);
  const Label = optional ? OptionalLabel : RequiredLabel;

  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className={`flex items-stretch overflow-hidden ${fieldShell(hasError)}`}>
        {prefix && (
          <span
            className={`flex items-center gap-1.5 px-2.5 min-[360px]:px-3 bg-[#FFF1E6] text-[13px] font-semibold text-[#C2410C] border-r shrink-0 ${
              hasError ? "border-[#C0392B]" : "border-stone-300"
            }`}
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={hasError}
          className="flex-1 min-w-0 px-3 py-3 text-[14px] outline-none bg-transparent disabled:text-stone-400"
          placeholder={placeholder}
          type={type}
          maxLength={maxLength}
          pattern={pattern}
          inputMode={inputMode}
          disabled={disabled}
        />
      </div>
      <InlineError message={touched ? error : ""} />
      {hint && <p className="text-[12px] text-stone-500 mt-2">{hint}</p>}
    </div>
  );
};

// Upsell product shape (from chadhava doc `products` array)
interface UpsellProduct {
  productName: string;
  price: number;
  discountedPrice: number;
  description: string;
  image?: { location?: string } | string;
}

// Navigation state (old `useLocation().state`) is passed via sessionStorage by
// the detail page. Hydrate it client-side, then render the actual page.
const NewChadhavaPaymentPage: React.FC = () => {
  const [navState, setNavState] = useState<any | null>(null);

  useEffect(() => {
    let s: any = {};
    try {
      s = JSON.parse(sessionStorage.getItem("vv_chadhava_payment_state") ?? "{}");
    } catch {
      // ignore parse errors — behave like a direct visit with no state
    }
    setNavState(s ?? {});
  }, []);

  if (navState === null) return null;
  return <NewChadhavaPaymentPageContent navState={navState} />;
};

const NewChadhavaPaymentPageContent: React.FC<{ navState: any }> = ({ navState }) => {
  const router = useRouter();
  /**
   * Every ₹ figure on this page is rendered through `money()`, which converts
   * the India list price into the devotee's own currency for DISPLAY. The
   * amounts POSTED to the server below are untouched India list prices — the
   * server owns the markup. See lib/currency.ts.
   */
  const { money, country } = useMoney();
  const {
    selected = {},
    selectedCombos = {},
    comboPlans = [],
    accessoriesList = [],
    prasad,
    needPrasad: navNeedPrasad = false,
    basePuja,
    familySize = 0,
    giftSelected = {},
    giftList = [],

  } = navState || {}; // Safe access if accessed directly (will be empty)

  /**
   * ⚠️ SECOND GATE on physical goods, after the detail page's.
   *
   * Prasad is perishable and shipped from India only. The detail page hides the
   * option abroad, but the choice is carried here in navState — so a devotee who
   * selected it and THEN switched country would otherwise arrive with prasad in
   * their cart, be charged for it, and have nothing shippable to them. Deciding
   * it here means the country in force at payment time is the one that counts.
   */
  const needPrasad = navNeedPrasad && shipsPrasad();

  // --- Upsell: read from TanStack Query cache (populated by the detail page) ---
  // This avoids any extra network call; falls back to fetching via the correct route if cold.
  const { data: chadhavaDoc } = useNewChadhavaDetailQuery(basePuja?.chadhavaId ?? "");
  const isPitruPuja = !!chadhavaDoc?.isPitruPuja;
  const upsellProducts: UpsellProduct[] = (
    chadhavaDoc?.products && Array.isArray(chadhavaDoc.products)
      ? chadhavaDoc.products
      : []
  ) as UpsellProduct[];

  const [addedUpsells, setAddedUpsells] = useState<{ [name: string]: boolean }>({});
  const [selectedUpsellModal, setSelectedUpsellModal] = useState<UpsellProduct | null>(null);

  const toggleUpsell = (name: string) => {
    setAddedUpsells((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const getUpsellImageSrc = (img?: UpsellProduct["image"]) => {
    if (!img) return "";
    if (typeof img === "string") return img;
    return img.location || "";
  };

  const upsellTotal = upsellProducts.reduce((sum, p) => {
    return addedUpsells[p.productName] ? sum + (p.discountedPrice ?? p.price) : sum;
  }, 0);

  useEffect(() => {
    if (!basePuja) {
      router.push("/newchadhavapage"); // redirect if no data
      return;
    }
    // ViewContent — fire when payment page loads
    fbqTrack("ViewContent", {
      content_ids: [basePuja?._id || "chadhava"],
      content_name: basePuja?.name || "Chadhava",
      content_category: "Chadhava",
      content_type: "product",
      currency: "INR",
    });
    gtag("event", "view_item", {
      currency: "INR",
      items: [{
        item_id: basePuja?._id || "chadhava",
        item_name: basePuja?.name || "Chadhava",
        item_category: "Chadhava",
      }],
    });
  }, [basePuja, router]);

  const [whatsapp, setWhatsapp] = useState("");
  const lastFetchedPhoneRef = useRef<string>("");
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [name, setName] = useState("");
  const [family, setFamily] = useState<string[]>(Array(familySize).fill(""));
  const [gotra, setGotra] = useState("");
  const [dontKnowGotra, setDontKnowGotra] = useState(false);
  const [ancestorNames, setAncestorNames] = useState<string[]>([""]);
  const [address, setAddress] = useState({
    address1: "",
    postal: "",
    city: "",
    state: "",
  });

  // --- Validation State ---
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = (field: string, value: any) => {
    let error = "";
    switch (field) {
      case "whatsapp":
        if (!value) error = "Mobile number is required.";
        else if (!isValidPhone(value, country)) error = "Enter a valid mobile number.";
        break;
      case "name":
        if (!value.trim()) error = "Name is required.";
        else if (value.trim().length < 3) error = "Name must be at least 3 characters.";
        break;
      case "address1":
        if (!value.trim()) error = "Address is required.";
        else if (value.trim().length < 10) error = "Please enter a complete address (min 10 chars).";
        break;
      case "postal":
        if (!value) error = "PIN Code is required.";
        else if (!/^[1-9]\d{5}$/.test(value)) error = "Enter a valid 6-digit PIN code.";
        break;
      case "city":
        if (!value.trim()) error = "City is required.";
        break;
      case "state":
        if (!value.trim()) error = "State is required.";
        break;
      case "gotra":
        // Optional if don't know is checked, handled in submit
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
    return error;
  };

  const handleBlur = (field: string, value: any) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value);
  };


  // Prefill user details if logged in
  useEffect(() => {
    try {
      const stored = localStorage.getItem("userDetails");
      if (stored) {
        const parsed = JSON.parse(stored);
        const user = parsed.user;
        if (user) {
          // Name
          const fName = user.firstname || user.firstName || user.given_name || "";
          const lName = user.lastname || user.lastName || user.family_name || "";
          const fullName = `${fName} ${lName}`.trim();
          if (fullName) setName(fullName);

          // WhatsApp / Phone
          let ph = user.phone || "";
          // Remove non-digits
          ph = ph.replace(/\D/g, "");
          // Remove 91 prefix if 12 digits
          if (ph.length === 12 && ph.startsWith("91")) ph = ph.slice(2);
          // Keep last 10 digits
          if (ph.length > 10) ph = ph.slice(-10);

          if (ph) setWhatsapp(ph);

          // Gotra
          if (user.gotra) setGotra(user.gotra);

          // Address (take the first one if available)
          let addr1 = user.address1 || "";
          const cityVal = user.city || "";
          const stateVal = user.state || "";
          const postalVal = user.pincode || "";

          // Fallback parsing from 'address' string if granular fields are missing
          if ((!addr1 || !cityVal || !stateVal || !postalVal) && user.address) {
            // Heuristic: try to split by comma
            // This is just a best-effort fallback if granular data isn't there
            const parts = user.address.split(",").map((s: string) => s.trim());
            if (parts.length > 0 && !addr1) addr1 = parts[0];
            // It's hard to guess city/state/pin from a raw string accurately without a parser,
            // so we primarily rely on granular fields.
          }

          if (addr1 || cityVal || stateVal || postalVal) {
            setAddress({
              address1: addr1,
              city: cityVal,
              state: stateVal,
              postal: postalVal
            });
          }
        }
      }
    } catch (e) {
      console.error("Failed to load user details", e);
    }
  }, []);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedPromo | null>(null);
  /** Which code the server is checking right now, so its button can say so. */
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");

  /** The seva summary opens expanded — it is what the devotee just chose. */
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);

  /** Coupons are listed inline now, so the old full-screen offers modal is gone. */
  const [showAllCoupons, setShowAllCoupons] = useState(false);

  // Frequently bought together modal state
  const [freqModalVisible, setFreqModalVisible] = useState(false);
  const [showCartItems, setShowCartItems] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Local state for modifications (freq added items)
  const [localSelected, setLocalSelected] = useState<{ [id: string]: number }>(selected);

  // --- Cart Persistence on Payment Page ---
  // When user adds/removes accessories here, update the sessionStorage so Detail Page picks it up on back.
  useEffect(() => {
    if (!basePuja?.chadhavaId) return;

    try {
      const key = `vv_cart_${basePuja.chadhavaId}`;
      const existing = sessionStorage.getItem(key);
      let parsed = existing ? JSON.parse(existing) : {};

      // Init structure if missing
      if (!parsed) parsed = {};

      // Update singles with our local modifications
      // Note: Payment page uses 'localSelected' for accessories.
      // Detail page expects 'singles'.
      parsed.singles = localSelected;

      sessionStorage.setItem(key, JSON.stringify(parsed));
    } catch (e) {
      console.error("Failed to update cart session from payment page", e);
    }
  }, [localSelected, basePuja?.chadhavaId]);


  // --- Helpers for input sanitization & validation (India standards) ---
  const sanitizeName = (s: string) =>
    s
      .replace(/\s{2,}/g, " ") // collapse runs of spaces to one
      .replace(/^\s+/, ""); // remove leading spaces only (keep trailing during typing)

  const sanitizeWhatsapp = (s: string) => sanitizePhone(s, country);

  /** Only India's account lookup (below) is keyed on the bare-10-digit format;
   *  form validation uses the country-aware isValidPhone() instead. */
  const isValidIndianMobile = (s: string) => /^[6-9]\d{9}$/.test(s);
  const isValidIndianPincode = (s: string) => /^[1-9]\d{5}$/.test(s);

  const checkoutCartRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        checkoutCartRef.current &&
        !checkoutCartRef.current.contains(event.target as Node)
      ) {
        setShowCartItems(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCartItems]);

  const combosTotal = Object.entries(selectedCombos).reduce((sum, [id, qty]) => {
    const c = comboPlans.find((x: any) => x.id === id);
    return sum + (c ? c.price * Number(qty) : 0);
  }, 0);

  const accessoriesPrice = Object.entries(localSelected).reduce((sum, [id, qty]) => {
    const it = accessoriesList.find((x: any) => x.id === id);
    return sum + (it ? it.price * Number(qty) : 0);
  }, 0);

  // First ancestor is covered by the base price; every ancestor after that
  // adds the chadhava's own pitruPujaPrice.
  const pitruPujaPrice = Number(chadhavaDoc?.pitruPujaPrice) || 0;
  const trimmedAncestorNames = ancestorNames.map((n) => n.trim()).filter(Boolean);
  const pitruPujaExtraFee = isPitruPuja
    ? Math.max(ancestorNames.length - 1, 0) * pitruPujaPrice
    : 0;

  const finalTotalPrice =
    combosTotal +
    accessoriesPrice +
    (needPrasad && prasad ? prasad.price : 0) +
    (isPitruPuja ? 0 : family.length * 50) +
    pitruPujaExtraFee +
    upsellTotal;

  /**
   * The server priced this discount against `finalTotalPrice`, capping it so the
   * order never reaches ₹0 (Razorpay cannot create such an order). It re-prices
   * whenever that total or the devotee's number moves — see the effect below —
   * so `finalAmount` is never stale.
   */
  const discountedTotalPrice = appliedCoupon ? appliedCoupon.finalAmount : finalTotalPrice;

  // Show address only when something physical needs to be shipped
  const hasSelectedGift = giftSelected && Object.values(giftSelected).some(Boolean);
  const needAddress = needPrasad || hasSelectedGift;

  const { data: allPromos = [], isLoading: isPromosLoading } = useVedicPromosQuery();
  const listedPromos = useMemo(() => {
    const now = Date.now();
    return allPromos.filter((p) => isListablePromo(p, now));
  }, [allPromos]);

  const recommendedPromo = useMemo(() => {
    const eligible = listedPromos.filter((p) => finalTotalPrice >= (p.startRange || 0));
    if (eligible.length === 0) return null;
    return eligible.reduce((best, p) => (p.discountAmount > best.discountAmount ? p : best), eligible[0]);
  }, [listedPromos, finalTotalPrice]);

  /** Eligibility can depend on the devotee's number, so wait for them to finish
   *  typing it before asking the server about it. */
  const whatsappDigits = whatsapp.replace(/\D/g, "");
  const [settledPhone, setSettledPhone] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setSettledPhone(whatsappDigits), 500);
    return () => clearTimeout(id);
  }, [whatsappDigits]);

  /** What the applied coupon was last judged against. */
  const promoPhoneRef = useRef("");
  const promoOrderValueRef = useRef(0);
  const appliedCouponRef = useRef(appliedCoupon);
  useEffect(() => {
    appliedCouponRef.current = appliedCoupon;
  });

  /**
   * Validated on the server, against both the order value and this devotee's own
   * number — rules such as "first booking only" depend on who is asking, which
   * the browser cannot answer and used not to ask. Every other rule (active,
   * expiry, start date, app-only, minimum order) is enforced there too, so the
   * code no longer carries its own copy of any of them.
   */
  const applyCouponByCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) {
      setCouponError("Please enter a coupon code.");
      return false;
    }
    setCouponError("");
    setApplyingCode(code.toUpperCase());
    try {
      const phone = settledPhone || whatsappDigits;
      const applied = await validatePromo(code, finalTotalPrice, phone);
      promoPhoneRef.current = phone;
      promoOrderValueRef.current = finalTotalPrice;
      setAppliedCoupon(applied);
      setCouponCode("");
      setShowAllCoupons(false);
      notification.success({
        message: "Coupon Applied",
        description: `Congratulations! You saved ${money(applied.discountAmount)}!`,
        placement: "topRight",
      });
      return true;
    } catch (err) {
      const message = apiErrorMessage(err, "Could not apply this coupon. Please try again.");
      setCouponError(message);
      notification.error({
        message: "Coupon not applicable",
        description: message,
        placement: "topRight",
      });
      return false;
    } finally {
      setApplyingCode(null);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    promoPhoneRef.current = "";
    promoOrderValueRef.current = 0;
  };

  /**
   * Re-checks an applied coupon when the order value or the WhatsApp number
   * changes under it — adding an upsell can push the total past a minimum, and a
   * code eligible for one devotee may not be for the next. Better to settle it
   * here, with the reason visible, than to have the booking refused at the moment
   * the devotee expects Razorpay to open.
   */
  useEffect(() => {
    const promo = appliedCouponRef.current;
    if (!promo) return;
    if (settledPhone === promoPhoneRef.current && finalTotalPrice === promoOrderValueRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const applied = await validatePromo(promo.promoName, finalTotalPrice, settledPhone);
        if (cancelled) return;
        promoPhoneRef.current = settledPhone;
        promoOrderValueRef.current = finalTotalPrice;
        setAppliedCoupon(applied);
      } catch (err) {
        if (cancelled) return;
        const message = apiErrorMessage(
          err,
          `Coupon "${promo.promoName}" can no longer be used on this order.`,
        );
        promoPhoneRef.current = "";
        promoOrderValueRef.current = 0;
        setAppliedCoupon(null);
        setCouponError(message);
        notification.warning({
          message: "Coupon Removed",
          description: message,
          placement: "topRight",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [settledPhone, finalTotalPrice]);

  const addFamilyMember = () => setFamily((f) => [...f, ""]);
  const removeFamilyMember = (idx: number) =>
    setFamily((f) => f.filter((_, i) => i !== idx));
  const updateFamilyMember = (idx: number, value: string) =>
    setFamily((f) => f.map((v, i) => (i === idx ? value : v)));

  const addAncestorName = () => setAncestorNames((a) => [...a, ""]);
  const removeAncestorName = (idx: number) =>
    setAncestorNames((a) => a.filter((_, i) => i !== idx));
  const updateAncestorName = (idx: number, value: string) =>
    setAncestorNames((a) => a.map((v, i) => (i === idx ? value : v)));


  const updateAccessory = (id: string, delta: number) => {
    setLocalSelected((prev) => {
      const qty = (prev[id] || 0) + delta;
      const copy = { ...prev };
      if (qty <= 0) delete copy[id];
      else copy[id] = qty;
      return copy;
    });
  };

  // Frequently bought together: accessories priced 50–302
  // Make sure to filter from passed accessoriesList
  const freqItems = accessoriesList.filter(
    (a: any) => !localSelected[a.id]
  );

  const fetchUserDetails = async (phone: string) => {
    // Helper to clear fields
    const clearFields = () => {
      setName("");
      setGotra("");
      setAddress({ address1: "", postal: "", city: "", state: "" });
      // Reset family to initial empty slots
      setFamily(Array(familySize).fill(""));
    };

    try {
      const { data } = await api.get(`/get-user-by-phone/${phone}`);

      if (data && data.user) {


        const rawName = data.user.name || data.user.fullName || "";
        const fName = data.user.firstname || data.user.firstName || data.user.given_name || "";
        const lName = data.user.lastname || data.user.lastName || data.user.family_name || "";

        let full = `${fName} ${lName}`.trim();
        // Fallback to rawName if structured parts are missing
        if (!full && rawName) full = rawName.trim();


        setName(() => full);

        // Gotra
        const userGotra = data.user.gotra || "";

        setGotra(() => userGotra);

        // Update address (Address1, Pincode, City, State)
        setAddress(prev => ({
          ...prev,
          address1: data.user.address1 || "",
          postal: data.user.pincode || "",
          city: data.user.city || "",
          state: data.user.state || "",
        }));

        // Update Family Members — Pitru Puja chadhavas hide this section entirely,
        // so there's nothing to prefill it for.
        if (!isPitruPuja && data.user.familyMembers && Array.isArray(data.user.familyMembers) && data.user.familyMembers.length > 0) {
          const storedFamily = data.user.familyMembers;
          // Reset family to the new user's data plus empty slots if needed
          // for the current booking requirement.

          setFamily(() => {
            // We need at least familySize
            const neededLength = Math.max(familySize, storedFamily.length);
            // Create new array filled with empty strings
            const newFamily = Array(neededLength).fill("");

            // Fill with stored data
            for (let i = 0; i < storedFamily.length; i++) {
              newFamily[i] = storedFamily[i];
            }
            return newFamily;
          });
        } else {
          // If no family members in DB, reset to empty
          setFamily(Array(familySize).fill(""));
        }
      } else {
        // User not found in response data -> Clear
        clearFields();
      }
    } catch (e: any) {
      // If 404 (Not Found), clear fields. Otherwise log error.
      if (e.response && e.response.status === 404) {
        clearFields();
      } else {
        console.error("Details fetch failed", e);
      }
    }
  };

  // Auto-fetch when number becomes valid 10 digits (debounced + deduplicated)
  useEffect(() => {
    // Clear any pending timer
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
    }

    if (isValidIndianMobile(whatsapp) && whatsapp !== lastFetchedPhoneRef.current) {
      // Mark as fetching IMMEDATELY so rapid re-renders don't trigger duplicates
      lastFetchedPhoneRef.current = whatsapp;
      fetchTimerRef.current = setTimeout(() => {
        fetchUserDetails(whatsapp);
      }, 500);
    }

    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
    };
  }, [whatsapp]);

  const handlePay = async () => {
    const referralCode = localStorage.getItem("vedicvaibhav_ref_code");

    // --- ROBUST VALIDATION ---
    const newErrors: { [key: string]: string } = {};
    let firstErrorField = "";

    // 1. WhatsApp
    if (!whatsapp) newErrors.whatsapp = "Mobile number is required.";
    else if (!isValidPhone(whatsapp, country)) newErrors.whatsapp = "Enter a valid mobile number.";
    if (newErrors.whatsapp && !firstErrorField) firstErrorField = "whatsapp";

    // 2. Name
    if (!name.trim()) newErrors.name = "Name is required.";
    else if (name.trim().length < 3) newErrors.name = "Name must be at least 3 characters.";
    if (newErrors.name && !firstErrorField) firstErrorField = "name";

    // 3. Family Members — if a slot exists, it must be filled or removed.
    // Pitru Puja chadhavas collect ancestors instead, so this section is hidden.
    if (!isPitruPuja) {
      family.forEach((m, i) => {
        if (!m.trim()) {
          newErrors[`family_${i}`] = "Name required";
          if (!firstErrorField) firstErrorField = `family_${i}`;
        }
      });
    }

    // 4. Address (only when prasad or gift is claimed)
    if (needAddress) {
      if (!address.address1.trim()) newErrors.address1 = "Address is required.";
      else if (address.address1.trim().length < 10) newErrors.address1 = "Please enter a complete address (min 10 chars).";
      if (newErrors.address1 && !firstErrorField) firstErrorField = "address1";

      if (!address.postal) newErrors.postal = "PIN Code is required.";
      else if (!isValidIndianPincode(address.postal)) newErrors.postal = "Invalid PIN Code.";
      if (newErrors.postal && !firstErrorField) firstErrorField = "postal";

      if (!address.city.trim()) newErrors.city = "City is required.";
      if (newErrors.city && !firstErrorField) firstErrorField = "city";

      if (!address.state.trim()) newErrors.state = "State is required.";
      if (newErrors.state && !firstErrorField) firstErrorField = "state";
    }

    // 5. Gotra
    if (!dontKnowGotra && !gotra.trim()) {
      newErrors.gotra = "Please enter Gotra or check 'Don't know'.";
      if (!firstErrorField) firstErrorField = "gotra";
    }

    // 6. Pitru Puja — ancestor names
    if (isPitruPuja) {
      ancestorNames.forEach((n, i) => {
        if (!n.trim()) {
          newErrors[`ancestor_${i}`] = "Name required";
          if (!firstErrorField) firstErrorField = `ancestor_${i}`;
        }
      });
      if (trimmedAncestorNames.length === 0) {
        newErrors.ancestorNames = "Please add at least one ancestor's name.";
        if (!firstErrorField) firstErrorField = "ancestorNames";
      }
    }

    setErrors(newErrors);
    setTouched({
      whatsapp: true, name: true, address1: true, postal: true, city: true, state: true, gotra: true,
      ...family.reduce((acc, _, i) => ({ ...acc, [`family_${i}`]: true }), {}),
      ...(isPitruPuja ? ancestorNames.reduce((acc, _, i) => ({ ...acc, [`ancestor_${i}`]: true }), {}) : {}),
    });

    if (Object.keys(newErrors).length > 0) {
      // Scroll to error
      const element = document.getElementById(firstErrorField) || document.getElementById("checkout-form-top"); // Fallback
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus();
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      // Errors are shown inline directly below each field
      return;
    }


    // Derive a canonical email for checkout/login when user hasn't provided one elsewhere
    const whatsappDigits = sanitizeWhatsapp(whatsapp);
    const safeEmail = whatsappDigits
      ? `${whatsappDigits}@gmail.com`
      : "user@gmail.com";

    // Prepare full address string for legacy support
    const fullAddress = `${address.address1}, ${address.city}, ${address.state} - ${address.postal}`;

    // Build upsell product list for those added
    const selectedUpsellProducts = upsellProducts
      .filter((p) => addedUpsells[p.productName])
      .map((p) => ({
        productName: p.productName,
        price: p.price,
        discountedPrice: p.discountedPrice ?? p.price,
        description: p.description,
        image: getUpsellImageSrc(p.image),
      }));

    const bookingData = {
      /**
       * Which currency to PRESENT in, plus the market, plus the dial code for
       * phone normalisation. Not an amount: `totalPrice` below stays the INDIA
       * LIST TOTAL exactly as before, and the server applies the foreign markup
       * and the conversion. Sending a converted figure here would apply the
       * markup twice.
       */
      ...orderRequestFields(),
      name,
      whatsapp,
      email: safeEmail,
      // Pitru Puja chadhavas hide the Family Members section — never send
      // whatever the field happens to hold (e.g. a profile prefill) for these.
      family: isPitruPuja ? [] : family,
      gotra: dontKnowGotra
        ? "Kashyap"
        : gotra?.trim()
          ? gotra.trim()
          : "Kashyap",
      pitruPujaDetails: isPitruPuja
        ? { ancestorNames: trimmedAncestorNames.map((n) => `Late ${n}`) }
        : null,
      chadhavaDetails: {
        chadhavaId: basePuja?.chadhavaId || "undefined",
        title: basePuja?.title,
        temple: basePuja?.temple,
        date: basePuja?.date,
      },
      // Offerings payload
      offerings: Object.entries(localSelected).map(([id, qty]) => {
        const item = accessoriesList.find((x: any) => x.id === id);
        return item ? { ...item, quantity: qty } : null;
      }).filter(Boolean),

      comboSelections: Object.entries(selectedCombos).map(([id, qty]) => {
        const combo = comboPlans.find((x: any) => x.id === id);
        return combo ? { ...combo, quantity: Number(qty) } : null;
      }).filter(Boolean),

      giftSelected: giftList.filter((x: any) => giftSelected[x.id]),
      giftList: giftList,

      prasadDetails: needPrasad ? prasad : null,
      totalPrice: discountedTotalPrice,
      // The server re-resolves the coupon against `subtotal` and prices the order
      // from its own answer — `totalPrice` above is what we showed, not what is
      // charged. Sending the code is what lets it check who may use it.
      subtotal: finalTotalPrice,
      promoCode: appliedCoupon?.promoName,
      address: address, // Keep structured address for booking
      referralCode: referralCode,
      vv_utm: getVvUtm(),

      // Upsell products
      upsellProducts: selectedUpsellProducts,
      hasUpsell: selectedUpsellProducts.length > 0,

      // Meta CAPI browser signals
      fbp: getFbp() || undefined,
      fbc: getFbc() || undefined,
      eventSourceUrl: window.location.href,
    };

    // 1. Register/login the user (like before) and update profile with ALL data
    const { data } = await api.post(
      "/phone-login-or-register",
      {
        phone: whatsapp,
        name,
        // Extended Profile Data
        gotra: bookingData.gotra,
        // Pitru Puja chadhavas hide the Family Members step, so `family` is
        // forced empty for this booking — but this call also updates the
        // devotee's saved profile, and the backend overwrites familyMembers
        // whenever the field is an array at all (including []). Omitting it
        // here (rather than sending []) leaves their saved profile untouched.
        ...(isPitruPuja ? {} : { familyMembers: family }),
        // Address Mapping
        address: fullAddress, // Legacy string
        address1: address.address1,
        city: address.city,
        state: address.state,
        pincode: address.postal,
        country: "India", // Default
      }
    );

    // 2. Persist canonical session (ONLY what server returns)
    localStorage.setItem(
      "userDetails",
      JSON.stringify({ user: data.user, token: data.token })
    );

    // 3. (optional) keep checkout-only fields elsewhere
    localStorage.setItem(
      "checkoutContact",
      JSON.stringify({ name, phone: whatsapp, email: safeEmail })
    );

    // 4. Create Razorpay order via backend
    try {
      const response = await api.post(
        "/newChadhava/initiate-payment",
        bookingData
      );

      // Extract Razorpay params from backend response
      const { key, razorpayOrderId, amount, currency, orderID } = response.data;

      // FB Pixel: Track checkout initiation BEFORE opening payment popup
      fbqTrack("InitiateCheckout", {
        content_ids: [basePuja?.chadhavaId || "chadhava"],
        content_name: basePuja?.title,
        content_type: "chadhava",
        value: toInr(discountedTotalPrice),
        currency: "INR",
        num_items: 1, // simplified
      });
      gtag("event", "begin_checkout", {
        currency: "INR",
        value: toInr(discountedTotalPrice),
        items: [{
          item_id: basePuja?.chadhavaId || "chadhava",
          item_name: basePuja?.title || "Chadhava",
          item_category: "Chadhava",
          price: discountedTotalPrice,
          quantity: 1,
        }],
      });

      // Setup Razorpay popup options
      const options = {
        key,
        amount, // paise
        currency,
        name: "Vedic Vaibhav",
        description: "Chadhava Payment",
        order_id: razorpayOrderId,
        handler: async function (rzpResponse: any) {
          setVerifying(true);

          try {
            // 1. Verify payment on backend. This endpoint answers 202 with
            // success:false while another worker (usually the webhook) is
            // finalising — a 2xx that is NOT a confirmation. The old code never
            // inspected the body, so it treated that as done; retrying instead
            // waits for the real answer. The payment is captured either way.
            const outcome = await verifyPaymentWithRetry({
              attempt: async () =>
                (
                  await api.post("/newChadhava/verify-payment", {
                    ...rzpResponse,
                    orderID,
                    bookingDetails: bookingData,
                  })
                ).data,
            });
            if (outcome.status === "declined") throw new Error(outcome.message);

            // 2. FB Pixel Purchase intentionally NOT fired here to prevent
            // double counting (backend sends the CAPI event).

            // GA4 Purchase intentionally NOT fired here either, for the same
            // reason as the pixel above: ChadhavaPaymentSuccessful sends it on
            // the page this redirects to. Both used the same orderID, so this
            // was a duplicate GA4 could only sometimes collapse.

            // 3. Send SMS via your backend API (no Fast2SMS call in frontend)
            try {
              await api.post("/newChadhava/chadhava-sms", {
                id: orderID,
                name: bookingData.name,
                phone: bookingData.whatsapp,
                title: bookingData.chadhavaDetails?.title,
                temple: bookingData.chadhavaDetails?.temple,
                date: bookingData.chadhavaDetails?.date,
              });
            } catch (smsError) {
              console.error("Chadhava SMS failed (backend):", smsError);
              // Don't block success flow for SMS failure
            }

            // 4. Store booking IDs + conversion data
            localStorage.setItem("bookingId", orderID);
            localStorage.setItem("bookedpujaID", bookingData.chadhavaDetails?.chadhavaId || orderID);
            localStorage.setItem("lastChadhavaAmount", String(discountedTotalPrice));
            localStorage.setItem("lastChadhavaOrderId", orderID);
          } catch (error) {
            console.error("Payment verification failed:", error);

            // FB Pixel: Track payment failure
            fbqTrack("PaymentInfoFailed", {
              content_ids: [basePuja?.chadhavaId || "chadhava"],
              value: toInr(discountedTotalPrice),
              currency: "INR",
            });
            gtag("event", "payment_failed", {
              currency: "INR",
              value: toInr(discountedTotalPrice),
              items: [{ item_id: basePuja?.chadhavaId || "chadhava", item_name: basePuja?.title || "Chadhava" }],
            });

            notification.error({
              message: "Payment Verification Failed",
              description: "There was an issue verifying your payment. Please contact support.",
              placement: "top",
            });
          } finally {
            setVerifying(false);
            // Redirect to success page
            router.replace("/chadhavapaymentsuccess");
          }
        },
        prefill: {
          name: bookingData.name,
          contact: bookingData.whatsapp,
          email: bookingData.email || safeEmail,
        },
        theme: { color: "#00BD68" },
      };

      // Load Razorpay dynamically
      const loadRazorpay = () => {
        return new Promise((resolve) => {
          if ((window as any).Razorpay) return resolve(true);
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const loaded = await loadRazorpay();
      if (!loaded) {
        notification.error({
          message: "Payment Initialization Failed",
          description: "Razorpay SDK failed to load. Are you online?",
          placement: "top",
        });
        return;
      }

      // Open Razorpay checkout popup
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment initiation failed:", error);

      // FB Pixel: Track payment initiation failure
      fbqTrack("PaymentInfoFailed", {
        content_ids: [basePuja?.chadhavaId || "chadhava"],
        value: toInr(discountedTotalPrice),
        currency: "INR",
      });
      gtag("event", "payment_failed", {
        currency: "INR",
        value: toInr(discountedTotalPrice),
        items: [{ item_id: basePuja?.chadhavaId || "chadhava", item_name: basePuja?.title || "Chadhava" }],
      });

      // The server refuses a coupon it will not honour, and says why. Showing
      // "check your connection" for that would send the devotee looking in
      // entirely the wrong place.
      notification.error({
        message: "Payment Initiation Failed",
        description: apiErrorMessage(
          error,
          "Unable to start payment. Please check your connection and try again.",
        ),
        placement: "top",
      });
    }
  };

  if (!basePuja) return null;

  return (
    <div className="bg-white min-h-screen pb-32 font-sans selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
      {verifying && <VerticalPaymentLoader />}

      <style>{`
          .custom-scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .custom-scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>

      {/* Title bar. The page has no site header of its own, so this one sticks. */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-[#FFE8D6] via-[#FFF6EF] to-white border-b border-[#F3D3B5]">
        <div className="max-w-2xl mx-auto flex items-center gap-2 min-[360px]:gap-3 px-3 min-[360px]:px-4 py-3.5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="text-[#C2410C] shrink-0"
          >
            <ArrowBackIcon style={{ fontSize: 22 }} />
          </button>
          <h1 className="font-heading font-bold text-[17px] min-[360px]:text-[19px] md:text-[22px] text-[#C2410C] min-w-0 break-words">
            Complete your Seva
          </h1>
        </div>
      </div>

      <motion.div
        className="max-w-2xl mx-auto px-3 md:px-0 pt-4 space-y-4 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Seva summary — same look as the chadhava card on the detail page */}
        <motion.div
          variants={itemVariants}
          className="rounded-xl border border-[#EA580C] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
        >
          <button
            type="button"
            onClick={() => setIsSummaryOpen((v) => !v)}
            aria-expanded={isSummaryOpen}
            className="w-full flex items-center gap-2 min-[360px]:gap-3 bg-gradient-to-r from-[#FFE0C7] to-[#FFF8F2] px-2.5 min-[360px]:px-3 py-3 text-left"
          >
            <img
              loading="lazy"
              src={basePuja?.image || "https://via.placeholder.com/96?text=Chadhava"}
              alt={basePuja?.title || "Chadhava"}
              className="w-16 h-12 min-[360px]:w-20 min-[360px]:h-14 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] min-[360px]:text-[15px] font-medium text-stone-900 leading-snug line-clamp-2">
                {basePuja?.title}
              </div>
              <div className="text-[18px] min-[360px]:text-[20px] font-medium leading-tight text-[#9A3412] mt-0.5 whitespace-nowrap notranslate">
                {money(discountedTotalPrice)}
              </div>
            </div>
            <KeyboardArrowDownIcon
              className="self-start shrink-0"
              style={{
                fontSize: 22,
                color: ORANGE,
                transform: isSummaryOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {isSummaryOpen && (
            <>
              {(basePuja?.temple || basePuja?.date) && (
                <div className="flex items-stretch bg-[#9A3412] py-2.5 md:py-3 text-white">
                  {basePuja?.temple && (
                    <div className="flex items-center gap-2 md:gap-3 flex-1 px-3 md:px-4 min-w-0">
                      <TempleHinduIcon style={{ fontSize: 22 }} className="shrink-0" />
                      <div className="leading-tight min-w-0">
                        <div className="italic text-[12px] md:text-[13px] break-words line-clamp-2">
                          {basePuja.temple}
                        </div>
                        {/* Cleaned again here, not only where basePuja is built:
                            a checkout opened before that fix still carries
                            whatever sessionStorage holds. */}
                        {displayPlace(basePuja?.templePlace) && (
                          <div className="italic text-[10px] opacity-80 truncate">
                            {displayPlace(basePuja.templePlace)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {basePuja?.temple && basePuja?.date && <div className="w-px bg-white/70 my-0.5" />}
                  {basePuja?.date && (
                    <div className="flex items-center gap-1.5 md:gap-2 shrink-0 min-w-fit pl-2.5 pr-2 md:basis-[30%] md:pl-3 whitespace-nowrap">
                      <CalendarMonthIcon style={{ fontSize: 18 }} className="shrink-0" />
                      <div className="italic text-[12px] md:text-[13px] leading-tight">
                        {formatShortDate(basePuja.date)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white px-3 md:px-4 py-3">
                <h3 className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  Your selections
                </h3>
                <ul className="space-y-2 text-[13px]">
                  {/* Combos first */}
                  {Object.entries(selectedCombos).map(([id, qty]) => {
                    const combo = comboPlans.find((c: any) => c.id === id);
                    if (!combo) return null;
                    return (
                      <li key={combo.id} className="flex justify-between items-start gap-3 text-stone-700">
                        <span className="flex items-start gap-2 min-w-0">
                          <span className="w-5 h-5 shrink-0 rounded-full bg-[#FFF1E6] text-[#C2410C] flex items-center justify-center text-[10px] font-bold notranslate">
                            {String(qty)}
                          </span>
                          <span className="break-words">{combo.title}</span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap font-semibold text-stone-900 notranslate">
                          {money(combo.price * Number(qty))}
                        </span>
                      </li>
                    );
                  })}
                  {/* Then individual accessories */}
                  {Object.entries(localSelected).map(([id, qty]) => {
                    const acc = accessoriesList.find(
                      (a: { id: string; name: string; price: number }) => a.id === id
                    );
                    return acc ? (
                      <li key={id} className="flex justify-between items-start gap-3 text-stone-700">
                        <span className="flex items-start gap-2 min-w-0">
                          <span className="w-5 h-5 shrink-0 rounded-full bg-[#FFF1E6] text-[#C2410C] flex items-center justify-center text-[10px] font-bold notranslate">
                            {String(qty)}
                          </span>
                          <span className="break-words">{acc.name}</span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap font-semibold text-stone-900 notranslate">
                          {money(acc.price * Number(qty))}
                        </span>
                      </li>
                    ) : null;
                  })}
                  {/* Free Gifts */}
                  {giftSelected && giftList && Object.entries(giftSelected).map(([id, isSelected]) => {
                    if (!isSelected) return null;
                    const gift = giftList.find((g: any) => g.id === id);
                    if (!gift) return null;
                    return (
                      <li
                        key={id}
                        className="flex justify-between items-center gap-3 text-[#2E7D3E] bg-[#F0FAF0] border border-[#C8EAC8] px-2 py-1 rounded-lg"
                      >
                        <span className="min-w-0 break-words">🎁 {gift.title.replace(/^FREE\s*/i, "")}</span>
                        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide">Free</span>
                      </li>
                    );
                  })}
                  {needPrasad && prasad && (
                    <li className="flex justify-between items-start gap-3 text-stone-700">
                      <span className="flex items-start gap-2 min-w-0">
                        <span className="w-5 h-5 shrink-0 rounded-full bg-[#FFF1E6] text-[#C2410C] flex items-center justify-center text-[10px] font-bold">
                          1
                        </span>
                        <span className="break-words">{prasad.name}</span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap font-semibold text-stone-900 notranslate">
                        {money(prasad.price)}
                      </span>
                    </li>
                  )}
                  {!isPitruPuja && family.length > 0 && (
                    <li className="flex justify-between items-start gap-3 text-stone-700">
                      <span className="flex items-start gap-2 min-w-0">
                        <span className="w-5 h-5 shrink-0 rounded-full bg-[#FFF1E6] text-[#C2410C] flex items-center justify-center text-[10px] font-bold notranslate">
                          {family.length}
                        </span>
                        <span className="break-words">Additional members</span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap font-semibold text-stone-900 notranslate">
                        {money(family.length * 50)}
                      </span>
                    </li>
                  )}
                  {pitruPujaExtraFee > 0 && (
                    <li className="flex justify-between items-start gap-3 text-stone-700">
                      <span className="flex items-start gap-2 min-w-0">
                        <span className="w-5 h-5 shrink-0 rounded-full bg-[#FFF1E6] text-[#C2410C] flex items-center justify-center text-[10px] font-bold notranslate">
                          {ancestorNames.length - 1}
                        </span>
                        <span className="break-words">Additional ancestors</span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap font-semibold text-stone-900 notranslate">
                        {money(pitruPujaExtraFee)}
                      </span>
                    </li>
                  )}
                  {/* Upsell products in summary */}
                  {upsellProducts.filter((p) => addedUpsells[p.productName]).map((p) => (
                    <li
                      key={p.productName}
                      className="flex justify-between items-center gap-3 text-[#C2410C] bg-[#FFF6EF] border border-[#F3D3B5] px-2 py-1 rounded-lg"
                    >
                      <span className="min-w-0 break-words">🛍️ {p.productName}</span>
                      <span className="shrink-0 whitespace-nowrap font-semibold notranslate">
                        {money(p.discountedPrice ?? p.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </motion.div>

        {/* Input Section */}
        <motion.div variants={itemVariants} className="space-y-4">
          <Card id="whatsapp">
            <SectionHeading title="Add your WhatsApp number" />
            <ModernInput
              label="WhatsApp number"
              value={whatsapp}
              onChange={(e: any) => {
                const val = sanitizeWhatsapp(e.target.value);
                setWhatsapp(val);
                if (touched.whatsapp) validateField("whatsapp", val);
              }}
              onBlur={() => handleBlur("whatsapp", whatsapp)}
              placeholder={country.iso2 === "IN" ? "9876543210" : "Mobile number"}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              error={errors.whatsapp}
              touched={touched.whatsapp}
              maxLength={country.phone[1]}
              hint="Sewa updates will be sent to this number."
              prefix={
                <>
                  <WhatsAppIcon style={{ fontSize: 18, color: "#25D366" }} />
                  <span className="whitespace-nowrap notranslate">
                    {country.flag} +{country.dial}
                  </span>
                </>
              }
            />
          </Card>

          <Card id="name">
            <SectionHeading
              icon={<PersonOutlineIcon style={{ fontSize: 18, color: ORANGE }} />}
              title="Enter the name of the devotee for the Sankalp"
            />
            <ModernInput
              label="Devotee name"
              value={name}
              onChange={(e: any) => {
                const val = sanitizeName(e.target.value).slice(0, 25);
                setName(val);
                if (touched.name) validateField("name", val);
              }}
              onBlur={() => handleBlur("name", name)}
              placeholder="Full name for the Sankalp"
              maxLength={30}
              error={errors.name}
              touched={touched.name}
              hint="The pandit takes the Sankalp in this name."
            />
          </Card>

          {/* Gotra Section */}
          <Card id="gotra">
            <SectionHeading title="Add your Gotra" subtitle="Gotra of the devotee named above" />

            <RequiredLabel>Gotra</RequiredLabel>
            <div
              className={`flex items-center gap-2 px-3 min-[360px]:px-4 ${fieldShell(
                !dontKnowGotra && !!errors.gotra && !!touched.gotra
              )}`}
            >
              <input
                value={gotra}
                onChange={(e: any) => {
                  setGotra(e.target.value);
                  if (touched.gotra) validateField("gotra", e.target.value);
                }}
                onBlur={() => handleBlur("gotra", gotra)}
                disabled={dontKnowGotra}
                aria-invalid={!dontKnowGotra && !!errors.gotra && !!touched.gotra}
                className="flex-1 min-w-0 py-3 text-[14px] outline-none bg-transparent disabled:text-stone-400"
                placeholder={dontKnowGotra ? "Default (Kashyap)" : "Enter Gotra"}
              />
              <InfoOutlinedIcon
                style={{ fontSize: 18, color: ORANGE }}
                titleAccess="Your Gotra identifies your ancestral lineage — the pandit uses it while taking the Sankalp for this sewa."
              />
            </div>
            <InlineError message={!dontKnowGotra && touched.gotra ? errors.gotra : ""} />

            <label className="flex items-center gap-2 mt-3 text-[13px] text-stone-600">
              <input
                type="checkbox"
                checked={dontKnowGotra}
                onChange={(e) => {
                  setDontKnowGotra(e.target.checked);
                  if (e.target.checked) setErrors((prev) => ({ ...prev, gotra: "" }));
                }}
                className="w-4 h-4 accent-[#EA580C]"
              />
              I don&apos;t know my Gotra
            </label>

            {dontKnowGotra && (
              <p className="text-[12px] text-[#2E7D3E] bg-[#F0FAF0] border border-[#C8EAC8] rounded-xl px-3 py-2 mt-2 leading-relaxed">
                As per scriptures, the Sankalp can be taken with Kashyap Gotra, allowing you to receive the full
                benefit of the sewa.
              </p>
            )}
          </Card>

          {/* Pitru Puja Section — ancestor names */}
          {isPitruPuja && (
            <Card id="ancestorNames">
              <SectionHeading
                icon={<GroupsOutlinedIcon style={{ fontSize: 18, color: ORANGE }} />}
                title="For which ancestor is this ritual being performed?"
                subtitle={
                  pitruPujaPrice > 0
                    ? `First ancestor is included · ${money(pitruPujaPrice)} for each one after`
                    : "Enter the name of the ancestor(s)"
                }
              />

              <p className="text-[12px] text-stone-600 bg-[#FFF6EF] border border-[#F3D3B5] rounded-xl px-3 py-2 mb-3 leading-relaxed">
                This is a Pitru Puja — please add the name(s) of the ancestor(s) this ritual is being performed
                for.
              </p>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {ancestorNames.map((memberName, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: "hidden" }}
                      id={`ancestor_${idx}`}
                    >
                      {idx === 0 ? (
                        <RequiredLabel>Name of 1st ancestor</RequiredLabel>
                      ) : (
                        <OptionalLabel>{`Name of ancestor ${idx + 1}`}</OptionalLabel>
                      )}
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex-1 min-w-0 flex items-stretch overflow-hidden ${fieldShell(
                            !!errors[`ancestor_${idx}`] && !!touched[`ancestor_${idx}`]
                          )}`}
                        >
                          <span
                            className={`flex items-center px-3 bg-[#FFF1E6] text-[13px] font-semibold text-[#C2410C] border-r shrink-0 ${
                              errors[`ancestor_${idx}`] && touched[`ancestor_${idx}`]
                                ? "border-[#C0392B]"
                                : "border-stone-300"
                            }`}
                          >
                            Late
                          </span>
                          <input
                            value={memberName}
                            onChange={(e) => updateAncestorName(idx, e.target.value)}
                            className="flex-1 min-w-0 px-3 py-3 text-[14px] outline-none bg-transparent"
                            placeholder="Ancestor's name"
                          />
                        </div>
                        {ancestorNames.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAncestorName(idx)}
                            aria-label={`Remove ancestor ${idx + 1}`}
                            className="shrink-0 w-10 h-[46px] flex items-center justify-center rounded-xl border border-stone-300 text-stone-400 hover:text-[#C0392B] hover:border-[#C0392B] transition-colors"
                          >
                            <CloseIcon style={{ fontSize: 16 }} />
                          </button>
                        )}
                      </div>
                      <InlineError message={touched[`ancestor_${idx}`] ? errors[`ancestor_${idx}`] : ""} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={addAncestorName}
                className="flex items-center gap-1 mt-3 text-[13px] font-semibold text-[#C2410C]"
              >
                <AddIcon style={{ fontSize: 16 }} />
                Add ancestor
              </button>
            </Card>
          )}

          {/* Family Members Section — Pitru Puja chadhavas collect ancestors instead */}
          {!isPitruPuja && (
            <Card>
              <SectionHeading
                icon={<GroupsOutlinedIcon style={{ fontSize: 18, color: ORANGE }} />}
                title="Include family members in the Sankalp"
                subtitle={`${money(50)} per additional member`}
              />

              {family.length === 0 ? (
                <p className="text-[12px] text-stone-600 bg-[#FFF6EF] border border-[#F3D3B5] rounded-xl px-3 py-2 leading-relaxed">
                  The Sankalp is taken in the devotee&apos;s name and its benefits reach the whole family. Add
                  names here only if you want each member taken by name.
                </p>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {family.map((member, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: "hidden" }}
                        id={`family_${idx}`}
                      >
                        <OptionalLabel>{`Family member ${idx + 1}`}</OptionalLabel>
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex-1 min-w-0 flex items-center ${fieldShell(
                              !!errors[`family_${idx}`] && !!touched[`family_${idx}`]
                            )}`}
                          >
                            <input
                              value={member}
                              onChange={(e) => updateFamilyMember(idx, e.target.value)}
                              className="flex-1 min-w-0 px-3 py-3 text-[14px] outline-none bg-transparent"
                              placeholder="Family member's name"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFamilyMember(idx)}
                            aria-label={`Remove family member ${idx + 1}`}
                            className="shrink-0 w-10 h-[46px] flex items-center justify-center rounded-xl border border-stone-300 text-stone-400 hover:text-[#C0392B] hover:border-[#C0392B] transition-colors"
                          >
                            <CloseIcon style={{ fontSize: 16 }} />
                          </button>
                        </div>
                        <InlineError message={touched[`family_${idx}`] ? errors[`family_${idx}`] : ""} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              <button
                type="button"
                onClick={addFamilyMember}
                className="flex items-center gap-1 mt-3 text-[13px] font-semibold text-[#C2410C]"
              >
                <AddIcon style={{ fontSize: 16 }} />
                Add family member
              </button>
            </Card>
          )}

          {/* Address Section — only when prasad or gift is claimed */}
          {needAddress && (
            <Card id="address">
              <SectionHeading
                icon={<LocalShippingOutlinedIcon style={{ fontSize: 18, color: ORANGE }} />}
                title="Where should we courier your prasad?"
              />

              <div className="space-y-3">
                <div id="address1">
                  <ModernInput
                    label="Street address / house no."
                    value={address.address1}
                    onChange={(e: any) => {
                      setAddress((a) => ({ ...a, address1: e.target.value }));
                      if (touched.address1) validateField("address1", e.target.value);
                    }}
                    onBlur={() => handleBlur("address1", address.address1)}
                    placeholder="E.g. Flat 101, Om Shanti Apartments"
                    error={errors.address1}
                    touched={touched.address1}
                  />
                </div>

                <div id="postal">
                  <ModernInput
                    label="Pincode"
                    value={address.postal}
                    onChange={(e: any) => {
                      let v = e.target.value.replace(/\D/g, "");
                      if (v.length > 6) v = v.slice(0, 6);
                      setAddress((a) => ({ ...a, postal: v }));
                      if (touched.postal) validateField("postal", v);
                    }}
                    onBlur={() => handleBlur("postal", address.postal)}
                    placeholder="110001"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    error={errors.postal}
                    touched={touched.postal}
                    maxLength={6}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div id="city">
                    <ModernInput
                      label="City"
                      value={address.city}
                      onChange={(e: any) => {
                        setAddress((a) => ({ ...a, city: e.target.value }));
                        if (touched.city) validateField("city", e.target.value);
                      }}
                      onBlur={() => handleBlur("city", address.city)}
                      placeholder="New Delhi"
                      error={errors.city}
                      touched={touched.city}
                    />
                  </div>

                  <div id="state">
                    <ModernInput
                      label="State"
                      value={address.state}
                      onChange={(e: any) => {
                        setAddress((a) => ({ ...a, state: e.target.value }));
                        if (touched.state) validateField("state", e.target.value);
                      }}
                      onBlur={() => handleBlur("state", address.state)}
                      placeholder="Delhi"
                      error={errors.state}
                      touched={touched.state}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ─── Upsell Product Card ─── */}
          {upsellProducts.length > 0 && (
            <motion.div variants={itemVariants} className="mt-4">
              {/* Section header */}
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-200 to-transparent" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                  <span className="text-[11px]">🪔</span> Bless with an Add-on
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-200 to-transparent" />
              </div>

              <div className="space-y-3">
                {upsellProducts.map((product) => {
                  const isAdded = !!addedUpsells[product.productName];
                  const imgSrc = getUpsellImageSrc(product.image);
                  const savingPct = product.price > 0 && product.discountedPrice < product.price
                    ? Math.round(((product.price - (product.discountedPrice ?? product.price)) / product.price) * 100)
                    : 0;

                  return (
                    <motion.div
                      key={product.productName}
                      layout
                      className={`relative rounded-2xl border overflow-hidden transition-all duration-300 ${isAdded
                        ? "border-orange-300 shadow-lg shadow-orange-100/60 bg-gradient-to-br from-orange-50/80 via-amber-50/50 to-white"
                        : "border-slate-100 bg-white shadow-sm hover:border-orange-200 hover:shadow-md hover:shadow-orange-50"
                        }`}
                    >
                      {/* Discount badge */}
                      {savingPct > 0 && (
                        <div className="absolute top-2.5 left-2.5 z-10 bg-gradient-to-br from-red-500 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">
                          {savingPct}% OFF
                        </div>
                      )}

                      {/* Added checkmark overlay on image */}
                      {isAdded && (
                        <div className="absolute top-2.5 right-2.5 z-10 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      <div className="flex gap-0">
                        {/* Square product image — clickable to open modal */}
                        <button
                          type="button"
                          onClick={() => setSelectedUpsellModal(product)}
                          className="shrink-0 w-28 h-28 relative overflow-hidden bg-amber-50 focus:outline-none"
                        >
                          {imgSrc ? (
                            <img
                              loading="lazy"
                              src={imgSrc}
                              alt={product.productName}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl bg-amber-50">
                              🪔
                            </div>
                          )}
                          {/* Subtle "tap to view" hint */}
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-end justify-center pb-1.5">
                            <span className="text-[8px] font-semibold text-white/0 hover:text-white/80 bg-black/0 hover:bg-black/30 px-1.5 py-0.5 rounded transition-all">
                              View
                            </span>
                          </div>
                        </button>

                        {/* Info + Action */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between p-3 pl-3.5">
                          <div>
                            {/* Product name */}
                            <button
                              type="button"
                              onClick={() => setSelectedUpsellModal(product)}
                              className="text-left w-full focus:outline-none"
                            >
                              <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 hover:text-orange-700 transition-colors">
                                {product.productName}
                              </p>
                            </button>
                            {/* Description */}
                            {product.description && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                {product.description}
                              </p>
                            )}
                          </div>

                          {/* Price + Button row */}
                          <div className="flex items-center justify-between mt-2.5">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-black text-orange-600 notranslate">
                                {money(product.discountedPrice ?? product.price)}
                              </span>
                              {product.discountedPrice && product.discountedPrice < product.price && (
                                <span className="text-[11px] text-slate-400 line-through notranslate">
                                  {money(product.price)}
                                </span>
                              )}
                            </div>

                            {/* Light orange Add/Added toggle button */}
                            <motion.button
                              whileTap={{ scale: 0.93 }}
                              type="button"
                              onClick={() => toggleUpsell(product.productName)}
                              className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs transition-all duration-200 ${isAdded
                                ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                                : "bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 hover:border-orange-300 hover:shadow-sm"
                                }`}
                            >
                              {isAdded ? (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Added
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                  </svg>
                                  Add
                                </>
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </div>

                      {/* Bottom confirmation strip */}
                      <AnimatePresence>
                        {isAdded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold text-center py-1 overflow-hidden tracking-wide"
                          >
                            ✨ Added to your booking · {money(product.discountedPrice ?? product.price)} extra
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── Product Detail Modal ─── */}
          <AnimatePresence>
            {selectedUpsellModal && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedUpsellModal(null)}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                />

                {/* Bottom sheet modal */}
                <motion.div
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
                >
                  {/* Handle bar */}
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-slate-200 rounded-full" />
                  </div>

                  {/* Product image — full width square-ish */}
                  {getUpsellImageSrc(selectedUpsellModal.image) ? (
                    <div className="relative w-full aspect-square max-h-72 overflow-hidden">
                      <img
                        src={getUpsellImageSrc(selectedUpsellModal.image)}
                        alt={selectedUpsellModal.productName}
                        className="w-full h-full object-cover"
                      />
                      {/* Decorative gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                      {/* Close button */}
                      <button
                        type="button"
                        onClick={() => setSelectedUpsellModal(null)}
                        className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md text-slate-600 hover:text-slate-900"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {/* Discount badge on modal image */}
                      {selectedUpsellModal.price > 0 && selectedUpsellModal.discountedPrice < selectedUpsellModal.price && (
                        <div className="absolute top-3 left-3 bg-gradient-to-br from-red-500 to-orange-500 text-white text-xs font-black px-3 py-1 rounded-full shadow">
                          {Math.round(((selectedUpsellModal.price - selectedUpsellModal.discountedPrice) / selectedUpsellModal.price) * 100)}% OFF
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 bg-amber-50 text-6xl">
                      🪔
                    </div>
                  )}

                  {/* Content */}
                  <div className="px-5 pt-4 pb-8">
                    {/* Decorative Sanskrit-inspired divider */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-orange-200" />
                      <span className="text-orange-400 text-xs">✦</span>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-orange-200" />
                    </div>

                    <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">
                      {selectedUpsellModal.productName}
                    </h3>

                    {/* Price row */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-black text-orange-600 notranslate">
                        {money(selectedUpsellModal.discountedPrice ?? selectedUpsellModal.price)}
                      </span>
                      {selectedUpsellModal.discountedPrice && selectedUpsellModal.discountedPrice < selectedUpsellModal.price && (
                        <>
                          <span className="text-base text-slate-400 line-through notranslate">
                            {money(selectedUpsellModal.price)}
                          </span>
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            Save {money(selectedUpsellModal.price - selectedUpsellModal.discountedPrice)}
                          </span>
                        </>
                      )}
                    </div>

                    {selectedUpsellModal.description && (
                      <p className="text-sm text-slate-600 leading-relaxed mb-5">
                        {selectedUpsellModal.description}
                      </p>
                    )}

                    {/* CTA button */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => {
                        toggleUpsell(selectedUpsellModal.productName);
                        setSelectedUpsellModal(null);
                      }}
                      className={`w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all duration-200 ${addedUpsells[selectedUpsellModal.productName]
                        ? "bg-slate-100 text-slate-500 border border-slate-200"
                        : "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200"
                        }`}
                    >
                      {addedUpsells[selectedUpsellModal.productName] ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Remove from booking
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Add to Booking
                        </span>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </motion.div>

        {/* Coupon */}
        <Card>
          <SectionHeading
            icon={<LocalOfferIcon style={{ fontSize: 18, color: ORANGE }} />}
            title="Apply Coupon"
          />

          {appliedCoupon ? (
            <div className="flex items-center gap-2 min-[360px]:gap-3 rounded-xl border border-[#C8EAC8] bg-[#F0FAF0] px-2.5 min-[360px]:px-3 py-2.5">
              <CheckCircleIcon style={{ fontSize: 22, color: "#2E9E45" }} />
              <div className="flex-1 min-w-0 leading-tight">
                <div translate="no" className="text-[14px] font-semibold text-stone-900 truncate">
                  {appliedCoupon.promoName}
                </div>
                <div className="text-[12px] text-[#2E7D3E] notranslate">
                  You save {money(appliedCoupon.discountAmount)}
                </div>
              </div>
              <button
                type="button"
                onClick={removeCoupon}
                className="text-[13px] font-semibold text-[#C2410C] shrink-0"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className={`flex-1 min-w-0 flex items-center px-3 ${fieldShell(!!couponError)}`}>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      if (couponError) setCouponError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyCouponByCode(couponCode);
                      }
                    }}
                    placeholder="Enter coupon code"
                    autoCapitalize="characters"
                    className="flex-1 min-w-0 py-3 text-[14px] uppercase placeholder:normal-case outline-none bg-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => applyCouponByCode(couponCode)}
                  disabled={!!applyingCode}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-[#ff5a00] to-[#ff8a00] disabled:opacity-60 text-white text-[13px] min-[360px]:text-[14px] font-medium px-4 whitespace-nowrap"
                >
                  {applyingCode && applyingCode === couponCode.trim().toUpperCase() ? "Applying..." : "Apply"}
                </button>
              </div>
              <InlineError message={couponError} />

              {(isPromosLoading || listedPromos.length > 0) && (
              <button
                type="button"
                onClick={() => setShowAllCoupons((v) => !v)}
                aria-expanded={showAllCoupons}
                className="flex items-center gap-1 mt-3 text-[13px] font-semibold text-[#C2410C]"
              >
                {showAllCoupons ? "Hide coupons" : "View all coupons"}
                <KeyboardArrowDownIcon
                  style={{
                    fontSize: 18,
                    transform: showAllCoupons ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              )}

              {showAllCoupons && (
                <div className="mt-2 space-y-2">
                  {isPromosLoading && <p className="text-[12px] text-stone-500">Loading coupons…</p>}
                  {listedPromos.map((promo) => {
                    const isEligible = finalTotalPrice >= (promo.startRange || 0);
                    const needed = (promo.startRange || 0) - finalTotalPrice;
                    const isApplying = applyingCode === promo.promoName.toUpperCase();
                    return (
                      <div
                        key={promo._id}
                        className={`flex items-center gap-2 min-[360px]:gap-3 rounded-xl border border-dashed px-2.5 min-[360px]:px-3 py-2.5 ${
                          isEligible ? "border-[#EA580C] bg-[#FFF6EF]" : "border-stone-300 bg-stone-50 opacity-70"
                        }`}
                      >
                        <div className="flex-1 min-w-0 leading-tight">
                          <div
                            translate="no"
                            className="text-[13px] font-bold tracking-wide text-stone-900 break-words"
                          >
                            {promo.promoName}
                          </div>
                          {promo.firstOrderOnly && (
                            <span className="inline-block rounded-full bg-[#FFF1E6] text-[#C2410C] text-[10px] font-semibold px-2 py-0.5 mt-1">
                              First booking only
                            </span>
                          )}
                          <div className="text-[12px] text-[#2E7D3E] mt-0.5 notranslate">
                            Save {money(promo.discountAmount)}
                          </div>
                          {promo.description && (
                            <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">
                              {promo.description}
                            </div>
                          )}
                          {!isEligible && (
                            <div className="text-[11px] text-stone-500 mt-0.5 notranslate">
                              Add {money(needed)} more to unlock
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => applyCouponByCode(promo.promoName)}
                          disabled={!isEligible || !!applyingCode}
                          className="shrink-0 rounded-lg border border-[#EA580C] text-[#C2410C] disabled:border-stone-300 disabled:text-stone-400 text-[12px] font-semibold px-3 py-1.5"
                        >
                          {isApplying ? "Applying..." : "Apply"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {recommendedPromo && (
                <p className="text-[12px] text-stone-600 mt-3">
                  Tip: use{" "}
                  <span translate="no" className="font-semibold text-stone-900">
                    {recommendedPromo.promoName}
                  </span>{" "}
                  to save{" "}
                  <span className="font-semibold text-[#2E7D3E] notranslate">
                    {money(recommendedPromo.discountAmount)}
                  </span>
                  .
                </p>
              )}
            </>
          )}
        </Card>

        {/* Bill summary */}
        <Card>
          <SectionHeading title="Price Details" />
          <div className="space-y-2 text-[13px] text-stone-600">
            <div className="flex justify-between gap-2 min-[360px]:gap-3">
              <span className="truncate">Sub total</span>
              <span className="shrink-0 whitespace-nowrap text-stone-900 notranslate">
                {money(finalTotalPrice)}
              </span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between gap-2 min-[360px]:gap-3 text-[#2E7D3E]">
                <span className="truncate">
                  Coupon (<span translate="no">{appliedCoupon.promoName}</span>)
                </span>
                <span className="shrink-0 whitespace-nowrap notranslate">
                  − {money(appliedCoupon.discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-2 min-[360px]:gap-3 border-t border-dashed border-stone-300 pt-2 text-[15px] font-semibold text-[#C2410C]">
              <span className="truncate">Amount to Pay</span>
              <span className="shrink-0 whitespace-nowrap notranslate">{money(discountedTotalPrice)}</span>
            </div>
          </div>
        </Card>

        <div className="h-4" />
      </motion.div>

      {/* Styled Footer — hidden during payment verification / after payment */}
      <div ref={checkoutCartRef}>
        {!verifying && (
          <div className="fixed bottom-0 inset-x-0 z-[9999] bg-white px-3 py-2.5 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
            <div className="max-w-2xl mx-auto flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => setShowCartItems(!showCartItems)}
                aria-expanded={showCartItems}
                className="shrink-0 flex flex-col justify-center rounded-xl border border-stone-300 px-3 text-left"
              >
                <span className="flex items-center gap-1 text-[10px] font-semibold text-stone-500 uppercase tracking-wide">
                  Total
                  <KeyboardArrowUpIcon
                    style={{
                      fontSize: 14,
                      transform: showCartItems ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </span>
                <span className="text-[17px] font-semibold text-stone-900 leading-tight notranslate">
                  {money(discountedTotalPrice)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCartItems(false);
                  // Frequently-added-together modal disabled for now; re-enable by
                  // swapping this for setFreqModalVisible(true) if needed later.
                  handlePay();
                }}
                className="flex-1 min-h-[52px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5a00] to-[#ff8a00] text-white text-[15px] font-medium tracking-wide transition-transform active:scale-[0.99]"
              >
                Proceed to Pay
                <span className="shrink-0">→</span>
              </button>
            </div>
          </div>
        )}

        {/* Cart Popup */}
        <AnimatePresence>
          {showCartItems && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-[76px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_-20px_60px_rgba(0,0,0,0.08)] overflow-hidden z-[9998] rounded-3xl"
            >
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-12 h-1 bg-slate-200 rounded-full" />
                </div>
                {/* Prasad */}
                {needPrasad && prasad && (
                  <div key="prasad" className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <img loading="lazy"
                      src={prasad.image}
                      alt={prasad.name}
                      className="w-12 h-12 rounded-xl object-cover shadow-sm bg-white"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-sm">
                        {prasad.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span className="notranslate">{money(prasad.price)}</span> × 1
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      <span className="notranslate">{money(prasad.price)}</span>
                    </div>
                  </div>
                )}

                {/* Combos */}
                {Object.entries(selectedCombos).map(([id, qty]) => {
                  const combo = comboPlans.find((c: any) => c.id === id);
                  if (!combo) return null;
                  return (
                    <div
                      key={`checkout-combo-${combo.id}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <img loading="lazy"
                        src={
                          combo.image ||
                          (combo.images && combo.images[0]) ||
                          "https://via.placeholder.com/40"
                        }
                        alt={combo.title}
                        className="w-12 h-12 rounded-xl object-cover shadow-sm bg-white"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-slate-800 text-sm">
                          {combo.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span className="notranslate">{money(combo.price)}</span> × <span className="notranslate">{Number(qty)}</span>
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        <span className="notranslate">{money(Number(qty) * combo.price)}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Accessories */}
                {Object.entries(localSelected).map(([id, qty]) => {
                  const acc = accessoriesList.find(
                    (a: { id: string }) => a.id === id
                  );
                  if (!acc) return null;
                  return (
                    <div key={acc.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <img loading="lazy"
                        src={acc.image}
                        alt={acc.name}
                        className="w-12 h-12 rounded-xl object-cover shadow-sm bg-white"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-slate-800 text-sm">
                          {acc.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span className="notranslate">{money(acc.price)}</span> × <span className="notranslate">{Number(qty)}</span>
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        <span className="notranslate">{money(acc.price * Number(qty))}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Family members */}
                {family.map((member, idx) => (
                  <div key={`fam-${idx}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 shadow-sm">
                      <span className="text-xl">👤</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-sm">
                        {member || `Member ${idx + 1}`}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Family Member</div>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{money(50)}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {freqModalVisible && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-[99999]"
            onClick={() => setFreqModalVisible(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full md:w-2/3 h-[75vh] bg-white rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative header blob */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-orange-50 to-transparent pointer-events-none" />
              <div className="w-16 h-1 bg-slate-200 rounded-full mx-auto mt-4 mb-2 z-10" />

              <div className="px-6 pt-2 pb-6 flex flex-col h-full z-10">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-24 h-16 shrink-0 rounded-2xl shadow-lg border-2 border-white overflow-hidden relative">
                    <img loading="lazy"
                      src={basePuja?.image || "https://via.placeholder.com/96?text=Chadhava"}
                      alt={basePuja?.title || "Chadhava"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">
                      Performing Sewa for
                    </div>
                    <h2 className="font-black text-xs text-slate-900 leading-tight pr-8">{basePuja?.title}</h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-bold text-slate-800">Frequently added together</span>
                  <div className="h-[1px] bg-slate-100 flex-1" />
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto px-1 pb-4 custom-scrollbar-hide">
                  {freqItems.map(
                    (item: {
                      id: string;
                      name: string;
                      price: number;
                      image: string;
                    }) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md"
                      >
                        <img loading="lazy"
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover shadow-sm bg-slate-50"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-slate-800 text-sm">
                            {item.name}
                          </div>
                          <div className="text-xs font-medium text-slate-500 mt-1">
                            <span className="notranslate">{money(item.price)}</span>
                          </div>
                        </div>
                        {localSelected[item.id] && localSelected[item.id] > 0 ? (
                          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-2 py-1 border border-slate-100">
                            <button
                              onClick={() => updateAccessory(item.id, -1)}
                              className="w-8 h-8 flex items-center justify-center bg-white text-slate-600 rounded-lg shadow-sm font-bold hover:text-red-500 active:scale-90 transition-all border border-slate-100"
                            >
                              -
                            </button>
                            <span className="font-bold text-slate-900 min-w-[20px] text-center notranslate">
                              {localSelected[item.id]}
                            </span>
                            <button
                              onClick={() => updateAccessory(item.id, 1)}
                              className="w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded-lg shadow-orange-200 shadow-sm font-bold hover:bg-orange-600 active:scale-90 transition-all"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => updateAccessory(item.id, 1)}
                            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
                          >
                            Add +
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>

                <div className="mt-auto border-t border-slate-100 py-2">
                  <button
                    onClick={() => {
                      setFreqModalVisible(false);
                      handlePay();
                    }}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/30 text-lg hover:shadow-orange-500/50 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Pay</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-black notranslate">{money(discountedTotalPrice)}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default NewChadhavaPaymentPage;
