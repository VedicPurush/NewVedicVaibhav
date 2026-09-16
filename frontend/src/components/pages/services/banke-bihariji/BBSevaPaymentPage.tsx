"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { notification } from "antd";
import "./BBSevaPaymentPage.css";
import { initiateBBSevaApi, verifyBBSevaPaymentApi } from "./api/bbSeva.api";
import type { SevaPackage } from "./data/sevaData";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { getVvUtm } from "@/lib/utm";
import PaymentLoader from "@/components/pages/services/chadhava/PaymentLoader";
import { gtag } from "@/lib/gtag";
import { readNavState, saveNavState } from "@/lib/nav-state";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";
import { useMoney, toInr, isValidPhone, shipsPrasad, localizeCopy } from "@/lib/currency";
import { PhoneField } from "@/components/checkout/PhoneField";

// ─── Constants ───────────────────────────────────────────────────────────────

const BB_COUPONS = [
  { code: "BIHARI50", label: "Special ₹50 Off", discount: 50, minPackagePrice: 1000, visible: true },
  { code: "SEVA100", label: "Devotee ₹100 Off", discount: 100, minPackagePrice: 2000, visible: true },
  { code: "VRINDAVAN150", label: "Vrindavan Special ₹150   Off", discount: 150, minPackagePrice: 5000, visible: true },
  { code: "KRISHNAJI", label: "₹200 Off", discount: 200, minPackagePrice: 0, visible: false },
  { code: "TESTINGMODE1", label: "Testing - Final ₹1", discount: 999999, minPackagePrice: 0, visible: false },
  { code: "TYAGI@19", label: "Special Testing Code", discount: 999999, minPackagePrice: 0, visible: false },
];

const EXTRA_MEMBER_RATE = 99;

// Per-package free member limits matched by price (same pattern as YatraPaymentPage)
// 1day=₹1100 → 2 free | 7days=₹3100 → 3 free | 14days=₹5100 → 4 free
// 31days=₹25000 → 5 free | 101days=₹51000 → 6 free
const getBBFamilyPricing = (price: number) => {
  if (price === 1100) return { limit: 2, rate: EXTRA_MEMBER_RATE };
  if (price === 3100) return { limit: 3, rate: EXTRA_MEMBER_RATE };
  if (price === 5100) return { limit: 4, rate: EXTRA_MEMBER_RATE };
  if (price === 25000) return { limit: 5, rate: EXTRA_MEMBER_RATE };
  if (price >= 51000) return { limit: 6, rate: EXTRA_MEMBER_RATE };
  return { limit: 2, rate: EXTRA_MEMBER_RATE }; // default fallback
};

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
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  error?: string;
  maxLength?: number;
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
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// ─── Main Component ───────────────────────────────────────────────────────────

type BBPaymentLocationState = {
  pkg?: SevaPackage;
};

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

