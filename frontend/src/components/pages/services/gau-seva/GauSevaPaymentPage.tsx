"use client";

import React, { useEffect, useRef, useState } from "react";
import PhoneAutoFillInput from "@/components/shared/PhoneAutoFillInput";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import { createGauSevaOrderApi, verifyGauSevaPaymentApi } from "./api/gauSeva.api";
import type { OccasionType, OccasionDetails } from "./api/gauSeva.api";
import type { GauSevaPackage } from "./data/gauSevaData";
import { SPECIAL_OCCASIONS } from "./data/gauSevaData";
import { api } from "@/lib/api";
import { getVvUtm } from "@/lib/utm";
import "./GauSeva.css";
import PaymentLoader from "@/components/pages/services/chadhava/PaymentLoader";
import { gtag } from "@/lib/gtag";
import { readNavState, saveNavState } from "@/lib/nav-state";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";
import { useMoney, toInr, isValidPhone, localizeCopy } from "@/lib/currency";
import { PhoneField } from "@/components/checkout/PhoneField";

// Returns the next Wednesday date (or today if today is Wednesday)
const getNextWednesday = (): Date => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 3=Wed
  const daysUntilWed = day <= 3 ? 3 - day : 7 - (day - 3);
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilWed);
  next.setHours(0, 0, 0, 0);
  return next;
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

