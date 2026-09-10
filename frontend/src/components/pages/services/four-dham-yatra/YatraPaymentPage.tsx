"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/layout/Layout";
import "./YatraPaymentPage.css";
import type { ActiveSlotData, YatraPackage } from "./api/types";
import {
  create4DhamRazorpayOrderApi,
  verify4DhamRazorpayPaymentApi,
} from "./api/fourDhamYatraApi";
import { notification } from "antd";
import PaymentLoader from "@/components/pages/services/chadhava/PaymentLoader";
import { api } from "@/lib/api";
import { getVvUtm } from "@/lib/utm";
import { gtag } from "@/lib/gtag";
import { readNavState } from "@/lib/nav-state";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";
import { useMoney, toInr, isValidPhone, localizeCopy } from "@/lib/currency";
import { PhoneField } from "@/components/checkout/PhoneField";

const YATRA_COUPONS = [
  { code: "VEDIC100", label: "Special ₹100 Off", discount: 100, minPackagePrice: 3000, visible: true },
  { code: "DIVINE150", label: "Divine Blessing ₹150 Off", discount: 200, minPackagePrice: 5000, visible: true },
  // { code: "YATRA500", label: "Premium Yatra ₹500 Off", discount: 500, minPackagePrice: 9000, visible: true }, // Hidden for now (Max 200 discount)
  { code: "TEST1", label: "Hidden Test Coupon", discount: -1, minPackagePrice: 0, visible: false },
  { code: "JATIN@100", label: "Special Testing Code", discount: -1, minPackagePrice: 0, visible: false },
];

