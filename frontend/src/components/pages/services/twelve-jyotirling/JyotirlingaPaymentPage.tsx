"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { readNavState, saveNavState } from "@/lib/nav-state";

const getMetaHeaders = (): Record<string, string> => {
  const getCookie = (name: string) => {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  };
  const fbp = getCookie('_fbp');
  const cookieFbc = getCookie('_fbc');
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  const fbc = cookieFbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : '');
  const headers: Record<string, string> = { 'x-event-source-url': window.location.href };
  if (fbp) headers['x-fbp'] = fbp;
  if (fbc) headers['x-fbc'] = fbc;
  return headers;
};
import { motion, AnimatePresence } from "framer-motion";
import { notification } from "antd";
import "./JyotirlingaPaymentPage.css";
import Navbar from "@/components/layout/Navbar";
import { getVvUtm } from "@/lib/utm";
import PaymentLoader from "@/components/pages/services/chadhava/PaymentLoader";
import { gtag } from "@/lib/gtag";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";
import { IJyotirlinga } from "./index";
import SecondComponent from "./MobileView/components/SecondComponent";

export interface SubscribablePlan {
  id: string;
  name: string;
  nameHindi: string;
  planId: "Basic" | "Intermediate" | "Advance";
  pricePercentage: number;
  yearlyPercentageDiscount: number;
}

interface FamilyMember {
  name: string;
  gotra: string;
}

// type BillingMode = "upfront" | "autopay";

type JyotirlingaPaymentState = {
  plan: SubscribablePlan;
  selectedJyotirlinga: IJyotirlinga[];
  allJyotirlinga: IJyotirlinga[];
  initialBillingMode?: "upfront" | "autopay";
};

// ─── Constants ───────────────────────────────────────────────────────────────

const JYOTIRLINGA_COUPONS = [
  { code: "VVJatin@100", label: "Special Staff Discount", discount: 0, minPackagePrice: 0, visible: false },
  { code: "JATIN@100", label: "Special Testing Code", discount: 0, minPackagePrice: 0, visible: false },
];

const FAMILY_MEMBER_ADDON_PER_MEMBER = 99;

// Free family members per plan: Basic=2, Intermediate=3, Advance=4
const FREE_FAMILY_COUNT: Record<string, number> = {
  Basic: 2,
  Intermediate: 3,
  Advance: 4,
};
const AUTOPAY_MARKUP_PERCENT = 6;

const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
// const EASEBUZZ_SCRIPT_SRC = "https://ebz-static.s3.ap-south-1.amazonaws.com/easecheckout/easebuzz-checkout.js";

// ─── Helper Components ────────────────────────────────────────────────────────

const InlineError = ({ message }: { message?: string }) => (
  <AnimatePresence mode="wait">
    {message ? (
      <motion.div
        initial={{ opacity: 0, y: -5, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -5, height: 0 }}
        transition={{ duration: 0.2 }}
        className="text-red-400 text-xs mt-1 flex items-center gap-1"
      >
        <span>⚠️</span> {message}
      </motion.div>
    ) : null}
  </AnimatePresence>
);

const ModernInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  maxLength,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  error?: string;
  maxLength?: number;
  /** lets the page scroll/focus this field when it fails validation */
  inputRef?: React.Ref<HTMLInputElement>;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div className="mb-4 relative">
      <label className="block text-xs font-bold uppercase tracking-wider mb-1 ml-1" style={{ color: '#92400e' }}>
        {label}
      </label>
      <div
        className={`relative flex items-center rounded-xl overflow-hidden border-2 transition-colors ${error
          ? "border-red-400"
          : isFocused
            ? "border-orange-400"
            : "border-amber-200"
          }`}
        style={{ background: isFocused ? '#fff8ef' : '#fafafa' }}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full py-3 px-4 outline-none bg-transparent"
          style={{ color: '#1c0a00' }}
          placeholder={placeholder}
          type={type}
          maxLength={maxLength}
        />
      </div>
      <InlineError message={error} />
    </div>
  );
};

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// const loadEasebuzzScript = (): Promise<boolean> => {
//   return new Promise((resolve) => {
//     if ((window as any).EasebuzzCheckout) { resolve(true); return; }
//     const script = document.createElement("script");
//     script.src = EASEBUZZ_SCRIPT_SRC;
//     script.async = true;
//     script.onload = () => resolve(true);
//     script.onerror = () => resolve(false);
//     document.body.appendChild(script);
//   });
// };

// ─── Facebook Pixel Tracking ──────────────────────────────────────────────────
const isFbq = (fn: unknown): fn is (...args: any[]) => void => typeof fn === "function";

const fbqTrack = (event: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  const fbq = (window as any).fbq;
  if (isFbq(fbq)) {
    try { fbq("track", event, params || {}); } catch (e) { console.warn("fbq track failed", e); }
    return;
  }
  const win = window as any;
  win._fbqQueue = win._fbqQueue || [];
  win._fbqQueue.push({ event, params });
  if (!win._fbqInterval) {
    win._fbqInterval = window.setInterval(() => {
      const f = (window as any).fbq;
      if (isFbq(f)) {
        (win._fbqQueue || []).forEach((e: any) => { try { f("track", e.event, e.params || {}); } catch (_) { } });
        win._fbqQueue = [];
        window.clearInterval(win._fbqInterval);
        win._fbqInterval = 0;
      }
    }, 400);
  }
};