declare global {
  interface Window { Razorpay: any; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type GauSevaPaymentState = {
  pkg: GauSevaPackage;
  quantity?: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GAU_SEVA_COUPONS = [
  { code: "GOSEVA51", label: "Special ₹51 Off", discount: 51, minPrice: 299, visible: true },
  { code: "GAUMATA", label: "Gau Mata ₹111 Off", discount: 111, minPrice: 1111, visible: true },
  { code: "TESTGAU1", label: "Test ₹1", discount: 999999, minPrice: 0, visible: false },
  { code: "TYAGI@19", label: "Special Testing Code", discount: 999999, minPrice: 0, visible: false },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const InlineError = ({ msg }: { msg?: string }) => (
  <AnimatePresence mode="wait">
    {msg ? (
      <motion.p
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="text-red-500 text-xs mt-1 flex items-center gap-1"
      >
        ⚠️ {msg}
      </motion.p>
    ) : null}
  </AnimatePresence>
);

const Field = ({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) => (
  <div className="mb-3">
    <label className="block text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className={`rounded-xl border-2 overflow-hidden transition-colors ${error ? "border-red-400" : "border-orange-200 focus-within:border-orange-400"}`}>
      {children}
    </div>
    <InlineError msg={error} />
  </div>
);

const INPUT_CLS = "w-full py-2.5 px-3.5 outline-none text-sm bg-white text-gray-800 placeholder:text-gray-400";

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

// ─── Main Component ───────────────────────────────────────────────────────────

const GauSevaPaymentPage = () => {
  /**
   * Every price on this page renders through `money()` — the India list price
   * converted into the devotee's own currency for DISPLAY only. The amount POSTED
   * to the server stays the India list total; the server owns the markup.
   */
  const { money, country } = useMoney();
  const router = useRouter();

  // react-router carried this via location.state; in Next it comes from sessionStorage.
  const [state, setState] = useState<GauSevaPaymentState | undefined>(undefined);
  const [stateLoaded, setStateLoaded] = useState(false);

  useEffect(() => {
    setState(readNavState<GauSevaPaymentState>("gau-seva-payment"));
    setStateLoaded(true);
  }, []);

  const pkg = state?.pkg;
  const initQty = Math.max(1, state?.quantity ?? 1);

  const [form, setForm] = useState({
    name: "", whatsapp: "", email: "", gotra: "", specialMessage: "",
  });
  const [occasionType, setOccasionType] = useState<OccasionType>("none");
  const [occasionDetails, setOccasionDetails] = useState<OccasionDetails>({});
  const [quantity, setQuantity] = useState(initQty);

  // Sync quantity once the persisted state hydrates
  useEffect(() => {
    setQuantity(Math.max(1, state?.quantity ?? 1));
  }, [state]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pageError, setPageError] = useState("");

  const nextWednesday = getNextWednesday();
  const selectedOccasion = SPECIAL_OCCASIONS.find((o) => o.id === occasionType) ?? null;
  const occasionPremium = selectedOccasion?.premium ?? 0;

  // Coupons
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<(typeof GAU_SEVA_COUPONS)[number] | null>(null);
  const [couponError, setCouponError] = useState("");
  const [showCouponPanel, setShowCouponPanel] = useState(false);

  // view_item on page load
  const viewTrackedRef = useRef(false);
  useEffect(() => {
    if (!pkg || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    const fbq = (window as any).fbq;
    if (typeof fbq === "function") {
      try {
        fbq("track", "ViewContent", {
          content_ids: [pkg.id],
          content_name: pkg.name,
          content_category: "Gau Seva",
          value: toInr(pkg.price),
          currency: "INR",
        });
      } catch (e) { console.warn("fbq track failed", e); }
    }
    gtag("event", "view_item", {
      currency: "INR",
      value: toInr(pkg.price),
      items: [{
        item_id: pkg.id,
        item_name: pkg.name,
        item_category: "Gau Seva",
        price: pkg.price,
        quantity: initQty,
      }],
    });
  }, [pkg, initQty]);

  // Redirect away when no package was carried over
  useEffect(() => {
    if (!stateLoaded) return;
    if (!pkg) router.push("/services/gau-seva");
  }, [stateLoaded, pkg, router]);

  // Prefill from localStorage
  useEffect(() => {
    try {
      const ud = JSON.parse(localStorage.getItem("userDetails") || "{}");
      const u = ud?.user;
      if (!u) return;
      let ph = (u.phone || "").replace(/\D/g, "");
      if (ph.startsWith("91") && ph.length === 12) ph = ph.slice(2);
      const fn = u.firstname || u.firstName || u.given_name || "";
      const ln = u.lastname || u.lastName || u.family_name || "";
      const full = `${fn} ${ln}`.trim() || u.name || "";
      setForm((prev) => ({
        ...prev,
        name: full || prev.name,
        whatsapp: ph || prev.whatsapp,
        email: u.email || prev.email,
        gotra: u.gotra || prev.gotra,
      }));
    } catch { /* ignore */ }
  }, []);

  // Pricing
  const packagePrice = pkg?.price ?? 0;
  const baseTotal = (packagePrice + occasionPremium) * quantity;
  const visibleCoupons = GAU_SEVA_COUPONS.filter((c) => c.visible && baseTotal >= c.minPrice);
  const discountAmt = appliedCoupon
    ? appliedCoupon.discount === 999999
      ? baseTotal - 1
      : Math.min(appliedCoupon.discount, baseTotal - 1)
    : 0;
  const finalAmount = Math.max(baseTotal - discountAmt, 1);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Full name required";
    if (!isValidPhone(form.whatsapp, country)) e.whatsapp = "Valid WhatsApp number required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const applyCoupon = (code: string) => {
    const found = GAU_SEVA_COUPONS.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!found) { setCouponError("Invalid coupon code."); return; }
    if (found.visible && baseTotal < found.minPrice) {
      setCouponError(`Valid for orders ${money(found.minPrice)}+`); return;
    }
    setAppliedCoupon(found); setCouponError(""); setCouponInput(found.code); setShowCouponPanel(false);
  };

  const handlePayment = async () => {
    if (!pkg) return;
    if (!validate()) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setSubmitting(true); setPageError("");

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) { setPageError("Could not load payment gateway. Please try again."); setSubmitting(false); return; }

      // PhoneField/PhoneAutoFillInput already cap this at the right length
      // for the active country; slice(-10) would truncate a longer foreign
      // number instead of doing nothing.
      const purePhone = form.whatsapp.replace(/\D/g, "");

      const orderData = await createGauSevaOrderApi({
        packageId: pkg.id,
        packageName: pkg.name,
        packagePrice,
        quantity,
        devoteeName: form.name.trim(),
        whatsapp: purePhone,
        email: form.email.trim(),
        gotra: form.gotra.trim(),
        occasionType,
        occasionDetails: occasionType !== "none" ? occasionDetails : undefined,
        occasionPremium: occasionType !== "none" ? occasionPremium : 0,
        tag: selectedOccasion ? `${selectedOccasion.name} - ${form.name.trim()}` : "",
        specialMessage: form.specialMessage.trim(),
        vv_utm: (getVvUtm() as unknown as Record<string, string>) || {
          utm_source: "organic",
          utm_medium: "none",
          utm_campaign: "none",
          utm_content: "none",
          utm_term: "none",
        },
      });

      // Background: register user
      const eff = form.email.trim() || `${purePhone}@gmail.com`;
      api.post(`/phone-login-or-register`, {
        phone: purePhone, email: eff, name: form.name.trim(), gotra: form.gotra.trim(),
      }).then((r) => {
        localStorage.setItem("userDetails", JSON.stringify({ user: r.data.user, token: r.data.token }));
      }).catch(() => { });

      // Store for success page
      localStorage.setItem("gauSevaBookingId", orderData.bookingId);

      const razorpayOptions = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Vedic Vaibhav Gaushala",
        description: `Gau Seva — ${pkg.name}`,
        order_id: orderData.razorpayOrderId,
        prefill: { name: form.name.trim(), contact: purePhone, email: eff },
        theme: { color: "#ff6b35" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setVerifying(true);
          try {
            // Payment is already captured here — retry through the webhook race
            // rather than reporting a confirmation hiccup as a failed payment.
            const outcome = await verifyPaymentWithRetry({
              attempt: () =>
                verifyGauSevaPaymentApi({
                  bookingId: orderData.bookingId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
            });
            if (outcome.status === "declined") throw new Error(outcome.message);
            // Purchase / Meta Purchase are NOT sent here — the success page this
            // redirects to (GauSevaPaymentSuccess) is the single source. Firing
            // in both places double-counted every booking, and the two used
            // different transaction ids (razorpay_payment_id here vs bookingId
            // there) so GA4 could not dedupe them into one.
            saveNavState("gau-seva-success", {
              bookingId: orderData.bookingId,
              pkg,
              devoteeName: form.name.trim(),
              whatsapp: purePhone,
              amount: finalAmount,
              // The receipt on the success page must show what the card was
              // ACTUALLY billed, and the dial code the number was entered
              // under — neither should be re-derived from today's picker.
              currency: orderData.currency,
              chargedAmount: orderData.chargedAmount,
              dialCode: country.dial,
            });
            router.replace("/services/gau-seva/success");
          } catch {
            const fbqFn = (window as any).fbq;
            if (typeof fbqFn === "function") {
              try {
                fbqFn("track", "PaymentInfoFailed", {
                  content_ids: [pkg.id],
                  content_name: pkg.name,
                  value: toInr(finalAmount),
                  currency: "INR",
                });
              } catch (e) { console.warn("fbq track failed", e); }
            }
            gtag("event", "payment_failed", {
              currency: "INR",
              value: toInr(finalAmount),
              items: [{ item_id: pkg.id, item_name: pkg.name }],
            });
            saveNavState("gau-seva-failure", { pkg });
            router.replace("/services/gau-seva/failure");
          } finally {
            setVerifying(false);
            setSubmitting(false);
          }
        },
        modal: { ondismiss: () => setSubmitting(false) },
      };

      const fbqFn = (window as any).fbq;
      if (typeof fbqFn === "function") {
        try {
          fbqFn("track", "InitiateCheckout", {
            content_ids: [pkg.id],
            content_name: pkg.name,
            content_category: "Gau Seva",
            value: toInr(finalAmount),
            currency: "INR",
            num_items: quantity,
          });
        } catch (e) { console.warn("fbq track failed", e); }
      }
      gtag("event", "begin_checkout", {
        currency: "INR",
        value: toInr(finalAmount),
        items: [{
          item_id: pkg.id,
          item_name: pkg.name,
          item_category: "Gau Seva",
          price: finalAmount,
          quantity,
        }],
      });

      new window.Razorpay(razorpayOptions).open();
    } catch (err: any) {
      setPageError(err?.response?.data?.message || "Unable to initiate payment. Please try again.");
      const fbqFn = (window as any).fbq;
      if (typeof fbqFn === "function") {
        try {
          fbqFn("track", "PaymentInfoFailed", {
            content_ids: [pkg?.id],
            content_name: pkg?.name,
            value: toInr(finalAmount),
            currency: "INR",
          });
        } catch (e) { console.warn("fbq track failed", e); }
      }
      gtag("event", "payment_failed", {
        currency: "INR",
        value: toInr(finalAmount),
        items: [{ item_id: pkg?.id, item_name: pkg?.name }],
      });
      setSubmitting(false);
    }
  };

  if (!pkg) return null;

  return (
    <div className="gs-page min-h-screen">
      {verifying && <PaymentLoader />}
      <Navbar activeIndex="services" />

      <div className="pt-16 pb-10 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

          {/* Back */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-semibold mt-4 mb-5"
            style={{ color: "#ff6b35" }}
          >
            ← Back
          </button>

          <h1 className="text-xl font-extrabold text-gray-900 mb-1">Complete Your Booking</h1>
          <p className="text-sm text-gray-500 mb-5">Gau Seva — {pkg.name}</p>

          {pageError && (
            <div className="rounded-xl bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-700 mb-4">
              ⚠️ {pageError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Form */}
            <div>
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4">
                <h2 className="font-bold text-sm text-gray-700 mb-3 uppercase tracking-wide">Your Details</h2>

                <Field label="Full Name" required error={errors.name}>
                  <input className={INPUT_CLS} placeholder="As you want on certificate" value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </Field>

                <div className="mb-3">
                  <label className="block text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  {country.iso2 === "IN" ? (
                    <PhoneAutoFillInput
                      value={form.whatsapp}
                      onChange={(val) => setForm((p) => ({ ...p, whatsapp: val }))}
                      onUserFetched={({ name, email, gotra }) =>
                        setForm((p) => ({
                          ...p,
                          name: name || p.name,
                          email: email || p.email,
                          gotra: gotra || p.gotra,
                        }))
                      }
                      error={errors.whatsapp}
                    />
                  ) : (
                    <PhoneField
                      value={form.whatsapp}
                      onChange={(val) => setForm((p) => ({ ...p, whatsapp: val }))}
                      error={errors.whatsapp}
                    />
                  )}
                </div>

                <Field label="Email (Optional)">
                  <input className={INPUT_CLS} placeholder="For e-certificate" type="email" value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </Field>

                <Field label="Gotra (Optional)">
                  <input className={INPUT_CLS} placeholder="Your family gotra" value={form.gotra}
                    onChange={(e) => setForm((p) => ({ ...p, gotra: e.target.value }))} />
                </Field>

                {/* Occasion selector */}
                <div className="mb-3">
                  <label className="block text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                    Special Occasion <span className="text-gray-400 font-normal normal-case">(Optional · adds premium)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ id: "none" as OccasionType, name: "No Occasion", icon: "🐄", premium: 0 }, ...SPECIAL_OCCASIONS].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => { setOccasionType(o.id); setOccasionDetails({}); }}
                        className={`rounded-xl border-2 px-2 py-2 text-xs font-semibold text-left transition-colors ${occasionType === o.id
                          ? "border-orange-400 bg-orange-50 text-orange-800"
                          : "border-orange-100 bg-white text-gray-600 hover:border-orange-200"
                          }`}
                      >
                        <span className="mr-1">{o.icon}</span>
                        {o.name}
                        {o.premium > 0 && (
                          <span className="block text-orange-500 font-bold text-xs mt-0.5">+{money(o.premium)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic occasion detail fields */}
                <AnimatePresence>
                  {occasionType !== "none" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 mb-3 space-y-2">
                        <p className="text-xs font-bold text-orange-700 mb-1">
                          {selectedOccasion?.icon} {selectedOccasion?.name} Details
                        </p>

                        {(occasionType === "birthday") && (
                          <input
                            className={`${INPUT_CLS} rounded-xl border border-orange-200`}
                            placeholder="Name of the birthday person"
                            value={occasionDetails.personName || ""}
                            onChange={(e) => setOccasionDetails((p) => ({ ...p, personName: e.target.value }))}
                          />
                        )}

                        {occasionType === "anniversary" && (
                          <>
                            <input
                              className={`${INPUT_CLS} rounded-xl border border-orange-200`}
                              placeholder="Partner 1 name"
                              value={occasionDetails.personName || ""}
                              onChange={(e) => setOccasionDetails((p) => ({ ...p, personName: e.target.value }))}
                            />
                            <input
                              className={`${INPUT_CLS} rounded-xl border border-orange-200`}
                              placeholder="Partner 2 name"
                              value={occasionDetails.partnerName || ""}
                              onChange={(e) => setOccasionDetails((p) => ({ ...p, partnerName: e.target.value }))}
                            />
                          </>
                        )}

                        {occasionType === "newborn" && (
                          <input
                            className={`${INPUT_CLS} rounded-xl border border-orange-200`}
                            placeholder="Newborn's name (if given)"
                            value={occasionDetails.newbornName || ""}
                            onChange={(e) => setOccasionDetails((p) => ({ ...p, newbornName: e.target.value }))}
                          />
                        )}

                        {occasionType === "pitru_paksha" && (
                          <>
                            <input
                              className={`${INPUT_CLS} rounded-xl border border-orange-200`}
                              placeholder="Ancestor's name"
                              value={occasionDetails.pitruName || ""}
                              onChange={(e) => setOccasionDetails((p) => ({ ...p, pitruName: e.target.value }))}
                            />
                            <input
                              className={`${INPUT_CLS} rounded-xl border border-orange-200`}
                              placeholder="Relation (e.g. Father, Grandfather)"
                              value={occasionDetails.pitruRelation || ""}
                              onChange={(e) => setOccasionDetails((p) => ({ ...p, pitruRelation: e.target.value }))}
                            />
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Field label="Special Message (Optional)">
                  <input className={INPUT_CLS} placeholder="Sankalp or wish for Gau Mata" value={form.specialMessage}
                    onChange={(e) => setForm((p) => ({ ...p, specialMessage: e.target.value }))} />
                </Field>
              </div>
            </div>

            {/* Right: Summary */}
            <div className="space-y-3">
              {/* Next seva date banner */}
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "#fff8e1" }}>
                <span className="text-2xl flex-shrink-0">📅</span>
                <div>
                  <p className="text-xs font-bold text-amber-800">Next Feeding Day</p>
                  <p className="text-sm font-semibold text-amber-900">{formatDate(nextWednesday)}</p>
                  <p className="text-xs text-amber-700">Photo &amp; certificate sent to WhatsApp after feeding</p>
                </div>
              </div>

              {/* Package summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4">
                <h2 className="font-bold text-sm text-gray-700 mb-3 uppercase tracking-wide">Order Summary</h2>

                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-dashed border-orange-100">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl flex-shrink-0">🐄</div>
                  <div>
                    <p className="font-bold text-sm text-gray-800">{pkg.name}</p>
                    <p className="text-xs text-gray-400 gs-devanagari">{pkg.nameHindi}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pkg.duration} · {pkg.cowCount} {pkg.cowCount > 1 ? "cows" : "cow"}</p>
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Quantity</span>
                  <div className="flex items-center gap-3 bg-orange-50 rounded-xl px-3 py-1.5 border border-orange-200">
                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-7 h-7 rounded-full bg-white border border-orange-300 font-bold text-lg flex items-center justify-center"
                      style={{ color: "#ff6b35" }}>−</button>
                    <span className="font-bold text-base text-gray-800 min-w-[20px] text-center">{quantity}</span>
                    <button type="button" onClick={() => setQuantity(quantity + 1)}
                      className="w-7 h-7 rounded-full bg-white border border-orange-300 font-bold text-lg flex items-center justify-center"
                      style={{ color: "#ff6b35" }}>+</button>
                  </div>
                </div>

                {/* Pricing rows */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Package × {quantity}</span>
                    <span className="font-medium text-gray-700">{money(packagePrice * quantity)}</span>
                  </div>
                  {occasionPremium > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>{selectedOccasion?.icon} {selectedOccasion?.name} × {quantity}</span>
                      <span>+ {money(occasionPremium * quantity)}</span>
                    </div>
                  )}
                  {discountAmt > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon ({appliedCoupon?.code})</span>
                      <span>− {money(discountAmt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-dashed border-orange-100">
                    <span className="font-bold text-gray-800">Total</span>
                    <span className="font-black text-lg" style={{ color: "#ff6b35" }}>{money(finalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Coupon */}
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4">
                <button
                  type="button"
                  onClick={() => setShowCouponPanel((p) => !p)}
                  className="w-full flex items-center justify-between text-sm font-semibold"
                  style={{ color: "#ff6b35" }}
                >
                  <span>🏷️ Apply Coupon</span>
                  <motion.span animate={{ rotate: showCouponPanel ? 180 : 0 }}>▾</motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {showCouponPanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2">
                        {visibleCoupons.map((c) => (
                          <button key={c.code} type="button"
                            onClick={() => applyCoupon(c.code)}
                            className="w-full text-left rounded-xl border border-dashed border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold hover:bg-orange-100 transition-colors"
                          >
                            <span className="text-orange-700 font-mono">{c.code}</span>
                            <span className="text-gray-500 ml-2">— {localizeCopy(c.label)}</span>
                          </button>
                        ))}
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded-xl border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                            placeholder="Enter coupon code"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          />
                          <button type="button" onClick={() => applyCoupon(couponInput)}
                            className="shrink-0 whitespace-nowrap px-5 py-2 rounded-xl text-white text-sm font-bold" style={{ background: "#ff6b35" }}>
                            Apply
                          </button>
                        </div>
                        {couponError && <p className="text-red-500 text-xs">{couponError}</p>}
                        {appliedCoupon && (
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                            <span className="text-green-700 text-xs font-semibold">✓ {appliedCoupon.code} applied</span>
                            <button type="button" onClick={() => { setAppliedCoupon(null); setCouponInput(""); }}
                              className="text-red-500 text-xs font-bold">Remove</button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Proof note */}
              <div className="rounded-2xl p-3 flex items-start gap-2.5 text-sm" style={{ background: "#e8f5e9" }}>
                <span className="text-xl flex-shrink-0">📸</span>
                <p className="text-green-800 text-xs">
                  Photo &amp; certificate sent to <strong>+{country.dial} {form.whatsapp || "your WhatsApp"}</strong> after feeding on <strong>{formatDate(nextWednesday)}</strong>.
                </p>
              </div>

              {/* Pay button */}
              <button
                onClick={handlePayment}
                disabled={submitting}
                className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-md active:scale-95 transition-transform disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#43a047,#2d7a4e)" }}
              >
                {submitting ? "Opening Payment…" : ` Pay ${money(finalAmount)}`}
              </button>
              <p className="text-xs text-center text-gray-400">Secured by Razorpay · UPI · Cards · Net Banking</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GauSevaPaymentPage;
