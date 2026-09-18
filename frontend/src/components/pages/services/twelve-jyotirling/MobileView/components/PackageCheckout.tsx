"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { readNavState, saveNavState } from "@/lib/nav-state";
import { getVvUtm } from "@/lib/utm";
import { IJyotirlinga } from "../../index";
import { gtag } from "@/lib/gtag";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type LocationState = {
  plan: SubscribablePlan;
  selectedJyotirlinga: IJyotirlinga[];
  allJyotirlinga: IJyotirlinga[];
  initialBillingMode?: "upfront" | "autopay";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FAMILY_MEMBER_ADDON_PER_MEMBER = 99;
const FREE_FAMILY_COUNT: Record<string, number> = {
  Basic: 2,
  Intermediate: 3,
  Advance: 4,
};
const AUTOPAY_MARKUP_PERCENT = 6;
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const EASEBUZZ_SCRIPT_SRC =
  "https://ebz-static.s3.ap-south-1.amazonaws.com/easecheckout/easebuzz-checkout.js";

// ─── Script Loaders ───────────────────────────────────────────────────────────

const loadScript = (src: string): Promise<boolean> =>
  new Promise((resolve) => {
    if (
      (src === RAZORPAY_SCRIPT_SRC && (window as any).Razorpay) ||
      (src === EASEBUZZ_SCRIPT_SRC && (window as any).EasebuzzCheckout)
    ) {
      resolve(true);
      return;
    }
    const existing = document.querySelector(
      `script[src="${src}"]`
    ) as HTMLScriptElement | null;
    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      s.setAttribute("data-loaded", "true");
      resolve(true);
    };
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

// ─── Facebook Pixel helper ────────────────────────────────────────────────────

const fbqTrack = (event: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  const fbq = (window as any).fbq;
  if (typeof fbq === "function") {
    try {
      fbq("track", event, params || {});
    } catch { }
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PackageCheckout: React.FC = () => {
  const router = useRouter();

  // react-router carried this via location.state; in Next it comes from sessionStorage.
  const [state, setState] = useState<LocationState | null>(null);
  const [stateLoaded, setStateLoaded] = useState(false);

  useEffect(() => {
    const stored = readNavState<LocationState>("12-jyotirlinga-start-payment") ?? null;
    setState(stored);
    if (stored?.initialBillingMode) setBillingMode(stored.initialBillingMode);
    setStateLoaded(true);
  }, []);

  const plan = state?.plan ?? null;
  const selectedJyotirlinga = state?.selectedJyotirlinga ?? [];

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    gotra: "",
    mobile: "",
    email: "",
  });
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    pinCode: "",
  });
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [dontKnowGotra, setDontKnowGotra] = useState(false);
  const [billingMode, setBillingMode] = useState<"upfront" | "autopay">("upfront");

  // Coupon
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [toastMsg, setToastMsg] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);

  const lastFetchedPhoneRef = useRef<string>("");
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pre-fill from localStorage ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("userDetails");
      if (raw) {
        const { user } = JSON.parse(raw);
        if (user) {
          setFormData((p) => ({
            ...p,
            name: user.name || user.fullName || "",
            gotra: user.gotra || "",
            mobile: user.phone || user.whatsapp || "",
            email: user.email || "",
          }));
          setAddress((p) => ({
            ...p,
            line1: user.address1 || user.address || "",
            city: user.city || "",
            state: user.state || "",
            pinCode: user.pincode || "",
          }));
        }
      }
    } catch { }

    // ViewContent pixel
    if (plan) {
      fbqTrack("ViewContent", {
        content_ids: [plan.id || "12-jyotirlinga"],
        content_name: `12 Jyotirlinga - ${plan.name}`,
        content_category: "12 Jyotirlinga Subscription",
        content_type: "product",
        num_items: selectedJyotirlinga.length,
        currency: "INR",
      });
      gtag("event", "view_item", {
        currency: "INR",
        items: [{
          item_id: plan.id || "12-jyotirlinga",
          item_name: `12 Jyotirlinga - ${plan.name}`,
          item_category: "12 Jyotirlinga Subscription",
          quantity: selectedJyotirlinga.length || 1,
        }],
      });
    }
  }, []);

  // ── Auto-fetch user on valid phone ──────────────────────────────────────────
  const fetchUserDetails = async (phone: string) => {
    try {
      const { data } = await api.get(
        `/get-user-by-phone/${phone}`
      );
      const user = data?.user || data;
      if (!user) return;
      const fName = user.firstname || user.firstName || "";
      const lName = user.lastname || user.lastName || "";
      let fullName = `${fName} ${lName}`.trim();
      if (!fullName) fullName = user.name || user.fullName || "";
      setFormData((p) => ({
        ...p,
        name: fullName || p.name,
        gotra: user.gotra || p.gotra,
        email: user.email || p.email,
      }));
      setAddress((p) => ({
        ...p,
        line1: user.address1 || user.address || p.line1,
        city: user.city || p.city,
        state: user.state || p.state,
        pinCode: user.pincode || p.pinCode,
      }));
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setFormData((p) => ({ ...p, name: "", gotra: "", email: "" }));
        setAddress({ line1: "", line2: "", city: "", state: "", pinCode: "" });
      }
    }
  };

  useEffect(() => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    const phone = formData.mobile.trim();
    if (!/^[6789]\d{9}$/.test(phone) || phone === lastFetchedPhoneRef.current)
      return;
    lastFetchedPhoneRef.current = phone;
    fetchTimerRef.current = setTimeout(() => fetchUserDetails(phone), 500);
    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    };
  }, [formData.mobile]);

  // ── Pricing ─────────────────────────────────────────────────────────────────
  const safePlan = plan ?? {
    id: "",
    name: "",
    nameHindi: "",
    planId: "Basic" as const,
    pricePercentage: 0,
    yearlyPercentageDiscount: 0,
  };

  const selectedCount = selectedJyotirlinga.length;
  const freeFamilyCount = FREE_FAMILY_COUNT[safePlan.planId] ?? 0;

  const basePricing = useMemo(() => {
    const totalBase = selectedJyotirlinga.reduce(
      (s, j) => s + (j.price || 0),
      0
    );
    const planAdjustedBase = Math.round(
      (totalBase * safePlan.pricePercentage) / 100
    );
    const paidFamilyCount = familyMembers.filter(
      (m, i) => i >= freeFamilyCount && (m.name.trim() || m.gotra.trim())
    ).length;
    const familyAddOnTotal = paidFamilyCount * FAMILY_MEMBER_ADDON_PER_MEMBER;

    const upfrontDiscountPercent =
      selectedCount > 1 ? safePlan.yearlyPercentageDiscount : 0;
    const upfrontDiscountAmount = Math.round(
      (planAdjustedBase * upfrontDiscountPercent) / 100
    );
    const upfrontTotalOriginal = Math.max(
      planAdjustedBase - upfrontDiscountAmount + familyAddOnTotal,
      0
    );

    const autopayBase = planAdjustedBase + familyAddOnTotal;
    const autopayWithMarkup =
      selectedCount > 1
        ? Math.round((autopayBase * (100 + AUTOPAY_MARKUP_PERCENT)) / 100)
        : 0;
    const autopayMonthlyAmount =
      selectedCount > 1 ? Math.ceil(autopayWithMarkup / selectedCount) : 0;

    return {
      planAdjustedBase,
      familyAddOnTotal,
      upfrontDiscountPercent,
      upfrontDiscountAmount,
      upfrontTotalOriginal,
      autopayMonthlyAmount,
      autopayCycles: selectedCount,
    };
  }, [selectedJyotirlinga, safePlan, familyMembers, freeFamilyCount, selectedCount]);

  const finalAmount = useMemo(() => {
    if (billingMode === "upfront" && appliedCoupon) return 1;
    return billingMode === "upfront"
      ? basePricing.upfrontTotalOriginal
      : basePricing.autopayMonthlyAmount;
  }, [basePricing, billingMode, appliedCoupon]);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = (
    fd = formData,
    addr = address,
    isSubmitting = false
  ): { valid: boolean; errs: Record<string, string>; aErrs: Record<string, string> } => {
    const errs: Record<string, string> = {};
    if (!fd.name.trim()) errs.name = "Full name is required.";
    if (!dontKnowGotra && !fd.gotra.trim())
      errs.gotra = "Gotra is required, or check 'Don't know'.";
    if (!fd.mobile.trim()) {
      errs.mobile = "WhatsApp number is required.";
    } else if (!/^[6789]\d{9}$/.test(fd.mobile.trim())) {
      errs.mobile = "Enter a valid 10-digit Indian mobile number.";
    }
    if (fd.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email)) {
      errs.email = "Enter a valid email address.";
    }

    const aErrs: Record<string, string> = {};
    if (!addr.line1.trim()) aErrs.line1 = "Address is required.";
    if (!addr.city.trim()) aErrs.city = "City is required.";
    if (!addr.state.trim()) aErrs.state = "State is required.";
    if (!addr.pinCode.trim()) {
      aErrs.pinCode = "PIN code is required.";
    } else if (!/^\d{6}$/.test(addr.pinCode.trim())) {
      aErrs.pinCode = "Enter a valid 6-digit PIN code.";
    }

    if (isSubmitting || isSubmitted) {
      setErrors(errs);
      setAddressErrors(aErrs);
    }
    return { valid: Object.keys(errs).length === 0 && Object.keys(aErrs).length === 0, errs, aErrs };
  };

  // ── Coupon ───────────────────────────────────────────────────────────────────
  const handleApplyCoupon = () => {
    if (!couponInput.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }
    const code = couponInput.trim().toUpperCase();
    if (code === "VVJATIN@100" || code === "TYAGI@19") {
      setAppliedCoupon({ code: couponInput.trim(), discount: 0 });
      setCouponError("");
    } else {
      setCouponError("Invalid coupon code.");
    }
  };

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = (text: string, type: "error" | "success" = "error") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  // ── Family members ───────────────────────────────────────────────────────────
  const maxFamilyMembers = 6;
  const addFamilyMember = () => {
    if (familyMembers.length < maxFamilyMembers) {
      setFamilyMembers([...familyMembers, { name: "", gotra: "" }]);
    }
  };
  const removeFamilyMember = (i: number) => {
    setFamilyMembers(familyMembers.filter((_, idx) => idx !== i));
  };
  const updateMember = (
    i: number,
    field: keyof FamilyMember,
    value: string
  ) => {
    const next = [...familyMembers];
    next[i] = { ...next[i], [field]: value };
    setFamilyMembers(next);
  };

  // ── Payment ──────────────────────────────────────────────────────────────────
  const openEasebuzzCheckout = async (data: any) => {
    const loaded = await loadScript(EASEBUZZ_SCRIPT_SRC);
    if (!loaded || !(window as any).EasebuzzCheckout) {
      throw new Error("Easebuzz could not be loaded.");
    }
    const ebz = new (window as any).EasebuzzCheckout(data.key, data.env);
    ebz.initiatePayment({
      access_key: data.access_key,
      onResponse: async (response: any) => {
        if (response.status === "success") {
          try {
            await api.post(
              "/jyotirlinga-subscription/verify-payment",
              { ...response, orderID: data.orderID, gateway: "easebuzz" }
            );
            gtag("event", "purchase", {
              transaction_id: response.easepayid || data.orderID,
              value: finalAmount,
              currency: "INR",
              affiliation: "Vedic Vaibhav",
              items: [{
                item_id: safePlan.id || "12-jyotirlinga",
                item_name: `12 Jyotirlinga - ${safePlan.name}`,
                item_category: "12 Jyotirlinga Subscription",
                price: finalAmount,
                quantity: selectedJyotirlinga.length || 1,
              }],
            });
            localStorage.setItem("last_jyotirlinga_booking", data.orderID);
            saveNavState("12-jyotirlinga-success", {
              bookingId: data.orderID,
              planName: safePlan.name,
              amount: finalAmount,
              selectedCount,
              paymentMode: billingMode,
            });
            router.replace("/services/12-jyotirlinga/success");
          } catch (err: any) {
            fbqTrack("PaymentInfoFailed", {
              content_ids: [safePlan.id || "12-jyotirlinga"],
              value: finalAmount,
              currency: "INR",
            });
            gtag("event", "payment_failed", {
              currency: "INR",
              value: finalAmount,
              items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga - ${safePlan.name}` }],
            });
            showToast(
              err?.response?.data?.message ||
              "Payment received but booking confirmation failed. Contact support.",
              "error"
            );
          } finally {
            window.dispatchEvent(new CustomEvent("bookings-updated"));
            setSubmitting(false);
          }
        } else {
          setSubmitting(false);
          fbqTrack("PaymentInfoFailed", {
            content_ids: [safePlan.id || "12-jyotirlinga"],
            value: finalAmount,
            currency: "INR",
          });
          gtag("event", "payment_failed", {
            currency: "INR",
            value: finalAmount,
            items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga - ${safePlan.name}` }],
          });
          showToast("Payment failed or cancelled.", "error");
        }
      },
    });
  };

  const openRazorpayCheckout = async (options: any) => {
    const loaded = await loadScript(RAZORPAY_SCRIPT_SRC);
    if (!loaded || !(window as any).Razorpay) {
      throw new Error(
        "Razorpay could not be loaded. Please disable your ad-blocker and retry."
      );
    }
    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", (resp: any) => {
      setSubmitting(false);
      fbqTrack("PaymentInfoFailed", {
        content_ids: [safePlan.id || "12-jyotirlinga"],
        value: finalAmount,
        currency: "INR",
      });
      gtag("event", "payment_failed", {
        currency: "INR",
        value: finalAmount,
        items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga - ${safePlan.name}` }],
      });
      showToast(
        resp?.error?.description ||
        resp?.error?.reason ||
        "Payment failed.",
        "error"
      );
    });
    rzp.open();
  };

  const handlePay = async () => {
    setIsSubmitted(true);
    const { valid, errs, aErrs } = validate(formData, address, true);
    if (!valid) {
      // Fields are checked in on-screen order so the popup names whichever
      // one the devotee hits first, instead of a generic "fix the form".
      const firstError =
        errs.mobile ||
        errs.name ||
        errs.gotra ||
        errs.email ||
        aErrs.line1 ||
        aErrs.city ||
        aErrs.pinCode ||
        aErrs.state;
      showToast(firstError || "Please fill in all required fields.", "error");
      return;
    }
    if (!plan) return;

    const filledFamily = familyMembers
      .map((m) => ({ name: m.name.trim(), gotra: m.gotra.trim() }))
      .filter((m) => m.name || m.gotra);

    const payload = {
      name: formData.name.trim(),
      mobile: formData.mobile.trim(),
      email: formData.email.trim(),
      gotra: dontKnowGotra ? "Sadharana" : formData.gotra.trim(),
      planId: plan.planId,
      paymentMode: billingMode,
      jyotirlingaIds: selectedJyotirlinga.map((j) => j._id),
      familyMembers: filledFamily,
      ...(billingMode === "upfront" && appliedCoupon
        ? { discountedAmount: finalAmount }
        : {}),
      deliveryAddress: {
        name: formData.name.trim() || "Devotee",
        mobile: formData.mobile.trim(),
        line1: address.line1.trim(),
        line2: address.line2.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        pinCode: address.pinCode.trim(),
      },
      vv_utm: getVvUtm(),
    };

    setSubmitting(true);

    // Silent auto-login
    try {
      const { data: authData } = await api.post(
        "/phone-login-or-register",
        {
          phone: formData.mobile.trim(),
          name: formData.name.trim(),
          gotra: dontKnowGotra ? "Sadharana" : formData.gotra.trim(),
          address1: address.line1.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          pincode: address.pinCode.trim(),
          country: "India",
        }
      );
      localStorage.setItem(
        "userDetails",
        JSON.stringify({ user: authData.user, token: authData.token })
      );
    } catch { }

    // InitiateCheckout pixel
    fbqTrack("InitiateCheckout", {
      content_ids: [plan.id || "12-jyotirlinga"],
      content_name: `12 Jyotirlinga - ${plan.name}`,
      content_category: "12 Jyotirlinga Subscription",
      content_type: "product",
      value: finalAmount,
      currency: "INR",
      num_items: selectedJyotirlinga.length,
    });
    gtag("event", "begin_checkout", {
      currency: "INR",
      value: finalAmount,
      items: [{
        item_id: plan.id || "12-jyotirlinga",
        item_name: `12 Jyotirlinga - ${plan.name}`,
        item_category: "12 Jyotirlinga Subscription",
        price: finalAmount,
        quantity: selectedJyotirlinga.length || 1,
      }],
    });

    try {
      const { data } = await api.post(
        "/jyotirlinga-subscription/initiate-payment",
        { ...payload, gateway: "razorpay" }
      );

      if (data.gateway === "easebuzz") {
        await openEasebuzzCheckout(data);
        return;
      }

      const commonOptions: any = {
        key: data.key,
        name: "Vedic Vaibhav",
        prefill: {
          name: formData.name.trim(),
          contact: formData.mobile.trim(),
          email:
            formData.email.trim() ||
            `${formData.mobile.trim()}@gmail.com`,
        },
        readonly: { contact: true, email: true, name: false },
        theme: { color: "#c89b3c" },
        modal: {
          ondismiss: () => setSubmitting(false),
          confirm_close: true,
        },
      };

      if (data.mode === "upfront") {
        await openRazorpayCheckout({
          ...commonOptions,
          description: `${plan.name} — Pay Full Amount`,
          amount: data.amount,
          currency: data.currency,
          order_id: data.razorpayOrderId,
          handler: async (rzpResp: any) => {
            setVerifying(true);
            try {
              // Payment is already captured here — retry through the webhook race
              // rather than reporting a confirmation hiccup as a failed payment.
              const outcome = await verifyPaymentWithRetry({
                attempt: async () =>
                  (
                    await api.post("/jyotirlinga-subscription/verify-payment", {
                      orderID: data.orderID,
                      paymentMode: "upfront",
                      razorpay_payment_id: rzpResp.razorpay_payment_id,
                      razorpay_order_id: rzpResp.razorpay_order_id,
                      razorpay_signature: rzpResp.razorpay_signature,
                    })
                  ).data,
              });
              if (outcome.status === "declined") throw new Error(outcome.message);
              gtag("event", "purchase", {
                transaction_id: rzpResp.razorpay_payment_id || data.orderID,
                value: finalAmount,
                currency: "INR",
                affiliation: "Vedic Vaibhav",
                items: [{
                  item_id: safePlan.id || "12-jyotirlinga",
                  item_name: `12 Jyotirlinga - ${safePlan.name}`,
                  item_category: "12 Jyotirlinga Subscription",
                  price: finalAmount,
                  quantity: selectedJyotirlinga.length || 1,
                }],
              });
              localStorage.setItem("last_jyotirlinga_booking", data.orderID);
              saveNavState("12-jyotirlinga-success", {
                bookingId: data.orderID,
                planName: safePlan.name,
                amount: finalAmount,
                selectedCount,
                paymentMode: "upfront",
              });
              router.replace("/services/12-jyotirlinga/success");
            } catch (err: any) {
              fbqTrack("PaymentInfoFailed", {
                content_ids: [safePlan.id || "12-jyotirlinga"],
                value: finalAmount,
                currency: "INR",
              });
              gtag("event", "payment_failed", {
                currency: "INR",
                value: finalAmount,
                items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga - ${safePlan.name}` }],
              });
              showToast(
                err?.response?.data?.message ||
                "Payment received but confirmation failed. Contact support.",
                "error"
              );
            } finally {
              setVerifying(false);
              window.dispatchEvent(new CustomEvent("bookings-updated"));
              setSubmitting(false);
            }
          },
        });
        return;
      }

      // Autopay
      await openRazorpayCheckout({
        ...commonOptions,
        description: `${plan.name} — Monthly AutoPay`,
        order_id: data.razorpayOrderId,
        customer_id: data.customerId,
        recurring: "1",
        handler: async (rzpResp: any) => {
          setVerifying(true);
          try {
            await api.post(
              "/jyotirlinga-subscription/verify-payment",
              {
                orderID: data.orderID,
                paymentMode: "autopay",
                razorpay_payment_id: rzpResp.razorpay_payment_id,
                razorpay_order_id: rzpResp.razorpay_order_id,
                razorpay_signature: rzpResp.razorpay_signature,
              }
            );
            gtag("event", "purchase", {
              transaction_id: rzpResp.razorpay_payment_id || data.orderID,
              value: finalAmount,
              currency: "INR",
              affiliation: "Vedic Vaibhav",
              items: [{
                item_id: safePlan.id || "12-jyotirlinga",
                item_name: `12 Jyotirlinga - ${safePlan.name}`,
                item_category: "12 Jyotirlinga Subscription",
                price: finalAmount,
                quantity: selectedJyotirlinga.length || 1,
              }],
            });
            localStorage.setItem("last_jyotirlinga_booking", data.orderID);
            saveNavState("12-jyotirlinga-success", {
              bookingId: data.orderID,
              planName: safePlan.name,
              amount: finalAmount,
              selectedCount,
              paymentMode: "autopay",
            });
            router.replace("/services/12-jyotirlinga/success");
          } catch (err: any) {
            fbqTrack("PaymentInfoFailed", {
              content_ids: [safePlan.id || "12-jyotirlinga"],
              value: finalAmount,
              currency: "INR",
            });
            gtag("event", "payment_failed", {
              currency: "INR",
              value: finalAmount,
              items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga - ${safePlan.name}` }],
            });
            showToast(
              err?.response?.data?.message ||
              "Payment received but confirmation failed. Contact support.",
              "error"
            );
          } finally {
            setVerifying(false);
            window.dispatchEvent(new CustomEvent("bookings-updated"));
            setSubmitting(false);
          }
        },
      });
    } catch (err: any) {
      setSubmitting(false);
      showToast(
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong. Please try again.",
        "error"
      );
    }
  };

  // ── No state guard ───────────────────────────────────────────────────────────
  if (!stateLoaded) return null;
  if (!plan) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#fffaf0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <p style={{ color: "#c2410c", fontWeight: 700, textAlign: "center" }}>
          No plan selected. Please go back and choose a plan.
        </p>
        <button
          onClick={() => router.back()}
          style={{
            marginTop: 16,
            padding: "12px 28px",
            borderRadius: 999,
            background: "#ea580c",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Go Back
        </button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const inp = (
    label: string,
    name: keyof typeof formData,
    placeholder: string,
    opts: { type?: string; maxLength?: number } = {}
  ) => (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#92400e",
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      <input
        value={formData[name]}
        onChange={(e) => {
          setFormData((p) => ({ ...p, [name]: e.target.value }));
          if (isSubmitted) validate({ ...formData, [name]: e.target.value }, address);
        }}
        placeholder={placeholder}
        type={opts.type || "text"}
        maxLength={opts.maxLength}
        style={{
          width: "100%",
          padding: "13px 14px",
          borderRadius: 12,
          border: `1.5px solid ${errors[name] ? "#ef4444" : "#f0d9b5"}`,
          background: "#fffbf2",
          fontSize: 15,
          color: "#1c0a00",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
      {errors[name] && (
        <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
          {errors[name]}
        </p>
      )}
    </div>
  );

  const addrInp = (
    label: string,
    name: keyof typeof address,
    placeholder: string,
    opts: { maxLength?: number } = {}
  ) => (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#92400e",
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      <input
        value={address[name]}
        onChange={(e) => {
          setAddress((p) => ({ ...p, [name]: e.target.value }));
          if (isSubmitted) validate(formData, { ...address, [name]: e.target.value });
        }}
        placeholder={placeholder}
        maxLength={opts.maxLength}
        style={{
          width: "100%",
          padding: "13px 14px",
          borderRadius: 12,
          border: `1.5px solid ${addressErrors[name] ? "#ef4444" : "#f0d9b5"}`,
          background: "#fffbf2",
          fontSize: 15,
          color: "#1c0a00",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
      {addressErrors[name] && (
        <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
          {addressErrors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9f0e0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Loading overlay */}
      {(submitting || verifying) && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid rgba(255,255,255,0.3)",
              borderTop: "4px solid #f97316",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
            {verifying ? "Confirming your booking…" : "Opening payment…"}
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            left: 16,
            right: 16,
            zIndex: 9998,
            background: toastMsg.type === "error" ? "#dc2626" : "#16a34a",
            color: "#fff",
            borderRadius: 12,
            padding: "14px 16px",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          }}
        >
          {toastMsg.text}
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "18px 16px 10px",
            gap: 12,
            background: "#f9f0e0",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              background: "rgba(234,88,12,0.1)",
              border: "none",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: "#c2410c",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <div>
            <span
              style={{
                color: "#431407",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Complete Your Booking
            </span>
            <p style={{ margin: 0, fontSize: 12, color: "#9a3412", fontWeight: 600 }}>
              {plan.name} · {selectedCount} Jyotirlinga
              {selectedCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Order Summary Card */}
        <div
          style={{
            margin: "8px 16px 0",
            borderRadius: 16,
            background: "linear-gradient(135deg, #fef3c7 0%, #fdba74 100%)",
            padding: "16px 18px",
            border: "1px solid rgba(234,88,12,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#7c2d12",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {plan.name}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 11,
                  color: "#9a3412",
                  fontWeight: 600,
                }}
              >
                {selectedCount} Jyotirlinga{selectedCount > 1 ? "s" : ""} ·{" "}
                {billingMode === "autopay"
                  ? `₹${basePricing.autopayMonthlyAmount.toLocaleString(
                    "en-IN"
                  )}/month`
                  : "One-time upfront"}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              {appliedCoupon ? (
                <>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "#9a3412",
                      textDecoration: "line-through",
                    }}
                  >
                    ₹{basePricing.upfrontTotalOriginal.toLocaleString("en-IN")}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 900,
                      color: "#431407",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    ₹1
                  </p>
                </>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#431407",
                    letterSpacing: "-0.03em",
                  }}
                >
                  ₹
                  {(billingMode === "autopay"
                    ? basePricing.autopayMonthlyAmount
                    : basePricing.upfrontTotalOriginal
                  ).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </div>

          {billingMode === "upfront" && basePricing.upfrontDiscountPercent > 0 && (
            <div
              style={{
                marginTop: 10,
                background: "rgba(255,255,255,0.6)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 700,
                color: "#15803d",
              }}
            >
              ✓ {basePricing.upfrontDiscountPercent}% discount applied — Save ₹
              {basePricing.upfrontDiscountAmount.toLocaleString("en-IN")}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "20px 16px 120px" }}>
          {/* ── Devotee Details ── */}
          <Section title="Devotee Details" emoji="🙏">
            {inp("WhatsApp Number *", "mobile", "10-digit mobile", {
              type: "tel",
              maxLength: 10,
            })}
            {inp("Full Name *", "name", "Your full name")}

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#92400e",
                  marginBottom: 5,
                }}
              >
                Gotra *
              </label>
              <input
                value={dontKnowGotra ? "" : formData.gotra}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, gotra: e.target.value }));
                  if (isSubmitted) validate({ ...formData, gotra: e.target.value }, address);
                }}
                disabled={dontKnowGotra}
                placeholder={
                  dontKnowGotra ? "Will be set to Sadharana" : "Your gotra"
                }
                style={{
                  width: "100%",
                  padding: "13px 14px",
                  borderRadius: 12,
                  border: `1.5px solid ${errors.gotra ? "#ef4444" : "#f0d9b5"}`,
                  background: dontKnowGotra ? "#f5f5f5" : "#fffbf2",
                  fontSize: 15,
                  color: "#1c0a00",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  opacity: dontKnowGotra ? 0.6 : 1,
                }}
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={dontKnowGotra}
                  onChange={(e) => {
                    setDontKnowGotra(e.target.checked);
                    if (e.target.checked) {
                      setErrors((p) => ({ ...p, gotra: "" }));
                    }
                  }}
                  style={{ width: 16, height: 16, accentColor: "#ea580c" }}
                />
                <span style={{ fontSize: 13, color: "#7c2d12", fontWeight: 600 }}>
                  I don't know my gotra
                </span>
              </label>
              {errors.gotra && (
                <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                  {errors.gotra}
                </p>
              )}
            </div>

            {inp("Email (optional)", "email", "your@email.com", {
              type: "email",
            })}
          </Section>

          {/* ── Delivery Address ── */}
          <Section title="Delivery Address" emoji="📦">
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 12,
                color: "#92400e",
                fontWeight: 600,
              }}
            >
              Monthly prasad will be delivered here
            </p>
            {addrInp("Address Line 1 *", "line1", "House/Flat, Street, Area")}
            {addrInp("Address Line 2 (optional)", "line2", "Landmark, Colony")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                {addrInp("City *", "city", "City")}
              </div>
              <div>
                {addrInp("PIN Code *", "pinCode", "6-digit PIN", { maxLength: 6 })}
              </div>
            </div>
            {addrInp("State *", "state", "State")}
          </Section>

          {/* ── Family Members ── */}
          <Section title="Family Members" emoji="👨‍👩‍👧‍👦">
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 12,
                color: "#92400e",
                fontWeight: 600,
              }}
            >
              First {freeFamilyCount} family member{freeFamilyCount !== 1 ? "s" : ""} free.
              Additional: ₹{FAMILY_MEMBER_ADDON_PER_MEMBER}/member.
            </p>
            {familyMembers.map((member, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 14,
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(234,88,12,0.2)",
                  background: "rgba(255,255,255,0.6)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 700, color: "#7c2d12" }}
                  >
                    Member {i + 1}
                    {i >= freeFamilyCount ? (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#ea580c",
                          marginLeft: 6,
                        }}
                      >
                        +₹{FAMILY_MEMBER_ADDON_PER_MEMBER}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#16a34a",
                          marginLeft: 6,
                        }}
                      >
                        Free
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => removeFamilyMember(i)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#dc2626",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
                <input
                  value={member.name}
                  onChange={(e) => updateMember(i, "name", e.target.value)}
                  placeholder="Name *"
                  style={{
                    width: "100%",
                    padding: "11px 13px",
                    borderRadius: 10,
                    border: "1.5px solid #f0d9b5",
                    background: "#fffbf2",
                    fontSize: 14,
                    color: "#1c0a00",
                    outline: "none",
                    boxSizing: "border-box",
                    marginBottom: 8,
                    fontFamily: "inherit",
                  }}
                />
                <input
                  value={member.gotra}
                  onChange={(e) => updateMember(i, "gotra", e.target.value)}
                  placeholder="Gotra (optional)"
                  style={{
                    width: "100%",
                    padding: "11px 13px",
                    borderRadius: 10,
                    border: "1.5px solid #f0d9b5",
                    background: "#fffbf2",
                    fontSize: 14,
                    color: "#1c0a00",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            ))}
            {familyMembers.length < maxFamilyMembers && (
              <button
                onClick={addFamilyMember}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  border: "1.5px dashed rgba(234,88,12,0.4)",
                  background: "transparent",
                  color: "#ea580c",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Add Family Member
              </button>
            )}
          </Section>

          {/* ── Coupon ── */}
          <Section title="Have a Coupon?" emoji="🎟">
            {!appliedCoupon ? (
              <>
                {!showCouponInput ? (
                  <button
                    onClick={() => setShowCouponInput(true)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ea580c",
                      fontSize: 14,
                      fontWeight: 700,
                      textDecoration: "underline",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Enter coupon code
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        if (couponError) setCouponError("");
                      }}
                      placeholder="Coupon code"
                      style={{
                        flex: 1,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1.5px solid #f0d9b5",
                        background: "#fffbf2",
                        fontSize: 14,
                        color: "#1c0a00",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      style={{
                        padding: "0 20px",
                        borderRadius: 12,
                        background: "#ea580c",
                        color: "#fff",
                        border: "none",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Apply
                    </button>
                  </div>
                )}
                {couponError && (
                  <p
                    style={{
                      color: "#ef4444",
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    {couponError}
                  </p>
                )}
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(22,163,74,0.08)",
                  border: "1px dashed #16a34a",
                  borderRadius: 12,
                  padding: "12px 16px",
                }}
              >
                <div>
                  <p
                    style={{
                      color: "#16a34a",
                      fontSize: 14,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    "{appliedCoupon.code}" applied!
                  </p>
                  <p
                    style={{
                      color: "#15803d",
                      fontSize: 12,
                      margin: 0,
                    }}
                  >
                    Special discount — Total: ₹1
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponInput("");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#dc2626",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Sticky Pay Button */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(249,240,224,0.97)",
          borderTop: "1px solid rgba(234,88,12,0.2)",
          padding: "12px 16px",
          paddingBottom: "max(14px, env(safe-area-inset-bottom))",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "#9a3412",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Total Amount
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 900,
                color: "#c2410c",
                letterSpacing: "-0.03em",
              }}
            >
              ₹{finalAmount.toLocaleString("en-IN")}
            </p>
          </div>
          <button
            onClick={handlePay}
            disabled={submitting || verifying}
            style={{
              background:
                submitting || verifying
                  ? "rgba(234,88,12,0.5)"
                  : "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "15px 28px",
              fontSize: 16,
              fontWeight: 800,
              cursor: submitting || verifying ? "not-allowed" : "pointer",
              letterSpacing: "-0.01em",
              boxShadow: "0 4px 20px rgba(234,88,12,0.45)",
              transition: "transform 0.1s",
            }}
          >
            {submitting ? "Processing…" : verifying ? "Confirming…" : `Pay ₹${finalAmount.toLocaleString("en-IN")}`}
          </button>
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(67,20,7,0.4); }
        input:focus { border-color: #f97316 !important; }
      `}</style>
    </div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section: React.FC<{
  title: string;
  emoji: string;
  children: React.ReactNode;
}> = ({ title, emoji, children }) => (
  <div
    style={{
      marginBottom: 20,
      background: "rgba(255,255,255,0.7)",
      borderRadius: 18,
      border: "1px solid rgba(234,88,12,0.15)",
      padding: "18px 16px",
      backdropFilter: "blur(8px)",
    }}
  >
    <h3
      style={{
        margin: "0 0 16px",
        fontSize: 15,
        fontWeight: 800,
        color: "#7c2d12",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span>{emoji}</span> {title}
    </h3>
    {children}
  </div>
);

export default PackageCheckout;