const JyotirlingaPaymentContent = () => {
  const router = useRouter();

  // react-router carried this via location.state; in Next it comes from sessionStorage.
  const [state, setState] = useState<JyotirlingaPaymentState | undefined>(undefined);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [localJyotirlinga, setLocalJyotirlinga] = useState<IJyotirlinga[]>([]);

  useEffect(() => {
    const stored = readNavState<JyotirlingaPaymentState>("12-jyotirlinga-payment");
    setState(stored);
    if (stored?.selectedJyotirlinga) setLocalJyotirlinga(stored.selectedJyotirlinga);
    setStateLoaded(true);
  }, []);

  const plan = state?.plan;

  const toggleSelection = (id: string) => {
    setLocalJyotirlinga(prev => {
      if (prev.find(j => j._id === id)) {
        return prev.filter(j => j._id !== id);
      } else {
        const toAdd = state?.allJyotirlinga?.find(j => j._id === id);
        return toAdd ? [...prev, toAdd] : prev;
      }
    });
  };

  const selectAll = () => {
    if (!state?.allJyotirlinga) return;
    if (localJyotirlinga.length === state.allJyotirlinga.length) {
      setLocalJyotirlinga([]);
    } else {
      setLocalJyotirlinga([...state.allJyotirlinga]);
    }
  };

  const [formData, setFormData] = useState({
    whatsapp: "",
    name: "",
    email: "",
    gotra: "",
  });

  const [address, setAddress] = useState({
    line1: "",
    city: "",
    state: "",
    pinCode: "",
  });

  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [dontKnowGotra, setDontKnowGotra] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [addressErrors, setAddressErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pageError, setPageError] = useState("");
  const billingMode = "upfront";

  // Coupon states
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [showCouponPanel, setShowCouponPanel] = useState(false);
  // const [showAllPrasad, setShowAllPrasad] = useState(false);

  const lastFetchedPhoneRef = useRef<string>("");
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prefill from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("userDetails");
      if (stored) {
        const parsed = JSON.parse(stored);
        const user = parsed.user;
        if (user) {
          const fName = user.firstname || user.firstName || user.given_name || "";
          const lName = user.lastname || user.lastName || user.family_name || "";
          const fullName = `${fName} ${lName}`.trim();
          let ph = user.phone || "";
          ph = ph.replace(/\D/g, "");
          if (ph.length === 12 && ph.startsWith("91")) ph = ph.slice(2);
          if (ph.length > 10) ph = ph.slice(-10);
          setFormData((prev) => ({
            ...prev,
            name: fullName || prev.name,
            whatsapp: ph || prev.whatsapp,
            email: user.email || prev.email,
            gotra: user.gotra || prev.gotra,
          }));
          const primaryAddr = Array.isArray(user.addresses) && user.addresses.length > 0 ? (user.addresses.find((a: any) => a.isPrimary) ?? user.addresses[0]) : null;
          setAddress(prev => ({
            ...prev,
            line1: user.address1 || user.address || prev.line1,
            city: primaryAddr?.city || user.city || prev.city,
            state: user.state || prev.state,
            pinCode: primaryAddr?.pincode || user.pincode || prev.pinCode,
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load user details", e);
    }
  }, []);

  // Auto-fetch user by phone
  const fetchUserDetails = async (phone: string) => {
    try {
      const { data } = await api.get(`/get-user-by-phone/${phone}`);
      const user = data?.user || data;
      if (!user) return;
      const rawName = user.name || user.fullName || "";
      const fName = user.firstname || user.firstName || "";
      const lName = user.lastname || user.lastName || "";
      let full = `${fName} ${lName}`.trim();
      if (!full && rawName) full = rawName.trim();
      setFormData((prev) => ({
        ...prev,
        name: full || prev.name,
        gotra: user.gotra || prev.gotra,
        email: user.email || prev.email,
      }));
      setAddress((prev) => ({
        ...prev,
        line1: user.address1 || user.address || prev.line1,
        pinCode: user.pincode || prev.pinCode,
        city: user.city || prev.city,
        state: user.state || prev.state,
      }));
    } catch (e: any) {
      if (e.response?.status === 404) {
        setFormData((prev) => ({ ...prev, name: "", gotra: "", email: "" }));
        setAddress({ line1: "", pinCode: "", city: "", state: "" });
        setFamily([]);
      }
    }
  };

  useEffect(() => {
    if (fetchTimerRef.current) { clearTimeout(fetchTimerRef.current); fetchTimerRef.current = null; }
    const phone = formData.whatsapp.trim();
    if (/^[6-9]\d{9}$/.test(phone) && phone !== lastFetchedPhoneRef.current) {
      lastFetchedPhoneRef.current = phone;
      fetchTimerRef.current = setTimeout(() => fetchUserDetails(phone), 500);
    }
    return () => { if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current); };
  }, [formData.whatsapp]);

  useEffect(() => {
    if (stateLoaded && !plan) router.push("/services/12-jyotirlinga");
  }, [stateLoaded, plan, router]);

  useEffect(() => {
    if (!plan) return;
    fbqTrack("ViewContent", {
      content_ids: [plan.id || "12-jyotirlinga"],
      content_name: `12 Jyotirlinga Sub - ${plan.name}`,
      content_category: "12 Jyotirlinga Subscription",
      content_type: "product",
      num_items: localJyotirlinga.length,
      currency: "INR",
    });
    gtag("event", "view_item", {
      currency: "INR",
      items: [{
        item_id: plan.id || "12-jyotirlinga",
        item_name: `12 Jyotirlinga Sub - ${plan.name}`,
        item_category: "12 Jyotirlinga Subscription",
        quantity: localJyotirlinga.length,
      }],
    });
  }, [plan, localJyotirlinga]);

  /* Keyed by exactly the names validateForm reports, so the first invalid key
     resolves straight to the input that needs attention. */
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const setFieldRef = (key: string) => (el: HTMLInputElement | null) => {
    fieldRefs.current[key] = el;
  };

  /* A failed submit used to run window.scrollTo({ top: 0 }), which parked the
     devotee at the top of the page looking at the Jyotirlinga picker while the
     actual complaint sat under a field further down, off screen. Put the
     offending field itself on screen instead. */
  const revealInvalidField = (key: string) => {
    const el = fieldRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // focusing straight away cancels the smooth scroll on iOS Safari
    window.setTimeout(() => el.focus({ preventScroll: true }), 450);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setAddress((prev) => ({ ...prev, [field]: e.target.value }));
    if (addressErrors[field]) setAddressErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Family error keys are index-based (family-{i}-name/gotra); any add/remove
  // shifts indices, so the safest move is to drop all of them rather than let
  // a stale error land on the wrong row. The next submit re-validates fresh.
  const clearFamilyErrors = () =>
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (k.startsWith("family-")) delete next[k]; });
      return next;
    });

  const addFamilyMember = () => { setFamily((prev) => [...prev, { name: "", gotra: "" }]); clearFamilyErrors(); };
  const updateFamilyMember = (i: number, field: keyof FamilyMember, v: string) => {
    setFamily((prev) => { const arr = [...prev]; arr[i] = { ...arr[i], [field]: v }; return arr; });
    const key = `family-${i}-${field}`;
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };
  const removeFamilyMember = (i: number) => { setFamily((prev) => prev.filter((_, idx) => idx !== i)); clearFamilyErrors(); };

  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    const addErrs: { [key: string]: string } = {};
    if (!formData.whatsapp || !/^[6-9]\d{9}$/.test(formData.whatsapp.trim()))
      errs.whatsapp = "Valid 10-digit mobile number required";
    if (!formData.name || formData.name.trim().length < 3) errs.name = "Full name required";
    if (!dontKnowGotra && (!formData.gotra || !formData.gotra.trim())) errs.gotra = "Gotra is required";

    /* A member is optional until either field is touched — but once one side has
       a value, the backend rejects the booking unless both do (see
       subscription.controller.ts). Catching that here, keyed by index the same
       way the top fields are, lets revealInvalidField land on the exact row
       instead of the devotee bouncing off a banner above the temple picker. */
    family.forEach((m, i) => {
      const hasAnyValue = m.name.trim() || m.gotra.trim();
      if (!hasAnyValue) return;
      if (!m.name.trim()) errs[`family-${i}-name`] = `Family Member ${i + 1}: name is required.`;
      if (!m.gotra.trim()) errs[`family-${i}-gotra`] = `Family Member ${i + 1}: gotra is required.`;
    });

    if (!address.line1 || address.line1.trim().length < 10)
      addErrs.line1 = "Complete address required for Prasad delivery";
    if (!address.pinCode || !/^\d{6}$/.test(address.pinCode.trim())) addErrs.pinCode = "Valid 6-digit Pincode required";
    if (!address.city || !address.city.trim()) addErrs.city = "City is required";
    if (!address.state || !address.state.trim()) addErrs.state = "State is required";

    setErrors(errs);
    setAddressErrors(addErrs);

    /* Returns the invalid field names rather than a bare boolean, in the order
       they appear on the page — devotee details first, delivery address below
       it — so the caller can land on the topmost one. */
    return [...Object.keys(errs), ...Object.keys(addErrs)];
  };

  // Pricing
  const safePlan = plan ?? {
    id: "",
    name: "",
    nameHindi: "",
    planId: "Basic" as const,
    pricePercentage: 0,
    yearlyPercentageDiscount: 0,
  };

  const selectedCount = localJyotirlinga.length;
  const freeFamilyCount = FREE_FAMILY_COUNT[safePlan.planId] ?? 0;
  const canUseAutopay = selectedCount > 1;

  const basePricing = useMemo(() => {
    const totalBaseJyotirlingaPrice = localJyotirlinga.reduce((sum, item) => sum + (item.price || 0), 0);
    const planAdjustedBase = Math.round((totalBaseJyotirlingaPrice * safePlan.pricePercentage) / 100);

    const paidFilledFamilyCount = family.filter((m, i) => i >= freeFamilyCount && (m.name.trim() || m.gotra.trim())).length;
    const familyAddOnTotal = paidFilledFamilyCount * FAMILY_MEMBER_ADDON_PER_MEMBER;

    const autopayBaseJourney = planAdjustedBase + familyAddOnTotal;
    const autopayJourneyWithMarkup = canUseAutopay ? Math.round((autopayBaseJourney * (100 + AUTOPAY_MARKUP_PERCENT)) / 100) : 0;
    const autopayMonthlyAmount = canUseAutopay ? Math.ceil(autopayJourneyWithMarkup / selectedCount) : 0;

    const upfrontDiscountPercent = selectedCount > 1 ? safePlan.yearlyPercentageDiscount : 0;
    const upfrontDiscountAmount = Math.round((planAdjustedBase * upfrontDiscountPercent) / 100);
    const upfrontTotalOriginal = Math.max(planAdjustedBase - upfrontDiscountAmount + familyAddOnTotal, 0);

    return {
      planAdjustedBase,
      familyAddOnTotal,
      upfrontDiscountPercent,
      upfrontDiscountAmount,
      upfrontTotalOriginal,
      autopayMonthlyAmount,
      paidFilledFamilyCount
    };
  }, [localJyotirlinga, safePlan, family, canUseAutopay, freeFamilyCount, selectedCount]);

  const pricing = useMemo(() => {
    const base = basePricing;
    const upfrontTotal = billingMode === "upfront" && appliedCoupon ? 1 : base.upfrontTotalOriginal;
    return { ...base, upfrontTotal };
  }, [basePricing, billingMode, appliedCoupon]);

  const finalAmount = pricing.upfrontTotal;

  const visibleCoupons = JYOTIRLINGA_COUPONS.filter((c) => c.visible && finalAmount >= c.minPackagePrice);

  const applyCoupon = (code: string) => {
    const found = JYOTIRLINGA_COUPONS.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!found) {
      setCouponError("Invalid coupon code.");
      notification.error({ message: "Invalid coupon", description: "This coupon code does not exist.", placement: "topRight" });
      return;
    }
    if (finalAmount < found.minPackagePrice) {
      setCouponError(`This coupon is valid for packages ₹${found.minPackagePrice}+.`);
      notification.error({ message: "Coupon not applicable", description: `Requires package price of ₹${found.minPackagePrice}+.`, placement: "topRight" });
      return;
    }
    setAppliedCoupon(found);
    setCouponError("");
    setCouponInput(found.code);
    setShowCouponPanel(false);
    notification.success({ message: "Coupon Applied! 🎉", description: `Discount applied successfully.`, placement: "topRight" });
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponInput(""); setCouponError(""); };

