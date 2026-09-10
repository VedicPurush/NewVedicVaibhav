"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import PlaceIcon from '@mui/icons-material/Place';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { notification } from 'antd';
import { getVvUtm } from "@/lib/utm";
import VerticalPaymentLoader from "./PaymentLoader";
import { gtag } from "@/lib/gtag";
import { api } from "@/lib/api";
import { orderRequestFields, useMoney, shipsPrasad, toInr, sanitizePhone, isValidPhone } from "@/lib/currency";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";
import { useNewChadhavaDetailQuery } from "@/hooks/queries/useNewChadhavaDetailQuery";

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

// --- Modern Inline Error Component ---
const InlineError = ({ message }: { message?: string }) => (
  <AnimatePresence mode="wait">
    {message && (
      <motion.div
        initial={{ opacity: 0, y: -5, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -5, height: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-1.5 mt-1 overflow-hidden"
      >
        <span className="text-[10px] text-red-500 bg-red-100 rounded-full w-4 h-4 flex items-center justify-center font-bold shrink-0">!</span>
        <span className="text-[11px] font-medium text-red-500 font-serif tracking-wide">{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);


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

interface Coupon {
  code: string;
  visible: boolean;
  expires: string;
  minCartValue: number;
  discount: number;
}

const coupons: Coupon[] = [
  { code: 'Vedic100', visible: true, expires: '2025-12-31', minCartValue: 449, discount: 30 },
  { code: 'WELCOME10', visible: true, expires: '2025-12-31', minCartValue: 499, discount: 50 },
  { code: 'Vedic@1000', visible: true, expires: '2025-12-31', minCartValue: 1251, discount: 110 },
  { code: 'Vedic@2000', visible: true, expires: '2025-12-31', minCartValue: 2101, discount: 251 },
  { code: 'Jatin@100', visible: false, expires: '2025-12-31', minCartValue: 0, discount: 999999 },
  { code: 'THANKYOU6', visible: false, expires: '2025-12-31', minCartValue: 251, discount: 50 },
];

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr + (dateStr.includes('T') ? "" : "T00:00:00"));
  return date.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
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

const ModernInput = ({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  error,
  touched,
  icon,
  maxLength,
  pattern,
  inputMode,
  disabled
}: any) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      variants={itemVariants}
      className="mb-2 relative"
    >
      <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1 ml-1">
        {label}
      </label>
      <motion.div
        className={`relative flex items-center bg-white rounded-xl overflow-hidden border-2 transition-colors ${error && touched
          ? "border-red-300 shadow-[0_0_0_4px_rgba(254,202,202,0.3)]"
          : isFocused
            ? "border-orange-400 shadow-[0_0_0_4px_rgba(251,146,60,0.15)]"
            : "border-slate-100 shadow-sm"
          }`}
        animate={isFocused ? { scale: 1.01 } : { scale: 1 }}
      >
        {icon && (
          <div className="pl-3 text-slate-400">
            {icon}
          </div>
        )}
        <input
          value={value}
          onChange={onChange}
          onBlur={(e) => { setIsFocused(false); onBlur && onBlur(e); }}
          onFocus={() => setIsFocused(true)}
          className="w-full py-3 px-3 text-slate-800 font-medium placeholder:text-slate-400 outline-none bg-transparent"
          placeholder={placeholder}
          type={type}
          maxLength={maxLength}
          pattern={pattern}
          inputMode={inputMode}
          disabled={disabled}
        />
        {error && touched && (
          <div className="pr-3 text-red-500 animate-pulse">
            !
          </div>
        )}
      </motion.div>
      <InlineError message={touched ? error : ""} />
    </motion.div>
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
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponModalVisible, setCouponModalVisible] = useState(false);

  // First-time payment page popup state
  const [showFirstTimePayPopup, setShowFirstTimePayPopup] = useState(false);
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

  const finalTotalPrice =
    combosTotal +
    accessoriesPrice +
    (needPrasad && prasad ? prasad.price : 0) +
    family.length * 50 +
    upsellTotal;

  // Discounted total after coupon (for checkout)
  const discountedTotalPrice = appliedCoupon
    ? appliedCoupon.code.toUpperCase() === "JATIN@100" || appliedCoupon.discount === 999999
      ? 1
      : Math.max(finalTotalPrice - appliedCoupon.discount, 1)
    : finalTotalPrice;

  // Show address only when something physical needs to be shipped
  const hasSelectedGift = giftSelected && Object.values(giftSelected).some(Boolean);
  const needAddress = needPrasad || hasSelectedGift;

  const applyCouponByCode = (code: string) => {
    const found = coupons.find(
      (c) => c.code.toUpperCase() === code.toUpperCase()
    );

    if (found && finalTotalPrice >= found.minCartValue) {
      setAppliedCoupon(found);
      setCouponError("");
      setCouponCode(found.code);
      notification.success({
        message: "Coupon Applied",
        description: `Congratulations! You saved ${money(found.discount)}!`,
        placement: "topRight",
      });
      return true;
    }

    setCouponError("Invalid or inapplicable coupon code");
    notification.error({
      message: "Coupon not applicable",
      description: found
        ? `Add ${money(Math.max(
          found.minCartValue - finalTotalPrice,
          0
        ))} more to use ${found.code}.`
        : "Invalid coupon code.",
      placement: "topRight",
    });
    return false;
  };

  const applicableCoupons = coupons.filter(
    (c) => c.visible && finalTotalPrice >= c.minCartValue
  );
  const recommendedCoupon =
    applicableCoupons.length > 0
      ? applicableCoupons.reduce(
        (best, c) => (c.discount > best.discount ? c : best),
        applicableCoupons[0]
      )
      : null;


  // Automatically remove coupon if total falls below minimum required
  useEffect(() => {
    if (appliedCoupon && finalTotalPrice < appliedCoupon.minCartValue) {
      notification.warning({
        message: "Coupon Removed",
        description: `Coupon ${appliedCoupon.code} has been removed as the total dropped below ${money(appliedCoupon.minCartValue)}.`,
        placement: "topRight",
      });
      setAppliedCoupon(null);
    }
  }, [finalTotalPrice, appliedCoupon]);

  const addFamilyMember = () => setFamily((f) => [...f, ""]);
  const removeFamilyMember = (idx: number) =>
    setFamily((f) => f.filter((_, i) => i !== idx));
  const updateFamilyMember = (idx: number, value: string) =>
    setFamily((f) => f.map((v, i) => (i === idx ? value : v)));


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

  useEffect(() => {
    try {
      const key = "vv_first_time_payment_popup_shown";
      const already = localStorage.getItem(key);
      if (!already) {
        setShowFirstTimePayPopup(true);
        localStorage.setItem(key, "1");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

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

        // Update Family Members
        if (data.user.familyMembers && Array.isArray(data.user.familyMembers) && data.user.familyMembers.length > 0) {
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
    family.forEach((m, i) => {
      if (!m.trim()) {
        newErrors[`family_${i}`] = "Name required";
        if (!firstErrorField) firstErrorField = `family_${i}`;
      }
    });

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

    setErrors(newErrors);
    setTouched({
      whatsapp: true, name: true, address1: true, postal: true, city: true, state: true, gotra: true,
      ...family.reduce((acc, _, i) => ({ ...acc, [`family_${i}`]: true }), {})
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
      family,
      gotra: dontKnowGotra
        ? "Kashyap"
        : gotra?.trim()
          ? gotra.trim()
          : "Kashyap",
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
        familyMembers: family,
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

      notification.error({
        message: "Payment Initiation Failed",
        description: "Unable to start payment. Please check your connection and try again.",
        placement: "top",
      });
    }
  };

  if (!basePuja) return null;

  return (
    <div className="bg-[#FFF8F0] min-h-screen pb-32 font-sans selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{ backgroundImage: "radial-gradient(circle at 50% 0%, #ffedd5 0%, transparent 60%), radial-gradient(circle at 0% 100%, #ffe4e6 0%, transparent 50%)" }}
      />

      <AnimatePresence>
        {showFirstTimePayPopup && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFirstTimePayPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              transition={{ type: "spring", damping: 22, stiffness: 320 }}
              className="bg-white w-[92vw] max-w-md rounded-2xl shadow-2xl border border-orange-200 p-5 font-serif relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 text-xl text-slate-500 hover:text-slate-700"
                onClick={() => setShowFirstTimePayPopup(false)}
                aria-label="Close"
              >
                ×
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200">
                  🎁
                </span>
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Welcome offer for new users
                  </div>
                  <div className="text-xs text-slate-600">
                    Save instantly on your first payment
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-600">Use code</div>
                    <div className="text-lg font-extrabold tracking-wider text-[#B91C1C]">
                      WELCOME10
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-600">Discount</div>
                    <div className="text-base font-extrabold text-emerald-700">
                      {money(50)} OFF
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Applicable on orders of {money(499)} and above.
                </div>
              </div>

              <div className="mt-4">
                <button
                  className="w-full py-3 rounded-xl bg-[#B91C1C] hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200 active:scale-[0.98] transition-all"
                  onClick={() => {
                    // 1. Copy
                    try {
                      navigator.clipboard?.writeText("WELCOME10");
                    } catch { }

                    // 2. Apply
                    applyCouponByCode("WELCOME10");

                    // 3. Close (Unconditionally)
                    setShowFirstTimePayPopup(false);
                  }}
                >
                  Copy & Apply Coupon
                </button>
              </div>

              <div className="mt-3 text-[11px] text-slate-500">
                *Offer is shown once per device/browser.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <motion.div
        className="max-w-2xl mx-auto py-4 px-4 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.button
          variants={itemVariants}
          className="mb-2 flex items-center gap-1 text-slate-500 hover:text-orange-600 transition-colors font-medium text-sm group"
          onClick={() => router.back()}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span> Back
        </motion.button>

        <motion.h1 variants={itemVariants} className="text-2xl font-black mb-4 text-slate-900 tracking-tight">
          Complete your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">Seva</span>
        </motion.h1>

        {/* Modern Glassmorphic Summary Card */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-300 p-4 mb-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-2">
              <motion.div
                className="w-24 h-16 shrink-0 rounded-2xl shadow-lg border-2 border-white overflow-hidden relative"
                whileHover={{ scale: 1.05, rotate: 2 }}
              >
                <img loading="lazy"
                  src={basePuja?.image || "https://via.placeholder.com/96?text=Chadhava"}
                  alt={basePuja?.title || "Chadhava"}
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 leading-tight mb-1">
                  {basePuja?.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                  <PlaceIcon fontSize="small" className="text-orange-500" />
                  <span>{basePuja?.temple}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CalendarMonthIcon fontSize="small" className="text-orange-500" />
                  <span>{formatDisplayDate(basePuja?.date)}</span>
                </div>
              </div>
            </div>

            <div className="mb-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-3">
                Your Selections
              </h3>
              <ul className="space-y-2 text-sm">
                {/* Combos first */}
                {Object.entries(selectedCombos).map(([id, qty]) => {
                  const combo = comboPlans.find((c: any) => c.id === id);
                  if (!combo) return null;
                  return (
                    <li key={combo.id} className="flex justify-between items-center text-slate-700">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold notranslate">{String(qty)}</span>
                        <span className="font-medium">{combo.title}</span>
                      </span>
                      <span className="font-semibold text-slate-900 notranslate">{money(combo.price * Number(qty))}</span>
                    </li>
                  );
                })}
                {/* Then individual accessories */}
                {Object.entries(localSelected).map(([id, qty]) => {
                  const acc = accessoriesList.find(
                    (a: { id: string; name: string; price: number }) => a.id === id
                  );
                  return acc ? (
                    <li key={id} className="flex justify-between items-center text-slate-700">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold notranslate">{String(qty)}</span>
                        <span className="font-medium">{acc.name}</span>
                      </span>
                      <span className="font-semibold text-slate-900 notranslate">{money(acc.price * Number(qty))}</span>
                    </li>
                  ) : null;
                })}
                {/* Free Gifts */}
                {giftSelected && giftList && Object.entries(giftSelected).map(([id, isSelected]) => {
                  if (!isSelected) return null;
                  const gift = giftList.find((g: any) => g.id === id);
                  if (!gift) return null;
                  return (
                    <li key={id} className="flex justify-between items-center text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/50">
                      <span className="flex items-center gap-2 font-medium">
                        🎁 {gift.title.replace(/^FREE\s*/i, "")}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Free</span>
                    </li>
                  );
                })}
                {needPrasad && prasad && (
                  <li className="flex justify-between items-center text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold">1</span>
                      <span className="font-medium">{prasad.name}</span>
                    </span>
                    <span className="font-semibold text-slate-900 notranslate">{money(prasad.price)}</span>
                  </li>
                )}
                {family.length > 0 && (
                  <li className="flex justify-between items-center text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold">{family.length}</span>
                      <span className="font-medium">Additional Members</span>
                    </span>
                    <span className="font-semibold text-slate-900">{money(family.length * 50)}</span>
                  </li>
                )}
                {/* Upsell products in summary */}
                {upsellProducts.filter((p) => addedUpsells[p.productName]).map((p) => (
                  <li key={p.productName} className="flex justify-between items-center text-orange-700 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100/50">
                    <span className="flex items-center gap-2 font-medium">
                      🛍️ {p.productName}
                    </span>
                    <span className="font-semibold notranslate">{money(p.discountedPrice ?? p.price)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100 border-dashed">
              <span className="text-sm font-bold text-black uppercase tracking-wider">
                Total Amount
              </span>
              <motion.span
                className="text-3xl font-black text-slate-900"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                key={discountedTotalPrice} // Re-animate on change
              >
                {money(discountedTotalPrice)}
              </motion.span>
            </div>
          </div>
        </motion.div>

        {/* Input Section */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div id="whatsapp">
            <ModernInput
              label="WhatsApp Number"
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
              icon={
                <span className="text-sm font-bold text-slate-700 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200 whitespace-nowrap select-none">
                  {country.flag} +{country.dial}
                </span>
              }
            />
          </div>

          <div id="name">
            <ModernInput
              label="Devotee Name"
              value={name}
              onChange={(e: any) => {
                const val = sanitizeName(e.target.value).slice(0, 25);
                setName(val);
                if (touched.name) validateField("name", val);
              }}
              onBlur={() => handleBlur("name", name)}
              placeholder="Full Name for Sankalp"
              maxLength={30}
              error={errors.name}
              touched={touched.name}
            />
          </div>

          {/* Family Members Section */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-300 p-3 shadow-sm mb-2">
            <div className="mb-2">
              <label className="text-sm font-bold text-black block mb-1">
                Add Family Members <span className="text-slate-400 font-normal">(@ {money(50)} each)</span>
              </label>
              <p className="text-[10px] text-orange-800 font-medium leading-relaxed mb-2 opacity-80">
                Add family members to include them in the Sankalp. A small contribution is added per person.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-xs font-bold bg-orange-100/50 text-orange-700 px-3 py-2 rounded-xl border border-orange-100 shadow-sm hover:bg-orange-100 transition-all flex items-center justify-center gap-1"
                onClick={addFamilyMember}
              >
                <span>+</span> Add Member
              </motion.button>
            </div>

            <AnimatePresence initial={false}>
              {family.map((member, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 relative overflow-hidden"
                  id={`family_${idx}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        value={member}
                        onChange={(e) => updateFamilyMember(idx, e.target.value)}
                        className={`w-full py-2 pl-3 pr-3 bg-white rounded-xl border transition-all outline-none text-sm font-medium ${errors[`family_${idx}`] && touched[`family_${idx}`]
                          ? "border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-50"
                          : "border-slate-100 focus:border-orange-300 focus:ring-2 focus:ring-orange-50"
                          }`}
                        placeholder={`Member ${idx + 1} Name...`}
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 transition-colors shadow-sm border border-red-100"
                      onClick={() => removeFamilyMember(idx)}
                    >
                      ×
                    </motion.button>
                  </div>
                  <div className="px-1">
                    <InlineError message={touched[`family_${idx}`] ? errors[`family_${idx}`] : ""} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Gotra Section */}
          <motion.div variants={itemVariants} className="mb-4" id="gotra">
            <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5 ml-1">
              Gotra
            </label>
            <div className={`relative bg-white rounded-xl border-2 overflow-hidden transition-all shadow-sm ${errors.gotra && touched.gotra && !dontKnowGotra ? "border-red-200 shadow-[0_0_0_4px_rgba(254,202,202,0.3)]" : "border-slate-100 focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-50"
              }`}>
              <div className="flex items-center">
                <span className="pl-3 text-xl opacity-50 select-none">🕉</span>
                <input
                  value={gotra}
                  onChange={(e: any) => {
                    setGotra(e.target.value);
                    if (touched.gotra) validateField("gotra", e.target.value);
                  }}
                  onBlur={() => handleBlur("gotra", gotra)}
                  disabled={dontKnowGotra}
                  className="w-full py-3 px-3 outline-none bg-transparent placeholder:text-slate-400 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  placeholder={dontKnowGotra ? "Default (Kashyap)" : "Enter Gotra"}
                />
              </div>
              <div className="border-t border-slate-50 bg-slate-50/80 px-4 py-2.5 flex items-center hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => {
                const newState = !dontKnowGotra;
                setDontKnowGotra(newState);
                if (newState) setErrors(prev => ({ ...prev, gotra: "" }));
              }}>
                <div className="relative flex items-center">
                  <div className={`w-5 h-5 rounded border-2 mr-2 flex items-center justify-center transition-all ${dontKnowGotra ? "bg-orange-500 border-orange-500" : "border-slate-300"}`}>
                    {dontKnowGotra && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs font-semibold select-none transition-colors ${dontKnowGotra ? "text-orange-700" : "text-slate-600"}`}>
                    I don&apos;t know my Gotra
                  </span>
                </div>
              </div>
            </div>
            <InlineError message={!dontKnowGotra && touched.gotra ? errors.gotra : ""} />
          </motion.div>

          {/* Address Section — only when prasad or gift is claimed */}
          {needAddress && (
            <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-300 p-3 shadow-sm mt-2" id="address">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-sm">📦</span>
                <span className="text-xs font-bold text-black uppercase tracking-wider">Delivery Address</span>
              </div>
              <div id="address1">
                <ModernInput
                  label="Street Address / House No."
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

              <div className="grid grid-cols-2 gap-4">
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
            </motion.div>
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

        <motion.div variants={itemVariants} className="mt-4 mb-32">
          <div
            className="group relative overflow-hidden rounded-2xl bg-white p-1 shadow-lg border border-slate-100 transition-all hover:shadow-orange-200/50 cursor-pointer"
            onClick={() => setCouponModalVisible(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-50 via-white to-orange-50 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between p-4 rounded-xl border border-dashed border-orange-200 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform duration-300">
                  <LocalOfferIcon />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-base group-hover:text-orange-700 transition-colors">
                    Have a Coupon Code?
                  </span>
                  <span className="text-xs text-slate-500 font-medium group-hover:text-slate-700 transition-colors">
                    {appliedCoupon ? (
                      <span key={appliedCoupon.code} className="inline-flex items-center">
                        ✓ <span translate="no" className="mx-1">{appliedCoupon.code}</span> Applied!
                      </span>
                    ) : (
                      "Tap to apply promo codes for discounts"
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <span className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${appliedCoupon ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700 group-hover:bg-orange-500 group-hover:text-white"}`}>
                  {appliedCoupon ? "Change" : "Select"}
                </span>
              </div>
            </div>
          </div>

          {recommendedCoupon && !appliedCoupon && (
            <motion.div
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center justify-center gap-2"
            >
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Recommended</span>
              <div className="text-xs text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                Use <span className="font-bold text-slate-800 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{recommendedCoupon.code}</span> to save <span className="text-emerald-600 font-bold">{money(recommendedCoupon.discount)}</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Styled Footer — hidden during payment verification / after payment */}
      <div ref={checkoutCartRef}>
        {!verifying && <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full sm:w-[calc(100%-32px)] max-w-2xl bg-white/95 backdrop-blur-xl border border-slate-200 px-6 py-4 flex items-center justify-between z-[9999] shadow-[0_12px_40px_rgba(0,0,0,0.1)] rounded-t-3xl">
          <div
            className="flex flex-col cursor-pointer group"
            onClick={() => setShowCartItems(!showCartItems)}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total to Pay</span>
              <span className={`text-slate-400 transition-transform duration-300 ${showCartItems ? "rotate-180" : ""}`}>
                <KeyboardArrowUpIcon fontSize="small" />
              </span>
            </div>
            <motion.div
              key={discountedTotalPrice}
              initial={{ scale: 0.95, color: "#cbd5e1" }}
              animate={{ scale: 1, color: "#0f172a" }}
              className="text-2xl font-black text-slate-900 leading-none"
            >
              <span className="notranslate">{money(discountedTotalPrice)}</span>
            </motion.div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgba(234, 88, 12, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-r from-[#ff5a00] to-[#ff8a00] text-white pl-8 pr-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-[0_12px_24px_rgba(255,90,0,0.35)] flex items-center gap-2 text-lg active:shadow-none transition-all hover:scale-[1.02]"
            onClick={() => {
              setShowCartItems(false);
              // Frequently-added-together modal disabled for now; re-enable by
              // swapping this for setFreqModalVisible(true) if needed later.
              handlePay();
            }}
          >
            <span>Pay Now</span>
            <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-sm">→</span>
          </motion.button>
        </div>}

        {/* Cart Popup */}
        <AnimatePresence>
          {showCartItems && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-[105px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_-20px_60px_rgba(0,0,0,0.08)] overflow-hidden z-[9998] rounded-3xl"
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
        {couponModalVisible && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999]"
            onClick={() => setCouponModalVisible(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl p-4 w-[90%] max-w-md shadow-2xl relative font-sans overflow-hidden"
              initial={{ y: 50, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 50, scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-orange-400 to-red-500 opacity-10 pointer-events-none" />

              <button
                type="button"
                onClick={() => setCouponModalVisible(false)}
                className="absolute top-2 right-2 z-50 p-2 text-slate-400 hover:text-slate-600 hover:bg-black/5 rounded-full transition-all w-10 h-10 flex items-center justify-center active:scale-95"
                aria-label="Close"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>

              <div className="relative mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                    <LocalOfferIcon fontSize="small" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Offers
                  </h2>
                </div>
                <p className="text-slate-500 text-sm ml-13">Best coupons for your sewa</p>
              </div>

              {/* Manual code entry */}
              <div className="relative mb-6">
                <div className="flex flex-wrap items-center bg-slate-50 border border-slate-200 rounded-xl p-1 focus-within:ring-2 focus-within:ring-orange-100 transition-all gap-1">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 min-w-[200px] p-3 bg-transparent outline-none text-slate-800 font-bold placeholder:font-normal placeholder:text-slate-400 tracking-wide uppercase text-sm"
                  />
                  <button
                    onClick={() => {
                      const ok = applyCouponByCode(couponCode);
                      if (ok) setCouponModalVisible(false);
                    }}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-[#ff5a00] to-[#ff8a00] text-white rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[0_8px_16px_rgba(255,90,0,0.2)]"
                  >
                    APPLY
                  </button>
                </div>
                {couponError && (
                  <div className="absolute top-full left-0 mt-2 text-red-500 text-xs font-bold flex items-center gap-1 pl-1">
                    ⚠️ {couponError}
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-[50vh]  p-3 overflow-y-auto  custom-scrollbar-hide">
                {coupons
                  .filter((c) => c.visible)
                  .map((c) => {
                    const disabled = finalTotalPrice < c.minCartValue;
                    const needed = c.minCartValue - finalTotalPrice;
                    const selected =
                      appliedCoupon && appliedCoupon.code === c.code;
                    return (
                      <motion.div
                        key={c.code}
                        whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
                        whileTap={!disabled ? { scale: 0.98 } : {}}
                        className={`relative p-3  rounded-2xl border-2 transition-all cursor-pointer overflow-hidden group ${disabled
                          ? "border-slate-100 bg-slate-50 opacity-60 grayscale"
                          : selected
                            ? "border-emerald-500 bg-emerald-50 shadow-emerald-100 shadow-md"
                            : "border-slate-100 bg-white hover:border-orange-200 hover:shadow-lg hover:shadow-orange-50"
                          }`}
                        onClick={() => {
                          if (!disabled) {
                            setAppliedCoupon(c);
                            setCouponError("");
                            notification.success({
                              message: "Coupon Applied",
                              description: `Congratulations! You saved ${money(c.discount)}!`,
                              placement: "topRight",
                            });
                            setCouponModalVisible(false);
                          }
                        }}
                      >
                        {/* Ticket styling elements */}
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-r border-slate-200" />
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-l border-slate-200" />

                        <div className="flex justify-between items-start mb-2 pl-3">
                          <div>
                            <span translate="no" className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mb-1 ${selected ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                              {c.code}
                            </span>
                            <div className="text-xs text-slate-500 font-medium">
                              Min order {money(c.minCartValue)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-black ${selected ? "text-emerald-600" : "text-slate-800"}`}>
                              Save {money(c.discount)}
                            </div>
                          </div>
                        </div>

                        {disabled && (
                          <div className="mt-2 text-[10px] font-bold text-red-400 bg-red-50 p-1.5 rounded text-center">
                            Add items worth {money(needed)} more to unlock
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