const InlineError = ({ message }: { message?: string }) => (
  <AnimatePresence mode="wait">
    {message ? (
      <motion.div
        initial={{ opacity: 0, y: -5, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -5, height: 0 }}
        transition={{ duration: 0.2 }}
        className="text-red-500 text-xs mt-1 flex items-center gap-1"
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
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">
        {label}
      </label>
      <div
        className={`relative flex items-center bg-[#1a1c29] rounded-xl overflow-hidden border-2 transition-colors ${error
          ? "border-red-500/50"
          : isFocused
            ? "border-orange-500/50"
            : "border-gray-700/50"
          }`}
      >
        <input
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full py-3 px-4 text-white placeholder:text-gray-500 outline-none bg-transparent"
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
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

type PaymentLocationState = {
  pkg?: YatraPackage;
  poojaId?: string;
  poojaName?: string;
  activeSlot?: ActiveSlotData;
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

const YatraPaymentContent = () => {
  /**
   * Every price on this page renders through `money()` — the India list price
   * converted into the devotee's own currency for DISPLAY only. The amount POSTED
   * to the server stays the India list total; the server owns the markup.
   */
  const { money, country } = useMoney();
  const router = useRouter();

  // react-router carried this via location.state; in Next it comes from sessionStorage.
  const [state, setState] = useState<PaymentLocationState | undefined>(undefined);
  const [stateLoaded, setStateLoaded] = useState(false);

  useEffect(() => {
    setState(readNavState<PaymentLocationState>("4-dham-yatra-payment"));
    setStateLoaded(true);
  }, []);

  const pkg = state?.pkg;
  const poojaId = state?.poojaId;
  const poojaName = state?.poojaName;
  const activeSlot = state?.activeSlot;

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

  const lastFetchedPhoneRef = useRef<string>("");
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ViewContent — fire once when page loads with package info
  const viewTrackedRef = useRef(false);
  useEffect(() => {
    if (!pkg || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    fbqTrack("ViewContent", {
      content_ids: [poojaId || "4-dham-yatra"],
      content_name: poojaName || "4 Dham Yatra",
      content_category: "4 Dham Yatra",
      content_type: "product",
      value: toInr(pkg.price),
      currency: "INR",
    });
    gtag("event", "view_item", {
      currency: "INR",
      value: toInr(pkg.price),
      items: [{
        item_id: poojaId || "4-dham-yatra",
        item_name: poojaName || "4 Dham Yatra",
        item_category: "4 Dham Yatra",
        item_variant: pkg.title,
        price: pkg.price,
        quantity: 1,
      }],
    });
  }, [pkg, poojaId, poojaName]);

  // Prefill from local storage
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

          let addr1 = user.address1 || "";
          let cityVal = user.city || "";
          let stateVal = user.state || "";
          let postalVal = user.pincode || "";

          if ((!addr1 || !cityVal || !stateVal || !postalVal) && user.address) {
            const parts = user.address.split(",").map((s: string) => s.trim());
            if (parts.length > 0 && !addr1) addr1 = parts[0];
          }

          setForm((prev) => ({
            ...prev,
            name: fullName || prev.name,
            whatsapp: ph || prev.whatsapp,
            email: user.email || prev.email,
            gotra: user.gotra || prev.gotra,
            address: addr1 || prev.address,
            city: cityVal || prev.city,
            state: stateVal || prev.state,
            pincode: postalVal || prev.pincode,
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load user details", e);
    }
  }, []);

  const fetchUserDetails = async (phone: string) => {
    const clearFields = () => {
      setForm((prev) => ({
        ...prev,
        name: "",
        gotra: "",
        address: "",
        pincode: "",
        city: "",
        state: "",
      }));
      setFamily([]);
    };

    try {
      const { data } = await api.get(`/get-user-by-phone/${phone}`);

      if (data && data.user) {
        const rawName = data.user.name || data.user.fullName || "";
        const fName = data.user.firstname || data.user.firstName || data.user.given_name || "";
        const lName = data.user.lastname || data.user.lastName || data.user.family_name || "";

        let full = `${fName} ${lName}`.trim();
        if (!full && rawName) full = rawName.trim();

        setForm((prev) => ({
          ...prev,
          name: full || prev.name,
          email: data.user.email || prev.email,
          gotra: data.user.gotra || prev.gotra,
          address: data.user.address1 || prev.address,
          pincode: data.user.pincode || prev.pincode,
          city: data.user.city || prev.city,
          state: data.user.state || prev.state,
        }));

        if (
          data.user.familyMembers &&
          Array.isArray(data.user.familyMembers) &&
          data.user.familyMembers.length > 0
        ) {
          setFamily(data.user.familyMembers);
        } else {
          setFamily([]);
        }
      } else {
        clearFields();
      }
    } catch (e: any) {
      if (e.response && e.response.status === 404) {
        clearFields();
      }
    }
  };

  useEffect(() => {
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
    }

    const phone = form.whatsapp.trim();

    if (/^[6-9]\d{9}$/.test(phone) && phone !== lastFetchedPhoneRef.current) {
      lastFetchedPhoneRef.current = phone;
      fetchTimerRef.current = setTimeout(() => {
        fetchUserDetails(phone);
      }, 500);
    }

    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
    };
  }, [form.whatsapp]);

  useEffect(() => {
    if (!stateLoaded) return;
    if (!pkg || !poojaId || !activeSlot) {
      router.push("/4-dham-yatra");
    }
  }, [stateLoaded, pkg, poojaId, activeSlot, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const addFamilyMember = () => {
    setFamily((prev) => [...prev, ""]);
  };

  const updateFamilyMember = (index: number, value: string) => {
    setFamily((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const removeFamilyMember = (index: number) => {
    setFamily((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!form.whatsapp || !isValidPhone(form.whatsapp, country)) {
      newErrors.whatsapp = "Valid mobile number required";
    }

    if (!form.name || form.name.trim().length < 3) {
      newErrors.name = "Full name required";
    }

    if (!form.gotra || !form.gotra.trim()) {
      newErrors.gotra = "Gotra is required";
    }

    if (!form.address || form.address.trim().length < 10) {
      newErrors.address = "Complete address required for Prasad delivery";
    }

    if (
      country.iso2 === "IN"
        ? !form.pincode || !/^\d{6}$/.test(form.pincode.trim())
        : !form.pincode || form.pincode.trim().length < 3 || form.pincode.trim().length > 12
    ) {
      newErrors.pincode = country.iso2 === "IN" ? "Valid 6-digit Pincode required" : "Valid postal code required";
    }

    if (!form.city || !form.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!form.state || !form.state.trim()) {
      newErrors.state = "State is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const cleanedFamily = useMemo(
    () => family.map((item) => item.trim()).filter((item) => item.length > 0),
    [family]
  );

  // ── Coupon helpers ────────────────────────────────────────────
  const packagePrice = pkg?.price ?? 0;

  const getFamilyPricing = (price: number, title?: string) => {
    const t = title?.toLowerCase() || "";
    if (price === 3100) return { limit: 2, rate: 99 };
    if (price === 5100) return { limit: 3, rate: 99 };
    if (price === 7100) return { limit: 4, rate: 99 };
    if (price >= 9000 || t.includes("premium") || t.includes("highest")) {
      return { limit: 5, rate: 199 };
    }
    return { limit: 2, rate: 99 }; // Default fallback
  };

  const { limit: freeLimit, rate: extraRate } = getFamilyPricing(packagePrice, pkg?.title);
  // Use family.length (all added slots) so price updates instantly when a member is added,
  // not just after they finish typing a name
  const extraMembersCount = Math.max(0, family.length - freeLimit);
  const extraCharges = extraMembersCount * extraRate;

  /** Coupons visible to the user (scale with package price) */
  const visibleCoupons = YATRA_COUPONS.filter(
    (c) => c.visible && packagePrice >= c.minPackagePrice
  );

  const discountAmount = appliedCoupon
    ? appliedCoupon.discount === -1
      ? packagePrice + extraCharges - 1          // hidden coupon → ₹1 final
      : Math.min(appliedCoupon.discount, packagePrice + extraCharges - 1)
    : 0;

  const finalAmount = Math.max(packagePrice + extraCharges - discountAmount, 1);

  const applyCoupon = (code: string) => {
    const found = YATRA_COUPONS.find(
      (c) => c.code.toUpperCase() === code.trim().toUpperCase()
    );
    if (!found) {
      setCouponError("Invalid coupon code.");
      notification.error({ message: "Invalid coupon", description: "This coupon code does not exist.", placement: "topRight" });
      return;
    }
    if (found.visible && packagePrice < found.minPackagePrice) {
      setCouponError(`This coupon is valid for packages ${money(found.minPackagePrice)}+.`);
      notification.error({ message: "Coupon not applicable", description: `This coupon requires a package price of ${money(found.minPackagePrice)} or more.`, placement: "topRight" });
      return;
    }
    setAppliedCoupon(found);
    setCouponError("");
    setCouponInput(found.code);
    setShowCouponPanel(false);
    const saved = found.discount === -1 ? packagePrice - 1 : found.discount;
    notification.success({ message: "Coupon Applied! 🎉", description: `You saved ${money(saved)}!`, placement: "topRight" });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  const handlePayment = async () => {
    if (!pkg || !poojaId || !activeSlot) return;

    const isValid = validateForm();
    if (!isValid) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);
      setPageError("");

      // PhoneField already caps this at the active country's own number
      // length; slice(-10) would truncate a longer foreign number.
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
        content_ids: [poojaId || "4-dham-yatra"],
        content_name: poojaName || "4 Dham Yatra",
        content_category: "4 Dham Yatra",
        content_type: "product",
        value: toInr(finalAmount),
        currency: "INR",
        num_items: 1,
      });
      gtag("event", "begin_checkout", {
        currency: "INR",
        value: toInr(finalAmount),
        items: [{
          item_id: poojaId || "4-dham-yatra",
          item_name: poojaName || "4 Dham Yatra",
          item_category: "4 Dham Yatra",
          item_variant: pkg.title,
          price: finalAmount,
          quantity: 1,
        }],
      });

      const orderData = await create4DhamRazorpayOrderApi({
        poojaId,
        slotId: activeSlot.id,
        packageName: pkg.title,
        devoteeName: form.name.trim(),
        whatsapp: purePhone,
        gotra: form.gotra.trim(),
        familyMembers: cleanedFamily,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        discountedAmount: finalAmount,
        vv_utm: getVvUtm(),
      });

      // --- Register or login user in the background AFTER creating order to not hinder it ---
      const fullAddress = `${form.address.trim()}, ${form.city.trim()}, ${form.state.trim()} - ${form.pincode.trim()}`;
      api.post(`/phone-login-or-register`, {
        phone: purePhone,
        email: effectiveEmail,
        name: form.name.trim(),
        gotra: form.gotra.trim(),
        familyMembers: cleanedFamily,
        address: fullAddress,
        address1: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        country: "India",
      }).then((userRes) => {
        localStorage.setItem(
          "userDetails",
          JSON.stringify({ user: userRes.data.user, token: userRes.data.token })
        );
      }).catch((err) => {
        console.warn("User registration or login failed in background...", err);
      });

      const razorpayOptions = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Vedic Vaibhav",
        description: `${poojaName || "4 Dham Yatra"} - ${pkg.title}`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: form.name.trim(),
          contact: purePhone,
          email: effectiveEmail,
        },
        theme: {
          color: "#F59E0B",
        },
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
                verify4DhamRazorpayPaymentApi({
                  bookingId: orderData.bookingId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
            });
            if (outcome.status === "declined") throw new Error(outcome.message);

            // Purchase — DISABLED: Backend CAPI (4DhamYatraBookingController) sends this event to avoid double-counting
            /*
            fbqTrack("Purchase", {
              content_ids: [poojaId || "4-dham-yatra"],
              content_name: poojaName || "4 Dham Yatra",
              content_category: "4 Dham Yatra",
              content_type: "product",
              value: toInr(finalAmount),
              currency: "INR",
              transaction_id: response.razorpay_payment_id,
            });
            */

            // GA4 Purchase — DISABLED for the same reason as the Meta event
            // above: YatraPaymentSuccess already sends it on the page this
            // redirects to, so every booking was counted twice, under two
            // different transaction ids (razorpay_payment_id here vs
            // lastYatraOrderId there) so GA4 could not merge them.
            localStorage.setItem("bookedpujaID", poojaId);
            localStorage.setItem("bookingId", orderData.bookingId);
            localStorage.setItem("lastYatraAmount", String(finalAmount));
            localStorage.setItem("lastYatraOrderId", orderData.bookingId);
            router.replace("/4-dham-yatra/payment-success");
          } catch (verifyError: any) {
            console.error("Payment verification failed:", verifyError);
            // PaymentInfoFailed — verification error
            fbqTrack("PaymentInfoFailed", {
              content_ids: [poojaId || "4-dham-yatra"],
              value: toInr(finalAmount),
              currency: "INR",
            });
            gtag("event", "payment_failed", {
              currency: "INR",
              value: toInr(finalAmount),
              items: [{ item_id: poojaId || "4-dham-yatra", item_name: poojaName || "4 Dham Yatra" }],
            });
            router.replace("/4-dham-yatra/payment-failed");
          } finally {
            setVerifying(false);
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
          },
        },
      };

      const razorpay = new (window as any).Razorpay(razorpayOptions);
      razorpay.open();
    } catch (error: any) {
      console.error("Error starting payment:", error);
      // PaymentInfoFailed — order creation error
      fbqTrack("PaymentInfoFailed", {
        content_ids: [poojaId || "4-dham-yatra"],
        value: toInr(finalAmount),
        currency: "INR",
      });
      gtag("event", "payment_failed", {
        currency: "INR",
        value: toInr(finalAmount),
        items: [{ item_id: poojaId || "4-dham-yatra", item_name: poojaName || "4 Dham Yatra" }],
      });
      setPageError(
        error?.response?.data?.message ||
        "Unable to initiate payment. Please try again."
      );
      setSubmitting(false);
    }
  };

  if (!pkg || !poojaId || !activeSlot) {
    return (
      <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="yatra-payment-wrapper">
      {verifying && <PaymentLoader />}
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {pageError ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3">
              {pageError}
            </div>
          ) : null}

          <div className="form-card">
            <h2 className="section-title">Devotee Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 ml-1">
                  WhatsApp Number
                </label>
                <PhoneField
                  value={form.whatsapp}
                  onChange={(next) => {
                    setForm((prev) => ({ ...prev, whatsapp: next }));
                    if (errors.whatsapp) setErrors((prev) => ({ ...prev, whatsapp: "" }));
                  }}
                  error={errors.whatsapp}
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
                  placeholder="your@email.com "
                  value={form.email}
                  onChange={(e) => handleInputChange(e, "email")}
                  type="email"
                  error={errors.email}
                />
              </div>

              <div className="md:col-span-2">
                <ModernInput
                  label="Gotra"
                  placeholder="e.g. Kashyap (Type Don't know if unsure)"
                  value={form.gotra}
                  onChange={(e) => handleInputChange(e, "gotra")}
                  error={errors.gotra}
                />
              </div>
            </div>

            <div className="mt-6 border-t border-gray-800 pt-6">
              <div className="flex justify-between items-center mb-4 gap-2">
                <h3 className="text-gray-300 font-semibold text-xs md:text-sm uppercase tracking-wider flex flex-col md:flex-row md:items-center gap-1">
                  <span>Family Members</span>
                  <span className="opacity-75 text-[10px] md:text-xs">({freeLimit} Free, then {money(extraRate)}/member)</span>
                </h3>
                <button onClick={addFamilyMember} className="add-member-btn whitespace-nowrap flex-shrink-0" type="button">
                  + Add Member
                </button>
              </div>

              <AnimatePresence>
                {family.map((member, idx) => (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    key={idx}
                    className="flex gap-2 mb-3"
                  >
                    <input
                      type="text"
                      value={member}
                      onChange={(e) => updateFamilyMember(idx, e.target.value)}
                      className="flex-1 min-w-0 bg-[#1a1c29] border-2 border-gray-700/50 rounded-xl px-4 py-2 text-white outline-none focus:border-orange-500/50 transition-colors"
                      placeholder={`Family Member ${idx + 1} Name`}
                    />
                    <button
                      onClick={() => removeFamilyMember(idx)}
                      className="bg-red-500/20 text-red-500 px-4 rounded-xl hover:bg-red-500/30 transition-colors"
                      type="button"
                    >
                      ✕
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="form-card">
            <h2 className="section-title">📦 Prasad Delivery Address</h2>

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
                label={country.iso2 === "IN" ? "Pincode" : country.postal}
                placeholder={country.iso2 === "IN" ? "6-digit pincode" : `Your ${country.postal.toLowerCase()}`}
                value={form.pincode}
                onChange={(e) => handleInputChange(e, "pincode")}
                maxLength={country.iso2 === "IN" ? 6 : 12}
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
        </div>

        <div className="lg:col-span-1">
          <div className="summary-card sticky top-24">
            <h2 className="summary-title">Order Summary</h2>

            <div className="pkg-summary-item">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-bold text-lg">{pkg.title}</h3>
                  <p className="text-orange-400 text-xs font-semibold">
                    {poojaName || "4 Dham Virtual Yatra"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-xl">{money(pkg.price)}</div>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-400">
                Active Slot: {activeSlot.slotName}
                <br />
                Dates:{" "}
                {new Date(activeSlot.startDate).toLocaleDateString("en-GB")} -{" "}
                {new Date(activeSlot.endDate).toLocaleDateString("en-GB")}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider font-bold">
                  Includes:
                </p>
                <ul className="space-y-2">
                  {pkg.mainInclusions.map((inc, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">✓</span>
                      <span>
                        <strong className="text-white">{inc.dhamName}:</strong>{" "}
                        {inc.details}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Coupon Section ───────────────────────────────── */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowCouponPanel((v) => !v)}
                className="w-full flex items-center justify-between text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors py-2 border-t border-gray-700/50"
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
                        className="flex-1 bg-[#1a1c29] border-2 border-gray-700/50 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-orange-500/50 transition-colors placeholder:text-gray-500 uppercase"
                        placeholder="Enter coupon code"
                      />
                      <button
                        type="button"
                        onClick={() => applyCoupon(couponInput)}
                        className="bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold px-4 rounded-xl transition-colors"
                      >
                        Apply
                      </button>
                    </div>

                    {couponError && (
                      <p className="text-red-400 text-xs mb-2">{couponError}</p>
                    )}

                    {visibleCoupons.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-gray-400 text-[10px] uppercase tracking-wider font-bold">Available Offers</p>
                        {visibleCoupons.map((c) => (
                          <div
                            key={c.code}
                            className={`flex items-center justify-between border rounded-xl px-3 py-2 cursor-pointer transition-colors ${appliedCoupon?.code === c.code
                              ? "border-orange-500 bg-orange-500/10"
                              : "border-gray-700/50 hover:border-orange-500/40 bg-[#1a1c29]"
                              }`}
                            onClick={() => applyCoupon(c.code)}
                          >
                            <div>
                              <p className="text-orange-400 font-bold text-xs tracking-wider">{c.code}</p>
                              <p className="text-gray-400 text-[10px]">{localizeCopy(c.label)}</p>
                            </div>
                            <span className="text-green-400 text-xs font-bold">-{money(c.discount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {appliedCoupon && (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2 mt-2">
                  <div>
                    <p className="text-green-400 text-xs font-bold">✅ {appliedCoupon.code} applied!</p>
                    <p className="text-gray-400 text-[10px]">You save {money(discountAmount)}</p>
                  </div>
                  <button type="button" onClick={removeCoupon} className="text-gray-500 hover:text-red-400 text-xs transition-colors">✕ Remove</button>
                </div>
              )}
            </div>

            {/* ── Price Summary ────────────────────────────────── */}
            <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Package Price</span>
                <span>{money(pkg.price)}</span>
              </div>
              {extraCharges > 0 && (
                <div key={extraCharges} className="flex justify-between text-sm text-gray-400">
                  <span>Extra Members ({extraMembersCount} × {money(extraRate)})</span>
                  <span>+ {money(extraCharges)}</span>
                </div>
              )}
              {appliedCoupon && (
                <div className="flex justify-between text-sm text-green-400">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>- {money(discountAmount)}</span>
                </div>
              )}
              <div className="total-row pt-2 border-t border-gray-700/50">
                <span className="text-gray-300 font-medium">Total Amount</span>
                <span key={finalAmount} className="text-2xl font-bold text-white">{money(finalAmount)}</span>
              </div>
            </div>

            <p className="text-center text-gray-500 text-xs mt-4">
              🔒 100% Secure Payment via Razorpay
            </p>

          </div>
        </div>
      </div>

      {/* ── Sticky Pay Button ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3"
        style={{
          background: "linear-gradient(to top, #0d0f1a 80%, rgba(13,15,26,0))",
          backdropFilter: "blur(8px)",
          borderTop: "1px solid rgba(245, 158, 11, 0.2)",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col leading-tight shrink-0">
            <span className="text-xs font-semibold text-gray-400">Total Amount</span>
            <span key={finalAmount} className="text-2xl font-black text-white">{money(finalAmount)}</span>
          </div>

          <button
            onClick={handlePayment}
            disabled={submitting}
            type="button"
            className="pay-now-btn"
            style={{ marginTop: 0, width: 'auto', flex: '1 1 0', maxWidth: '340px' }}
          >
            {submitting ? "Processing... " : "Proceed to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
};

const YatraPaymentPage: React.FC = () => {
  return <Layout content={<YatraPaymentContent />} activeIndex="sanatan-yatra" />;
};

export default YatraPaymentPage;