/**
 * EASEBUZZ — DISABLED. Razorpay is the only gateway for this flow.
 *
 * This path is already unreachable: the frontend sends `gateway: "razorpay"` on
 * initiate-payment, and the backend hardcodes `gateway: "razorpay"` in the
 * response (subscription.controller.ts), so `data.gateway === "easebuzz"` can
 * never be true. Easebuzz was removed from the backend entirely; only the
 * `provider: "razorpay" | "easebuzz"` field on subscription.model.ts remains,
 * kept so historical records stay readable.
 *
 * Left commented rather than deleted so the integration is recoverable if a
 * second gateway is ever needed.
 */
//   const openEasebuzzCheckout = async (data: any) => {
//     const loaded = await loadEasebuzzScript();
//
//     if (!loaded || !(window as any).EasebuzzCheckout) {
//       setPageError("Easebuzz Checkout could not be loaded. Please disable ad-blocker or retry.");
//       setSubmitting(false);
//       return;
//     }
//
//     const easebuzzCheckout = new (window as any).EasebuzzCheckout(data.key, data.env);
//     const options = {
//       access_key: data.access_key,
//       onResponse: async (response: any) => {
//         if (response.status === "success") {
//           setVerifying(true);
//           try {
//             await api.post("/jyotirlinga-subscription/verify-payment", {
//               ...response,
//               orderID: data.orderID,
//               gateway: "easebuzz",
//             }, { headers: getMetaHeaders() });
//             // GA4 Purchase is NOT sent here — JyotirlingaPaymentSuccess sends it
//             // on the success page both gateway paths redirect to, so firing here
//             // double-counted every subscription.
//             localStorage.setItem("last_jyotirlinga_booking", data.orderID);
//             window.dispatchEvent(new CustomEvent("bookings-updated"));
//             saveNavState("12-jyotirlinga-success", {
//               bookingId: data.orderID,
//               planName: safePlan.name,
//               amount: finalAmount,
//               selectedCount: localJyotirlinga.length,
//               paymentMode: billingMode,
//             });
//             router.replace("/services/12-jyotirlinga/success");
//           } catch (error: any) {
//             fbqTrack("PaymentInfoFailed", { content_ids: [safePlan.id || "12-jyotirlinga"], value: finalAmount, currency: "INR" });
//             gtag("event", "payment_failed", { currency: "INR", value: finalAmount, items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga Sub - ${safePlan.name}` }] });
//             notification.error({
//               message: "Booking confirmation failed",
//               description: error?.response?.data?.message || "Payment was received but booking confirmation failed. Please contact support with your payment reference.",
//               duration: 8,
//             });
//           } finally {
//             setVerifying(false);
//             setSubmitting(false);
//           }
//         } else {
//           setSubmitting(false);
//           fbqTrack("PaymentInfoFailed", { content_ids: [safePlan.id || "12-jyotirlinga"], value: finalAmount, currency: "INR" });
//           gtag("event", "payment_failed", { currency: "INR", value: finalAmount, items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga Sub - ${safePlan.name}` }] });
//           notification.error({ message: "Payment failed or cancelled.", description: "Please try again or use a different payment method." });
//         }
//       },
//     };
//     easebuzzCheckout.initiatePayment(options);
//   };

  const openRazorpayCheckout = async (orderID: string, rzpOptions: any) => {
    const loaded = await loadRazorpayScript();

    if (!loaded || !(window as any).Razorpay) {
      setPageError("Razorpay Checkout could not be loaded. Please disable ad-blocker or retry.");
      setSubmitting(false);
      return;
    }

    const rzp = new (window as any).Razorpay({
      ...rzpOptions,
      handler: async function (response: any) {
        setVerifying(true);
        try {
          // Payment is already captured here — retry through the webhook race
          // rather than reporting a confirmation hiccup as a failed payment.
          const outcome = await verifyPaymentWithRetry({
            attempt: async () =>
              (
                await api.post("/jyotirlinga-subscription/verify-payment", {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  orderID,
                  paymentMode: billingMode,
                  gateway: "razorpay",
                }, { headers: getMetaHeaders() })
              ).data,
          });
          if (outcome.status === "declined") throw new Error(outcome.message);
          // GA4 Purchase is NOT sent here either — see the note on the other
          // gateway path above; the success page is the single source.
          localStorage.setItem("last_jyotirlinga_booking", orderID);
          window.dispatchEvent(new CustomEvent("bookings-updated"));
          saveNavState("12-jyotirlinga-success", {
            bookingId: orderID,
            planName: safePlan.name,
            amount: finalAmount,
            selectedCount: localJyotirlinga.length,
            paymentMode: billingMode,
          });
          router.replace("/services/12-jyotirlinga/success");
        } catch (verifyError: any) {
          fbqTrack("PaymentInfoFailed", { content_ids: [safePlan.id || "12-jyotirlinga"], value: finalAmount, currency: "INR" });
          gtag("event", "payment_failed", { currency: "INR", value: finalAmount, items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga Sub - ${safePlan.name}` }] });
          notification.error({
            message: "Booking confirmation failed",
            description: verifyError?.response?.data?.message || "Payment was received but booking confirmation failed. Please contact support with your payment reference.",
            duration: 8,
          });
        } finally {
          setVerifying(false);
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: () => setSubmitting(false),
        confirm_close: true,
      },
    });

    rzp.on("payment.failed", (response: any) => {
      setSubmitting(false);
      const reason = response?.error?.description || response?.error?.reason || "Payment failed.";
      fbqTrack("PaymentInfoFailed", { content_ids: [safePlan.id || "12-jyotirlinga"], value: finalAmount, currency: "INR" });
      gtag("event", "payment_failed", { currency: "INR", value: finalAmount, items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga Sub - ${safePlan.name}` }] });
      notification.error({ message: "Payment Failed", description: reason, duration: 6 });
    });

    rzp.open();
  };

  const handlePayment = async () => {
    if (!plan) return;
    const invalidFields = validateForm();
    if (invalidFields.length > 0) { revealInvalidField(invalidFields[0]); return; }

    try {
      setSubmitting(true);
      setPageError("");

      const purePhone = formData.whatsapp.replace(/\D/g, "").slice(-10);
      const effectiveEmail = formData.email.trim() || `${purePhone}@gmail.com`;

      const filledFamilyMembers = family
        .map((m) => ({ name: m.name.trim(), gotra: m.gotra.trim() }))
        .filter((m) => m.name || m.gotra);

      const payload = {
        name: formData.name.trim(),
        mobile: purePhone,
        email: effectiveEmail,
        gotra: dontKnowGotra ? "Sadharana" : formData.gotra.trim(),
        planId: plan.planId,
        paymentMode: billingMode,
        jyotirlingaIds: localJyotirlinga.map((j) => j._id),
        familyMembers: filledFamilyMembers,
        ...(appliedCoupon ? { discountedAmount: finalAmount } : {}),
        deliveryAddress: {
          name: formData.name.trim() || "Devotee",
          mobile: purePhone,
          line1: address.line1.trim(),
          line2: "",
          city: address.city.trim(),
          state: address.state.trim(),
          pinCode: address.pinCode.trim(),
        },
        vv_utm: getVvUtm(),
      };

      // InitiateCheckout
      fbqTrack("InitiateCheckout", {
        content_ids: [plan.id || "12-jyotirlinga"],
        content_name: `12 Jyotirlinga Sub - ${plan.name}`,
        content_category: "12 Jyotirlinga Subscription",
        content_type: "product",
        value: finalAmount,
        currency: "INR",
        num_items: localJyotirlinga.length,
      });
      gtag("event", "begin_checkout", {
        currency: "INR",
        value: finalAmount,
        items: [{
          item_id: plan.id || "12-jyotirlinga",
          item_name: `12 Jyotirlinga Sub - ${plan.name}`,
          item_category: "12 Jyotirlinga Subscription",
          price: finalAmount,
          quantity: localJyotirlinga.length,
        }],
      });

      const { data } = await api.post("/jyotirlinga-subscription/initiate-payment", {
        ...payload,
        gateway: "razorpay"
      });

      // Background user registering
      api.post("/phone-login-or-register", {
        phone: purePhone,
        email: effectiveEmail,
        name: formData.name.trim(),
        gotra: dontKnowGotra ? "Sadharana" : formData.gotra.trim(),
        address1: address.line1.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        pincode: address.pinCode.trim(),
        country: "India",
      }).then((userRes) => {
        if (userRes.data?.user) {
          localStorage.setItem("userDetails", JSON.stringify({ user: userRes.data.user, token: userRes.data.token }));
        }
      }).catch(() => { });

//       if (data.gateway === "easebuzz") {
//         await openEasebuzzCheckout(data);
//         return;
//       }

      await openRazorpayCheckout(data.orderID, {
        key: data.key,
        name: "Vedic Vaibhav",
        description: `${plan.name} — 12 Jyotirlinga Seva`,
        prefill: {
          name: formData.name.trim(),
          contact: formData.whatsapp.trim(),
          email: effectiveEmail,
        },
        readonly: { contact: true, email: true },
        order_id: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency,
        theme: { color: "#c89b3c" },
      });

    } catch (error: any) {
      fbqTrack("PaymentInfoFailed", { content_ids: [plan?.id || "12-jyotirlinga"], value: finalAmount, currency: "INR" });
      gtag("event", "payment_failed", { currency: "INR", value: finalAmount, items: [{ item_id: plan?.id || "12-jyotirlinga", item_name: `12 Jyotirlinga Sub - ${plan?.name || ""}` }] });
      const message = error?.response?.data?.message || "Unable to initiate payment. Please try again.";
      setPageError(message);
      // The banner renders above the Jyotirlinga picker, which can be well off
      // screen by the time this fires — pop a toast too so a backend-only
      // rejection (one the fields above didn't already catch) is seen without
      // having to scroll up to find it.
      notification.error({ message: "Couldn't start payment", description: message, duration: 6 });
      setSubmitting(false);
    }
  };

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fff8ef", color: "#92400e" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="jy-seva-payment-wrapper pb-24">
      {verifying && <PaymentLoader />}
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left Column: Forms ── */}
        <div className="lg:col-span-2 space-y-6">
          {pageError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-800 rounded-xl px-4 py-3">
              {pageError}
            </div>
          )}

          {/* 12 Jyotirlinga Selection Component */}
          {state?.allJyotirlinga && state.allJyotirlinga.length > 0 && (
            <div className="jy-form-card" style={{ padding: 0, overflow: "hidden" }}>
              <SecondComponent
                jyotirlingas={state.allJyotirlinga}
                selectedIds={localJyotirlinga.map(j => j._id)}
                toggleSelection={toggleSelection}
                selectAll={selectAll}
              />
            </div>
          )}

          {/* Devotee Details */}
          <div className="jy-form-card">
            <h2 className="jy-section-title">🙏 Devotee Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <ModernInput
                label="WhatsApp Number"
                placeholder="10-digit mobile number"
                value={formData.whatsapp}
                onChange={(e) => handleInputChange(e, "whatsapp")}
                maxLength={10}
                error={errors.whatsapp}
                type="tel"
                inputRef={setFieldRef("whatsapp")}
              />
              <ModernInput
                label="Full Name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange(e, "name")}
                error={errors.name}
                inputRef={setFieldRef("name")}
              />
              <div className="md:col-span-2">
                <ModernInput
                  label="Email Address (Optional)"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange(e, "email")}
                  type="email"
                />
              </div>
              <div className="md:col-span-2">
                <ModernInput
                  label="Gotra"
                  placeholder="e.g. Kashyap"
                  value={dontKnowGotra ? "Don't know" : formData.gotra}
                  onChange={(e) => {
                    if (dontKnowGotra) setDontKnowGotra(false);
                    handleInputChange(e, "gotra");
                  }}
                  error={errors.gotra}
                  inputRef={setFieldRef("gotra")}
                />
                <div className="flex items-center gap-2 mt-[-10px] ml-1 mb-4">
                  <input
                    type="checkbox"
                    id="dontKnowGotra"
                    checked={dontKnowGotra}
                    onChange={(e) => {
                      setDontKnowGotra(e.target.checked);
                      if (e.target.checked && errors.gotra) setErrors((prev) => ({ ...prev, gotra: "" }));
                    }}
                    className="accent-orange-500"
                  />
                  <label htmlFor="dontKnowGotra" className="text-xs text-orange-800 cursor-pointer">I don't know my Gotra</label>
                </div>
              </div>
            </div>

            {/* Family Members */}
            <div className="mt-6 border-t border-amber-100 pt-6">
              <div className="flex justify-between items-center mb-4 gap-2">
                <h3 className="font-semibold text-xs md:text-sm uppercase tracking-wider flex flex-col md:flex-row md:items-center gap-1" style={{ color: '#92400e' }}>
                  <span>Family Members</span>
                  <span className="opacity-60 text-[10px] md:text-xs" translate="no">({freeFamilyCount} Free, then ₹{FAMILY_MEMBER_ADDON_PER_MEMBER}/member)</span>
                </h3>
                <button onClick={addFamilyMember} className="jy-add-member-btn whitespace-nowrap flex-shrink-0" type="button">
                  + Add Member
                </button>
              </div>
              <AnimatePresence>
                {family.map((member, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col sm:flex-row gap-2 mb-3 items-start"
                  >
                    <div className="flex-1 min-w-0 w-full">
                      <input
                        ref={setFieldRef(`family-${idx}-name`)}
                        type="text"
                        value={member.name}
                        onChange={(e) => updateFamilyMember(idx, "name", e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-2 outline-none focus:border-orange-400 transition-colors ${errors[`family-${idx}-name`] ? "border-red-400" : "border-amber-200"}`}
                        style={{ background: '#fff8ef', color: '#1c0a00' }}
                        placeholder={`Family Member ${idx + 1} Name`}
                      />
                      <InlineError message={errors[`family-${idx}-name`]} />
                    </div>
                    <div className="flex gap-2 flex-1 min-w-0 w-full">
                      <div className="flex-1 min-w-0">
                        <input
                          ref={setFieldRef(`family-${idx}-gotra`)}
                          type="text"
                          value={member.gotra}
                          onChange={(e) => updateFamilyMember(idx, "gotra", e.target.value)}
                          className={`w-full border-2 rounded-xl px-4 py-2 outline-none focus:border-orange-400 transition-colors ${errors[`family-${idx}-gotra`] ? "border-red-400" : "border-amber-200"}`}
                          style={{ background: '#fff8ef', color: '#1c0a00' }}
                          placeholder={`Gotra`}
                        />
                        <InlineError message={errors[`family-${idx}-gotra`]} />
                      </div>
                      <button
                        onClick={() => removeFamilyMember(idx)}
                        className="bg-red-50 text-red-400 px-4 rounded-xl hover:bg-red-100 border border-red-200 transition-colors shrink-0 h-[42px]"
                        type="button"
                      >✕</button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Prasad Delivery Address */}
          <div className="jy-form-card">
            <h2 className="jy-section-title">📦 Prasad Delivery Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <div className="md:col-span-2">
                <ModernInput
                  label="Complete Address"
                  placeholder="House/Flat No, Street, Landmark"
                  value={address.line1}
                  onChange={(e) => handleAddressChange(e, "line1")}
                  error={addressErrors.line1}
                  inputRef={setFieldRef("line1")}
                />
              </div>
              <ModernInput
                label="Pincode"
                placeholder="6-digit pincode"
                value={address.pinCode}
                onChange={(e) => handleAddressChange(e, "pinCode")}
                maxLength={6}
                error={addressErrors.pinCode}
                inputRef={setFieldRef("pinCode")}
              />
              <ModernInput
                label="City"
                placeholder="City"
                value={address.city}
                onChange={(e) => handleAddressChange(e, "city")}
                error={addressErrors.city}
                inputRef={setFieldRef("city")}
              />
              <div className="md:col-span-2">
                <ModernInput
                  label="State"
                  placeholder="State"
                  value={address.state}
                  onChange={(e) => handleAddressChange(e, "state")}
                  error={addressErrors.state}
                  inputRef={setFieldRef("state")}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Summary ── */}
        <div className="lg:col-span-1">
          <div className="jy-summary-card sticky top-24" style={{ background: '#fff' }}>
            <h2 className="jy-summary-title">Order Summary</h2>

            {/* Package Header with deity image ribbon */}
            {/* <div className="jy-deity-ribbon mb-4">
              <img loading="lazy" 
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/shribankebihariji/laddu" 
                alt="12 Jyotirlinga Seva"
                className="h-full object-contain drop-shadow-2xl"
               />
            </div> */}

            <div className="jy-pkg-summary-item">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-xl" style={{ color: '#92400e' }}>{plan.name}</h3>
                  {/* <p className="text-orange-500 text-sm font-semibold">12 Jyotirlinga Journey</p> */}
                  <p className="text-amber-600/70 text-sm mt-1" translate="no"><span key={selectedCount}>{selectedCount}</span> {selectedCount === 1 ? "Jyotirlinga" : "Jyotirlingas"} Selected</p>
                </div>
                <div className="text-right">
                </div>
              </div>

              {/* Coupon Section */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setShowCouponPanel((v) => !v)}
                  className="w-full bg-white px-2 rounded-xl border border-orange-400 flex items-center justify-between text-base font-semibold transition-colors py-2 border-t border-amber-100"
                  style={{ color: '#b45309' }}
                >
                  <span>🏷️ Have a Coupon?</span>
                  <span className="text-xs">{showCouponPanel ? "▲" : "▼"}</span>
                </button>

                <AnimatePresence>
                  {showCouponPanel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 mt-2 mb-3">
                        <input
                          value={couponInput}
                          onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                          className="flex-1 border-2 border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors uppercase"
                          style={{ background: '#fff8ef', color: '#1c0a00' }}
                          placeholder="Enter coupon code"
                        />
                        <button
                          type="button"
                          onClick={() => applyCoupon(couponInput)}
                          className="shrink-0 whitespace-nowrap text-white text-xs font-bold px-5 py-2 rounded-xl transition-colors"
                          style={{ background: '#ea580c' }}
                        >Apply</button>
                      </div>

                      {couponError && <p className="text-red-500 text-xs mb-2">{couponError}</p>}

                      {visibleCoupons.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-amber-600/70 text-[10px] uppercase tracking-wider font-bold">Available Offers</p>
                          {visibleCoupons.map((c) => (
                            <div
                              key={c.code}
                              onClick={() => applyCoupon(c.code)}
                              className={`flex items-center justify-between border rounded-xl px-3 py-2 cursor-pointer transition-colors ${appliedCoupon?.code === c.code
                                ? "border-orange-400 bg-orange-50"
                                : "border-amber-200 hover:border-orange-300 bg-amber-50"
                                }`}
                            >
                              <div>
                                <p className="font-bold text-xs tracking-wider" style={{ color: '#b45309' }}>{c.code}</p>
                                <p className="text-amber-600/70 text-[10px]">{c.label}</p>
                              </div>
                              <span className="text-green-600 text-xs font-bold">-₹{c.discount}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {appliedCoupon && (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2 mt-2">
                    <div>
                      <p className="text-green-700 text-xs font-bold">✅ {appliedCoupon.code} applied!</p>
                      <p className="text-green-600/70 text-[10px]">You saved amount!</p>
                    </div>
                    <button type="button" onClick={removeCoupon} className="text-gray-400 hover:text-red-500 text-xs transition-colors">✕ Remove</button>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-amber-100 space-y-2" translate="no">
                <div className="flex justify-between text-base" style={{ color: '#78350f' }}>
                  <span>Base Booking</span>
                  <span key={basePricing.planAdjustedBase}>₹{basePricing.planAdjustedBase}</span>
                </div>
                {basePricing.familyAddOnTotal > 0 && (
                  <div className="flex justify-between text-base" style={{ color: '#78350f' }}>
                    <span>Extra Members ({basePricing.paidFilledFamilyCount} × ₹{FAMILY_MEMBER_ADDON_PER_MEMBER})</span>
                    <span key={basePricing.familyAddOnTotal}>+ ₹{basePricing.familyAddOnTotal}</span>
                  </div>
                )}
                {billingMode === "upfront" && basePricing.upfrontDiscountAmount > 0 && (
                  <div className="flex justify-between text-base text-green-600">
                    <span>Upfront Discount ({basePricing.upfrontDiscountPercent}%)</span>
                    <span key={basePricing.upfrontDiscountAmount}>- ₹{basePricing.upfrontDiscountAmount}</span>
                  </div>
                )}
                <div className="jy-total-row pt-2 border-t border-amber-100">
                  <span className="font-semibold text-lg" style={{ color: '#92400e' }}>
                    Total Amount
                  </span>
                  <span key={finalAmount} className="text-3xl font-bold" style={{ color: '#ea580c' }}>₹{finalAmount}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Sticky Pay Button ── */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3"
          style={{
            background: "linear-gradient(to top, #fff8ef 80%, rgba(255,248,239,0))",
            backdropFilter: "blur(8px)",
            borderTop: "1px solid #fde9bb",
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            {/* Left: Total Amount — always visible */}
            <div className="flex flex-col leading-tight shrink-0" translate="no">
              <span className="text-xs font-semibold" style={{ color: '#b45309' }}>
                Total Amount
              </span>
              <span key={finalAmount} className="text-2xl font-black" style={{ color: '#ea580c' }}>₹{finalAmount}</span>
            </div>

            {/* Right: Button — capped at 340px on desktop, full-width on mobile */}
            <button
              onClick={handlePayment}
              disabled={submitting}
              type="button"
              className="jy-pay-now-btn"
              style={{ marginTop: 0, width: 'auto', flex: '1 1 0', maxWidth: '340px' }}
            >
              {submitting ? "Processing... " : "Pay & Book Seva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const JyotirlingaPaymentPage = () => (
  <div className="min-h-screen" style={{ background: "#fff8ef" }}>
    <Navbar activeIndex="12-jyotirlinga" />
    <JyotirlingaPaymentContent />
  </div>
);

export default JyotirlingaPaymentPage;