const BBSevaPaymentContent = () => {
  /**
   * Every price on this page renders through `money()` — the India list price
   * converted into the devotee's own currency for DISPLAY only. The amount POSTED
   * to the server stays the India list total; the server owns the markup.
   */
  const { money, country } = useMoney();
  const router = useRouter();

  // react-router carried this via location.state; in Next it comes from sessionStorage.
  const [state, setState] = useState<BBPaymentLocationState | undefined>(undefined);
  const [stateLoaded, setStateLoaded] = useState(false);

  useEffect(() => {
    setState(readNavState<BBPaymentLocationState>("banke-bihariji-payment"));
    setStateLoaded(true);
  }, []);

  const pkg = state?.pkg;

  const [form, setForm] = useState({
    whatsapp: "",
    name: "",
    email: "",
    gotra: "",
    address: "",
    pincode: "",
    city: "",
    state: "",
  });

  const [family, setFamily] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pageError, setPageError] = useState("");

  // Coupon states
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [showCouponPanel, setShowCouponPanel] = useState(false);
  const [showAllPrasad, setShowAllPrasad] = useState(false);

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
          setForm((prev) => ({
            ...prev,
            name: fullName || prev.name,
            whatsapp: ph || prev.whatsapp,
            email: user.email || prev.email,
            gotra: user.gotra || prev.gotra,
            address: user.address1 || prev.address,
            city: user.city || prev.city,
            state: user.state || prev.state,
            pincode: user.pincode || prev.pincode,
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load user details", e);
    }
  }, []);

  // Auto-fetch user by phone
  const fetchUserDetails = async (phone: string) => {
    const clearFields = () => {
      setForm((prev) => ({ ...prev, name: "", gotra: "", address: "", pincode: "", city: "", state: "" }));
      setFamily([]);
    };
    try {
      const { data } = await api.get(`/get-user-by-phone/${phone}`);
      if (data?.user) {
        const fName = data.user.firstname || data.user.firstName || "";
        const lName = data.user.lastname || data.user.lastName || "";
        let full = `${fName} ${lName}`.trim();
        if (!full && data.user.name) full = data.user.name.trim();
        setForm((prev) => ({
          ...prev,
          name: full || prev.name,
          gotra: data.user.gotra || prev.gotra,
          address: data.user.address1 || prev.address,
          pincode: data.user.pincode || prev.pincode,
          city: data.user.city || prev.city,
          state: data.user.state || prev.state,
        }));
        if (Array.isArray(data.user.familyMembers) && data.user.familyMembers.length > 0) {
          setFamily(data.user.familyMembers);
        } else {
          setFamily([]);
        }
      } else {
        clearFields();
      }
    } catch (e: any) {
      if (e.response?.status === 404) clearFields();
    }
  };

  useEffect(() => {
    if (fetchTimerRef.current) { clearTimeout(fetchTimerRef.current); fetchTimerRef.current = null; }
    const phone = form.whatsapp.trim();
    if (/^[6-9]\d{9}$/.test(phone) && phone !== lastFetchedPhoneRef.current) {
      lastFetchedPhoneRef.current = phone;
      fetchTimerRef.current = setTimeout(() => fetchUserDetails(phone), 500);
    }
    return () => { if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current); };
  }, [form.whatsapp]);

  useEffect(() => {
    if (!stateLoaded) return;
    if (!pkg) router.push("/services/banke-bihariji");
  }, [stateLoaded, pkg, router]);

  // ViewContent — fire once when page loads
  const viewTrackedRef = useRef(false);
  useEffect(() => {
    if (!pkg || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    fbqTrack("ViewContent", {
      content_ids: [pkg.id || "banke-bihariji"],
      content_name: `Banke Bihariji Seva - ${pkg.duration}`,
      content_category: "Banke Bihariji Seva",
      content_type: "product",
      value: toInr(pkg.price),
      currency: "INR",
    });
    gtag("event", "view_item", {
      currency: "INR",
      value: toInr(pkg.price),
      items: [{
        item_id: pkg.id || "banke-bihariji",
        item_name: `Banke Bihariji Seva - ${pkg.duration}`,
        item_category: "Banke Bihariji Seva",
        price: pkg.price,
        quantity: 1,
      }],
    });
  }, [pkg]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const addFamilyMember = () => setFamily((prev) => [...prev, ""]);
  const updateFamilyMember = (i: number, v: string) =>
    setFamily((prev) => { const arr = [...prev]; arr[i] = v; return arr; });
  const removeFamilyMember = (i: number) => setFamily((prev) => prev.filter((_, idx) => idx !== i));

  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    if (!form.whatsapp || !isValidPhone(form.whatsapp, country))
      errs.whatsapp = "Valid mobile number required";
    if (!form.name || form.name.trim().length < 3) errs.name = "Full name required";
    if (!form.gotra || !form.gotra.trim()) errs.gotra = "Gotra is required";
    if (shipsPrasad(country)) {
      if (!form.address || form.address.trim().length < 10)
        errs.address = "Complete address required for Prasad delivery";
      if (!form.pincode || !/^\d{6}$/.test(form.pincode.trim())) errs.pincode = "Valid 6-digit Pincode required";
      if (!form.city || !form.city.trim()) errs.city = "City is required";
      if (!form.state || !form.state.trim()) errs.state = "State is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const cleanedFamily = useMemo(
    () => family.map((m) => m.trim()).filter((m) => m.length > 0),
    [family]
  );

  // Pricing — count all added slots (including ones still being typed) for live price feedback
  const packagePrice = pkg?.price ?? 0;
  const { limit: freeLimit, rate: extraRate } = getBBFamilyPricing(packagePrice);
  const extraMembersCount = Math.max(0, family.length - freeLimit);
  const extraCharges = extraMembersCount * extraRate;

  const visibleCoupons = BB_COUPONS.filter(
    (c) => c.visible && packagePrice >= c.minPackagePrice
  );

  const discountAmount = appliedCoupon
    ? Math.min(appliedCoupon.discount, packagePrice + extraCharges - 1)
    : 0;

  const finalAmount = Math.max(packagePrice + extraCharges - discountAmount, 1);

  const applyCoupon = (code: string) => {
    const found = BB_COUPONS.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!found) {
      setCouponError("Invalid coupon code.");
      notification.error({ message: "Invalid coupon", description: "This coupon code does not exist.", placement: "topRight" });
      return;
    }
    if (packagePrice < found.minPackagePrice) {
      setCouponError(`This coupon is valid for packages ${money(found.minPackagePrice)}+.`);
      notification.error({ message: "Coupon not applicable", description: `Requires package price of ${money(found.minPackagePrice)}+.`, placement: "topRight" });
      return;
    }
    setAppliedCoupon(found);
    setCouponError("");
    setCouponInput(found.code);
    setShowCouponPanel(false);
    notification.success({ message: "Coupon Applied! 🎉", description: `You saved ${money(found.discount)}!`, placement: "topRight" });
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponInput(""); setCouponError(""); };

  const handlePayment = async () => {
    if (!pkg) return;
    if (!validateForm()) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }

    try {
      setSubmitting(true);
      setPageError("");

      // PhoneField already caps this at the active country's own number
      // length; forcing the last 10 digits here would truncate a longer
      // foreign number instead of just being a harmless no-op.
      const purePhone = form.whatsapp.replace(/\D/g, "");
      const effectiveEmail = form.email.trim() || `${purePhone}@gmail.com`;

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setPageError("Unable to load Razorpay checkout. Please try again.");
        setSubmitting(false);
        return;
      }

      // InitiateCheckout
      fbqTrack("InitiateCheckout", {
        content_ids: [pkg.id || "banke-bihariji"],
        content_name: `Banke Bihariji Seva - ${pkg.duration}`,
        content_category: "Banke Bihariji Seva",
        content_type: "product",
        value: toInr(finalAmount),
        currency: "INR",
        num_items: 1,
      });
      gtag("event", "begin_checkout", {
        currency: "INR",
        value: toInr(finalAmount),
        items: [{
          item_id: pkg.id || "banke-bihariji",
          item_name: `Banke Bihariji Seva - ${pkg.duration}`,
          item_category: "Banke Bihariji Seva",
          price: finalAmount,
          quantity: 1,
        }],
      });

      const orderData = await initiateBBSevaApi({
        packageId: pkg.id,
        name: form.name.trim(),
        mobile: purePhone,
        gotra: form.gotra.trim(),
        familyMembers: cleanedFamily,
        ...(shipsPrasad(country)
          ? {
              address: form.address.trim(),
              city: form.city.trim(),
              state: form.state.trim(),
              pincode: form.pincode.trim(),
            }
          : {}),
        discountedAmount: finalAmount,
        vv_utm: getVvUtm(),
      });

      // 🔥 Fire login/register in BACKGROUND — does NOT block Razorpay opening
      api.post(`/phone-login-or-register`, {
        phone: purePhone,
        email: effectiveEmail,
        name: form.name.trim(),
        gotra: form.gotra.trim(),
        familyMembers: cleanedFamily,
        ...(shipsPrasad(country)
          ? {
              address: `${form.address.trim()}, ${form.city.trim()}, ${form.state.trim()} - ${form.pincode.trim()}`,
              address1: form.address.trim(),
              city: form.city.trim(),
              state: form.state.trim(),
              pincode: form.pincode.trim(),
              country: "India",
            }
          : {}),
      }).then((userRes) => {
        if (userRes.data?.user) {
          localStorage.setItem("userDetails", JSON.stringify({ user: userRes.data.user, token: userRes.data.token }));
        }
      }).catch((loginErr) => {
        console.warn("Background login failed (non-fatal):", loginErr);
      });

      const razorpayOptions = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Vedic Vaibhav",
        description: `Banke Bihariji Seva - ${pkg.duration}`,
        order_id: orderData.razorpayOrderId,
        prefill: { name: form.name.trim(), contact: purePhone, email: effectiveEmail },
        theme: { color: "#fbaa1c" },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          setVerifying(true);
          try {
            // Payment is already captured here — retry through the webhook race
            // rather than reporting a confirmation hiccup as a failed payment.
            const outcome = await verifyPaymentWithRetry({
              attempt: () =>
                verifyBBSevaPaymentApi({
                  orderID: orderData.orderID,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
            });
            if (outcome.status === "declined") throw new Error(outcome.message);
            // Purchase — DISABLED: Backend CAPI (BBSevaController) sends this event to avoid double-counting
            /*
            fbqTrack("Purchase", {
              content_ids: [pkg.id || "banke-bihariji"],
              content_name: `Banke Bihariji Seva - ${pkg.duration}`,
              content_category: "Banke Bihariji Seva",
              content_type: "product",
              value: toInr(finalAmount),
              currency: "INR",
              transaction_id: response.razorpay_payment_id,
            });
            */

            // GA4 Purchase — DISABLED for the same reason as the Meta event
            // above: the success page (BankeBihariPaymentSuccess) already sends
            // it, so firing here counted every booking twice. The two also used
            // different transaction ids (razorpay_payment_id here vs the booking
            // id there), which stopped GA4 deduping them.
            localStorage.setItem("last_bb_booking", orderData.orderID);
            localStorage.setItem("bb_booking_id", orderData.orderID);
            saveNavState("banke-bihariji-success", {
              bookingId: orderData.orderID,
              packageName: pkg.duration,
              amount: finalAmount,
              // The receipt on the success page must show what the card was
              // ACTUALLY billed, not the India list total re-priced by
              // whatever country happens to be active when it renders.
              currency: orderData.currency,
              chargedAmount: orderData.chargedAmount,
            });
            router.replace("/services/banke-bihariji/success");
          } catch (verifyError) {
            console.error("Payment verification failed:", verifyError);
            // PaymentInfoFailed — verification error
            fbqTrack("PaymentInfoFailed", {
              content_ids: [pkg.id || "banke-bihariji"],
              value: toInr(finalAmount),
              currency: "INR",
            });
            gtag("event", "payment_failed", {
              currency: "INR",
              value: toInr(finalAmount),
              items: [{ item_id: pkg.id || "banke-bihariji", item_name: `Banke Bihariji Seva - ${pkg.duration}` }],
            });
            router.replace("/services/banke-bihariji/failure");
          } finally {
            setVerifying(false);
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () { setSubmitting(false); },
        },
      };

      const rzp = new (window as any).Razorpay(razorpayOptions);
      rzp.open();
    } catch (error: any) {
      console.error("Error starting payment:", error);
      // PaymentInfoFailed — order creation error
      fbqTrack("PaymentInfoFailed", {
        content_ids: [pkg?.id || "banke-bihariji"],
        value: toInr(finalAmount),
        currency: "INR",
      });
      gtag("event", "payment_failed", {
        currency: "INR",
        value: toInr(finalAmount),
        items: [{ item_id: pkg?.id || "banke-bihariji", item_name: `Banke Bihariji Seva - ${pkg?.duration || ""}` }],
      });
      setPageError(error?.response?.data?.message || "Unable to initiate payment. Please try again.");
      setSubmitting(false);
    }
  };

  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fff8ef", color: "#92400e" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="bb-seva-payment-wrapper pb-24">
      {verifying && <PaymentLoader />}
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left Column: Forms ── */}
        <div className="lg:col-span-2 space-y-6">
          {pageError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3">
              {pageError}
            </div>
          )}

          {/* Devotee Details */}
          <div className="bb-form-card">
            <h2 className="bb-section-title">🙏 Devotee Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 ml-1" style={{ color: '#92400e' }}>
                  WhatsApp Number
                </label>
                <PhoneField
                  value={form.whatsapp}
                  onChange={(next) => {
                    setForm((prev) => ({ ...prev, whatsapp: next }));
                    if (errors.whatsapp) setErrors((prev) => ({ ...prev, whatsapp: "" }));
                  }}
                  error={errors.whatsapp}
                  inputClassName="bg-transparent"
                />
              </div>
              <ModernInput
                label="Full Name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={(e) => handleInputChange(e, "name")}
                error={errors.name}
              />
              <div className="md:col-span-2">
                <ModernInput
                  label="Email Address (Optional)"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => handleInputChange(e, "email")}
                  type="email"
                />
              </div>
              <div className="md:col-span-2">
                <ModernInput
                  label="Gotra"
                  placeholder="e.g. Kashyap (Type 'Don't know' if unsure)"
                  value={form.gotra}
                  onChange={(e) => handleInputChange(e, "gotra")}
                  error={errors.gotra}
                />
              </div>
            </div>

            {/* Family Members */}
            <div className="mt-6 border-t border-amber-100 pt-6">
              <div className="flex justify-between items-center mb-4 gap-2">
                <h3 className="font-semibold text-xs md:text-sm uppercase tracking-wider flex flex-col md:flex-row md:items-center gap-1" style={{ color: '#92400e' }}>
                  <span>Family Members</span>
                  <span className="opacity-60 text-[10px] md:text-xs">({freeLimit} Free, then {money(extraRate)}/member)</span>
                </h3>
                <button onClick={addFamilyMember} className="bb-add-member-btn whitespace-nowrap flex-shrink-0" type="button">
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
                    className="flex gap-2 mb-3"
                  >
                    <input
                      type="text"
                      value={member}
                      onChange={(e) => updateFamilyMember(idx, e.target.value)}
                      className="flex-1 min-w-0 border-2 border-amber-200 rounded-xl px-4 py-2 outline-none focus:border-orange-400 transition-colors"
                      style={{ background: '#fff8ef', color: '#1c0a00' }}
                      placeholder={`Family Member ${idx + 1} Name`}
                    />
                    <button
                      onClick={() => removeFamilyMember(idx)}
                      className="bg-red-50 text-red-400 px-4 rounded-xl hover:bg-red-100 border border-red-200 transition-colors"
                      type="button"
                    >✕</button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Prasad Delivery Address — physical goods, so only collected where
              it can actually be couriered. See lib/currency.ts#shipsPrasad. */}
          {shipsPrasad(country) && (
          <div className="bb-form-card">
            <h2 className="bb-section-title">📦 Prasad Delivery Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <div className="md:col-span-2">
                <ModernInput
                  label="Complete Address"
                  placeholder="House/Flat No, Street, Landmark"
                  value={form.address}
                  onChange={(e) => handleInputChange(e, "address")}
                  error={errors.address}
                />
              </div>
              <ModernInput
                label="Pincode"
                placeholder="6-digit pincode"
                value={form.pincode}
                onChange={(e) => handleInputChange(e, "pincode")}
                maxLength={6}
                error={errors.pincode}
              />
              <ModernInput
                label="City"
                placeholder="City"
                value={form.city}
                onChange={(e) => handleInputChange(e, "city")}
                error={errors.city}
              />
              <div className="md:col-span-2">
                <ModernInput
                  label="State"
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => handleInputChange(e, "state")}
                  error={errors.state}
                />
              </div>
            </div>
          </div>
          )}
        </div>

        {/* ── Right Column: Summary ── */}
        <div className="lg:col-span-1">
          <div className="bb-summary-card sticky top-24" style={{ background: '#fff' }}>
            <h2 className="bb-summary-title">Order Summary</h2>

            {/* Package Header with deity image ribbon */}
            <div className="bb-deity-ribbon mb-4">
              <img loading="lazy"
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/shribankebihariji/laddu"
                alt="Banke Bihariji"
                className="h-full object-contain drop-shadow-2xl"
              />
            </div>

            <div className="bb-pkg-summary-item">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-xl" style={{ color: '#92400e' }}>{pkg.duration}</h3>
                  <p className="text-orange-500 text-sm font-semibold">Banke Bihariji Virtual Seva</p>
                  <p className="text-amber-600/70 text-sm mt-1">For {pkg.days} {pkg.days === 1 ? "Day" : "Days"}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-2xl" style={{ color: '#ea580c' }}>{money(pkg.price)}</div>
                </div>
              </div>

              {pkg.features && pkg.features.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-100">
                  <p className="text-amber-600/70 text-xs mb-2 uppercase tracking-wider font-bold">Includes:</p>
                  <ul className="space-y-1.5">
                    {pkg.features.slice(0, 5).map((f, i) => (
                      <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#78350f' }}>
                        <span className="text-orange-500 mt-0.5">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prasad Box */}
              {pkg.prasadItems && pkg.prasadItems.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-100">
                  <p className="text-amber-600/70 text-xs mb-2 uppercase tracking-wider font-bold">📦 What's in your Prasad Box?</p>
                  <ul className="space-y-1.5">
                    {(showAllPrasad ? pkg.prasadItems : pkg.prasadItems.slice(0, 3)).map((item, i) => (
                      <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#78350f' }}>
                        <span className="text-orange-500 mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {pkg.prasadItems.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllPrasad((v) => !v)}
                      className="mt-2 text-xs font-semibold underline transition-colors"
                      style={{ color: '#b45309' }}
                    >
                      {showAllPrasad ? `▲ See less` : `▼ See ${pkg.prasadItems.length - 3} more items`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Coupon Section */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowCouponPanel((v) => !v)}
                className="w-full flex items-center justify-between text-base font-semibold transition-colors py-2 border-t border-amber-100"
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
                        className="text-white text-xs font-bold px-4 rounded-xl transition-colors"
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
                              <p className="text-amber-600/70 text-[10px]">{localizeCopy(c.label)}</p>
                            </div>
                            <span className="text-green-600 text-xs font-bold">-{money(c.discount)}</span>
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
                    <p className="text-green-600/70 text-[10px]">You save {money(discountAmount)}</p>
                  </div>
                  <button type="button" onClick={removeCoupon} className="text-gray-400 hover:text-red-500 text-xs transition-colors">✕ Remove</button>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-amber-100 space-y-2">
              <div className="flex justify-between text-base" style={{ color: '#78350f' }}>
                <span>Package Price</span>
                <span>{money(packagePrice)}</span>
              </div>
              {extraCharges > 0 && (
                <div key={extraCharges} className="flex justify-between text-base" style={{ color: '#78350f' }}>
                  <span>Extra Members ({extraMembersCount} × {money(extraRate)})</span>
                  <span>+ {money(extraCharges)}</span>
                </div>
              )}
              {appliedCoupon && (
                <div className="flex justify-between text-base text-green-600">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>- {money(discountAmount)}</span>
                </div>
              )}
              <div className="bb-total-row pt-2 border-t border-amber-100">
                <span className="font-semibold text-lg" style={{ color: '#92400e' }}>Total Amount</span>
                <span key={finalAmount} className="text-3xl font-bold" style={{ color: '#ea580c' }}>{money(finalAmount)}</span>
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
          <div className="flex flex-col leading-tight shrink-0">
            <span className="text-xs font-semibold" style={{ color: '#b45309' }}>Total Amount</span>
            <span key={finalAmount} className="text-2xl font-black" style={{ color: '#ea580c' }}>{money(finalAmount)}</span>
          </div>

          {/* Right: Button — capped at 340px on desktop, full-width on mobile */}
          <button
            onClick={handlePayment}
            disabled={submitting}
            type="button"
            className="bb-pay-now-btn"
            style={{ marginTop: 0, width: 'auto', flex: '1 1 0', maxWidth: '340px' }}
          >
            {submitting ? "Processing... " : "Pay & Book Seva"}
          </button>
        </div>
      </div>
    </div>
  );
};

const BBSevaPaymentPage = () => (
  <div className="min-h-screen" style={{ background: "#fff8ef" }}>
    <Navbar activeIndex="banke-bihariji" />
    <BBSevaPaymentContent />
  </div>
);

export default BBSevaPaymentPage;
