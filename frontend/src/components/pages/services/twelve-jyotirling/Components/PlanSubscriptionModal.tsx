"use client";

import React, { useEffect, useMemo, useState } from "react";
import PaymentLoader from "@/components/pages/services/chadhava/PaymentLoader";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveNavState } from "@/lib/nav-state";
import { gtag } from "@/lib/gtag";
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CloseIcon from "@mui/icons-material/Close";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import HomeIcon from "@mui/icons-material/Home";
import { IJyotirlinga } from "../index";
import { getVvUtm } from "@/lib/utm";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";

declare global {
  interface Window {
    // Razorpay: any;
    EasebuzzCheckout: any;
  }
}

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

type BillingMode = "upfront" | "autopay";

interface PlanSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  plan: SubscribablePlan | null;
  selectedJyotirlinga: IJyotirlinga[];
  allJyotirlinga: IJyotirlinga[];
  onPaymentSuccess?: () => void;
  initialBillingMode?: "upfront" | "autopay";
}

const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [];

const FAMILY_MEMBER_ADDON_PER_MEMBER = 99;

// Free family members per plan: Basic=2, Intermediate=3, Advance=4
const FREE_FAMILY_COUNT: Record<string, number> = {
  Basic: 2,
  Intermediate: 3,
  Advance: 4,
};
const AUTOPAY_MARKUP_PERCENT = 6;
// const MANDATE_AUTH_DISPLAY_AMOUNT = 1;
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const EASEBUZZ_SCRIPT_SRC =
  "https://ebz-static.s3.ap-south-1.amazonaws.com/easecheckout/easebuzz-checkout.js";

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

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT_SRC}"]`
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (existingScript.getAttribute("data-loaded") === "true") {
        resolve(true);
        return;
      }

      const onLoad = () => {
        existingScript.setAttribute("data-loaded", "true");
        resolve(true);
      };

      const onError = () => resolve(false);

      existingScript.addEventListener("load", onLoad, { once: true });
      existingScript.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;

    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      resolve(true);
    };
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

const loadEasebuzzScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.EasebuzzCheckout) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      `script[src="${EASEBUZZ_SCRIPT_SRC}"]`
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (existingScript.getAttribute("data-loaded") === "true") {
        resolve(true);
        return;
      }

      const onLoad = () => {
        existingScript.setAttribute("data-loaded", "true");
        resolve(true);
      };

      const onError = () => resolve(false);

      existingScript.addEventListener("load", onLoad, { once: true });
      existingScript.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = EASEBUZZ_SCRIPT_SRC;
    script.async = true;

    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      resolve(true);
    };
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

const PlanSubscriptionModal: React.FC<PlanSubscriptionModalProps> = ({
  open,
  onClose,
  plan,
  selectedJyotirlinga,
  allJyotirlinga,
  initialBillingMode = "upfront",
}) => {
  const router = useRouter();
  const [localJyotirlinga, setLocalJyotirlinga] = useState<IJyotirlinga[]>(selectedJyotirlinga);
  const [formData, setFormData] = useState({
    name: "",
    gotra: "",
    mobile: "",
    email: "",
  });
  const lastFetchedPhoneRef = React.useRef<string>("");
  const fetchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [address, setAddress] = useState({
    addressName: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pinCode: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [familyErrors, setFamilyErrors] = useState<Record<string, string>[]>([]);
  const [familyMembers, setFamilyMembers] =
    useState<FamilyMember[]>(DEFAULT_FAMILY_MEMBERS);
  const [dontKnowGotra, setDontKnowGotra] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [billingMode, setBillingMode] = useState<BillingMode>(initialBillingMode);

  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState("");

  const handleApplyCoupon = () => {
    if (!couponInput) {
      setCouponError("Please enter a coupon code");
      return;
    }
    const code = couponInput.trim().toUpperCase();
    if (code === "VVJATIN@100" || code === "TYAGI@19") {
      setAppliedCoupon({ code: couponInput.trim(), discount: 0 }); // discount value not needed here, we'll override total
      setCouponError("");
    } else {
      setCouponError("Invalid coupon code");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (open) {
      setBillingMode(initialBillingMode);
      setLoading(false);
      setDontKnowGotra(false);
      setFamilyMembers(DEFAULT_FAMILY_MEMBERS);
      setFamilyErrors([]);
      setShowCouponInput(false);
      setCouponInput("");
      setAppliedCoupon(null);
      setCouponError("");
      // ViewContent — fire when modal opens
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

      try {
        const raw = localStorage.getItem("user_data");
        if (raw) {
          const userData = JSON.parse(raw);
          setFormData({
            name: userData.name || "",
            gotra: userData.gotra || "",
            mobile: userData.phone || userData.whatsapp || "",
            email: userData.email || "",
          });
          const primaryAddr =
            Array.isArray(userData.addresses) && userData.addresses.length > 0
              ? userData.addresses.find((a: any) => a.isPrimary) ?? userData.addresses[0]
              : null;
          setAddress({
            addressName: "",
            line1: userData.address1 || userData.address || "",
            line2: userData.address2 || "",
            city: primaryAddr?.city || userData.city || "",
            state: userData.state || "",
            pinCode: primaryAddr?.pincode || userData.pincode || "",
          });
        }
      } catch {
        // ignore malformed localStorage data
      }
    }
    setLocalJyotirlinga(selectedJyotirlinga);
  }, [open, selectedJyotirlinga, initialBillingMode]);

  // Auto-fetch user details when a valid 10-digit mobile is entered
  const fetchUserDetails = async (phone: string) => {
    try {
      const { data } = await api.get(`/get-user-by-phone/${phone}`);
      const user = data?.user || data;
      if (!user) return;

      const rawName = user.name || user.fullName || "";
      const fName = user.firstname || user.firstName || user.given_name || "";
      const lName = user.lastname || user.lastName || user.family_name || "";
      let fullName = `${fName} ${lName}`.trim();
      if (!fullName && rawName) fullName = rawName.trim();

      setFormData(prev => ({
        ...prev,
        name: fullName || prev.name,
        gotra: user.gotra || prev.gotra,
        email: user.email || prev.email,
      }));

      setAddress(prev => ({
        ...prev,
        line1: user.address1 || user.address || prev.line1,
        city: user.city || prev.city,
        state: user.state || prev.state,
        pinCode: user.pincode || prev.pinCode,
      }));
    } catch (e: any) {
      if (e?.response?.status === 404) {
        // User not found — clear fields
        setFormData(prev => ({ ...prev, name: "", gotra: "", email: "" }));
        setAddress({ addressName: "", line1: "", line2: "", city: "", state: "", pinCode: "" });
      }
    }
  };

  useEffect(() => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);

    const phone = formData.mobile.trim();
    if (!/^[6789]\d{9}$/.test(phone) || phone === lastFetchedPhoneRef.current) return;

    lastFetchedPhoneRef.current = phone;
    fetchTimerRef.current = setTimeout(() => {
      fetchUserDetails(phone);
    }, 500);

    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    };
  }, [formData.mobile]);

  const safePlan = plan ?? {
    id: "",
    name: "",
    nameHindi: "",
    planId: "Basic" as const,
    pricePercentage: 0,
    yearlyPercentageDiscount: 0,
  };

  const selectedCount = localJyotirlinga.length;
  const canUseAutopay = selectedCount > 1;
  const freeFamilyCount = FREE_FAMILY_COUNT[safePlan.planId] ?? 0;
  const isAddressPlan = true; // all plans collect address for prasad delivery

  const basePricing = useMemo(() => {
    const totalBaseJyotirlingaPrice = localJyotirlinga.reduce(
      (sum, item) => sum + (item.price || 0),
      0
    );

    const planAdjustedBase = Math.round(
      (totalBaseJyotirlingaPrice * safePlan.pricePercentage) / 100
    );

    const filledFamilyMembersCount = familyMembers.filter(
      (m) => m.name.trim() || m.gotra.trim()
    ).length;

    const paidFilledFamilyCount = familyMembers.filter(
      (m, i) => i >= freeFamilyCount && (m.name.trim() || m.gotra.trim())
    ).length;

    const familyAddOnTotal =
      paidFilledFamilyCount * FAMILY_MEMBER_ADDON_PER_MEMBER;

    const autopayBaseJourney = planAdjustedBase + familyAddOnTotal;
    const autopayJourneyWithMarkup = canUseAutopay
      ? Math.round(
        (autopayBaseJourney * (100 + AUTOPAY_MARKUP_PERCENT)) / 100
      )
      : 0;

    const autopayMonthlyAmount = canUseAutopay
      ? Math.ceil(autopayJourneyWithMarkup / selectedCount)
      : 0;

    const autopayTotalJourney = canUseAutopay
      ? autopayMonthlyAmount * selectedCount
      : 0;

    // Upfront Calculation Match with PlanCards
    const upfrontDiscountPercent =
      selectedCount > 1 ? safePlan.yearlyPercentageDiscount : 0;

    const upfrontDiscountAmount = Math.round(
      (planAdjustedBase * upfrontDiscountPercent) / 100
    );

    const upfrontTotalOriginal = Math.max(
      planAdjustedBase - upfrontDiscountAmount + familyAddOnTotal,
      0
    );

    return {
      totalBaseJyotirlingaPrice,
      planAdjustedBase,
      familyAddOnTotal,
      filledFamilyMembersCount,
      upfrontDiscountPercent,
      upfrontDiscountAmount,
      upfrontTotalOriginal,
      autopayMonthlyAmount,
      autopayTotalJourney,
      autopayCycles: selectedCount,
    };
  }, [localJyotirlinga, safePlan, familyMembers, canUseAutopay, selectedCount, freeFamilyCount]);

  const pricing = useMemo(() => {
    const base = basePricing;
    const upfrontTotal =
      billingMode === "upfront" && appliedCoupon
        ? 1
        : base.upfrontTotalOriginal;
    return { ...base, upfrontTotal };
  }, [basePricing, billingMode, appliedCoupon]);

  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getMonthBadgeText = (month: string, startDate?: string, endDate?: string): string => {
    const hinduPart = month.split("•")[0].trim();

    if (startDate) {
      const start = new Date(startDate);
      const startMon = MONTH_NAMES[start.getMonth()];
      const year = start.getFullYear();

      if (endDate) {
        const end = new Date(endDate);
        const endMon = MONTH_NAMES[end.getMonth()];
        const gregorianPart = startMon === endMon ? startMon : `${startMon}-${endMon}`;
        return `${hinduPart} • ${gregorianPart} ${year}`;
      }

      return `${hinduPart} • ${startMon} ${year}`;
    }

    if (endDate) {
      const end = new Date(endDate);
      return `${hinduPart} • ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
    }

    return hinduPart;
  };

  const sortedSelectedJyotirlinga = [...localJyotirlinga].sort((a, b) => {
    const aTime = a.startDate ? new Date(a.startDate).getTime() : (a.endDate ? new Date(a.endDate).getTime() : Infinity);
    const bTime = b.startDate ? new Date(b.startDate).getTime() : (b.endDate ? new Date(b.endDate).getTime() : Infinity);
    return aTime - bTime;
  });

  if (!plan) return null;

  const showSnackbar = (
    message: string,
    severity: "success" | "error" = "error"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextFormData = { ...formData, [name]: value };
    setFormData(nextFormData);
    validateForm(nextFormData, address, familyMembers);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextAddress = { ...address, [name]: value };
    setAddress(nextAddress);
    validateForm(formData, nextAddress, familyMembers);
  };

  const handleRemoveFamilyMember = (index: number) => {
    const nextFamily = familyMembers.filter((_, i) => i !== index);
    setFamilyMembers(nextFamily);
    validateForm(formData, address, nextFamily);
  };

  const handleFamilyMemberChange = (
    index: number,
    field: keyof FamilyMember,
    value: string
  ) => {
    const nextFamily = [...familyMembers];
    nextFamily[index] = { ...nextFamily[index], [field]: value };
    setFamilyMembers(nextFamily);
    validateForm(formData, address, nextFamily);
  };

  const validateForm = (
    currentFormData = formData,
    currentAddress = address,
    currentFamilyMembers = familyMembers,
    isSubmitting = false
  ) => {
    const newErrors: Record<string, string> = {};
    if (!currentFormData.name.trim()) newErrors.name = "Full name is required.";
    if (!dontKnowGotra && !currentFormData.gotra.trim()) newErrors.gotra = "Gotra is required. Or check 'Don't know gotra'.";

    if (!currentFormData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required.";
    } else if (!/^[6789]\d{9}$/.test(currentFormData.mobile.trim())) {
      newErrors.mobile = "Please enter a valid 10-digit Indian mobile number.";
    }

    if (currentFormData.email.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(currentFormData.email.trim())) {
        newErrors.email = "Please enter a valid email address.";
      }
    }

    const newAddressErrors: Record<string, string> = {};
    if (isAddressPlan) {
      if (!currentAddress.line1.trim()) {
        newAddressErrors.line1 = "Address line 1 is required.";
      }
      if (!currentAddress.city.trim()) newAddressErrors.city = "City is required.";
      if (!currentAddress.state.trim()) newAddressErrors.state = "State is required.";
      if (!currentAddress.pinCode.trim()) {
        newAddressErrors.pinCode = "PIN code is required.";
      } else if (!/^\d{6}$/.test(currentAddress.pinCode.trim())) {
        newAddressErrors.pinCode = "Enter a valid 6-digit PIN code.";
      }
    }

    const newFamilyErrors: Record<string, string>[] = currentFamilyMembers.map(
      (m, i) => {
        const hasAnyValue = m.name.trim() || m.gotra.trim();
        const fe: Record<string, string> = {};

        if (hasAnyValue && !m.name.trim()) {
          fe.name = `Member ${i + 1} name is required.`;
        }
        if (hasAnyValue && !m.gotra.trim()) {
          fe.gotra = `Member ${i + 1} gotra is required.`;
        }
        return fe;
      }
    );

    const hasFamilyErrors = newFamilyErrors.some(
      (item) => Object.keys(item).length > 0
    );

    if (isSubmitted || isSubmitting) {
      setErrors(newErrors);
      setAddressErrors(newAddressErrors);
      setFamilyErrors(newFamilyErrors);
    } else {
      setErrors({});
      setAddressErrors({});
      setFamilyErrors([]);
    }

    return (
      Object.keys(newErrors).length === 0 &&
      Object.keys(newAddressErrors).length === 0 &&
      !hasFamilyErrors
    );
  };

  const openRazorpayCheckout = async (options: any) => {
    const loaded = await loadRazorpayScript();

    if (!loaded || !window.Razorpay) {
      throw new Error(
        "Razorpay Checkout could not be loaded. Please disable ad-blocker or retry."
      );
    }

    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", (response: any) => {
      setLoading(false);
      const reason =
        response?.error?.description ||
        response?.error?.reason ||
        response?.error?.code ||
        "Payment failed.";
      // PaymentInfoFailed — Razorpay gateway failure
      fbqTrack("PaymentInfoFailed", {
        content_ids: [safePlan.id || "12-jyotirlinga"],
        value: billingMode === "upfront" ? pricing.upfrontTotal : pricing.autopayMonthlyAmount,
        currency: "INR",
      });
      gtag("event", "payment_failed", {
        currency: "INR",
        value: billingMode === "upfront" ? pricing.upfrontTotal : pricing.autopayMonthlyAmount,
        items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga - ${safePlan.name}` }],
      });
      showSnackbar(reason, "error");
    });

    rzp.open();
  };

  const openEasebuzzCheckout = async (data: any) => {
    const loaded = await loadEasebuzzScript();

    if (!loaded || !window.EasebuzzCheckout) {
      throw new Error(
        "Easebuzz Checkout could not be loaded. Please disable ad-blocker or retry."
      );
    }

    const easebuzzCheckout = new window.EasebuzzCheckout(data.key, data.env);
    const options = {
      access_key: data.access_key,
      onResponse: async (response: any) => {
        if (response.status === "success") {
          try {
            await api.post(
              "/jyotirlinga-subscription/verify-payment",
              {
                ...response,
                orderID: data.orderID,
                gateway: "easebuzz",
              }
            );

            // Purchase — DISABLED: Backend CAPI (jyotirlingaSubscriptionController) sends this event to avoid double-counting
            /*
            fbqTrack("Purchase", {
              content_ids: [safePlan.id || "12-jyotirlinga"],
              content_name: `12 Jyotirlinga - ${safePlan.name}`,
              content_category: "12 Jyotirlinga Subscription",
              content_type: "product",
              value: pricing.upfrontTotal,
              currency: "INR",
              transaction_id: response.easepayid || data.orderID,
            });
            */
            gtag("event", "purchase", {
              transaction_id: response.easepayid || data.orderID,
              value: pricing.upfrontTotal,
              currency: "INR",
              affiliation: "Vedic Vaibhav",
              items: [{
                item_id: safePlan.id || "12-jyotirlinga",
                item_name: `12 Jyotirlinga - ${safePlan.name}`,
                item_category: "12 Jyotirlinga Subscription",
                price: pricing.upfrontTotal,
                quantity: localJyotirlinga.length || 1,
              }],
            });
            localStorage.setItem("last_jyotirlinga_booking", data.orderID);
            onClose();
            saveNavState("12-jyotirlinga-success", {
              bookingId: data.orderID,
              planName: safePlan.name,
              amount: pricing.upfrontTotal,
              selectedCount: localJyotirlinga.length,
              paymentMode: "upfront",
            });
            router.replace("/services/12-jyotirlinga/success");
          } catch (error: any) {
            // PaymentInfoFailed — Easebuzz verification error
            fbqTrack("PaymentInfoFailed", {
              content_ids: [safePlan.id || "12-jyotirlinga"],
              value: pricing.upfrontTotal,
              currency: "INR",
            });
            gtag("event", "payment_failed", {
              currency: "INR",
              value: pricing.upfrontTotal,
              items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga - ${safePlan.name}` }],
            });
            showSnackbar(
              error?.response?.data?.message ||
              "Payment was received, but booking confirmation failed.",
              "error"
            );
          } finally {
            window.dispatchEvent(new CustomEvent("bookings-updated"));
            setLoading(false);
          }
        } else {
          setLoading(false);
          // PaymentInfoFailed — Easebuzz cancelled/failed
          fbqTrack("PaymentInfoFailed", {
            content_ids: [safePlan.id || "12-jyotirlinga"],
            value: pricing.upfrontTotal,
            currency: "INR",
          });
          gtag("event", "payment_failed", {
            currency: "INR",
            value: pricing.upfrontTotal,
            items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga - ${safePlan.name}` }],
          });
          showSnackbar("Payment failed or cancelled.", "error");
        }
      },
    };

    easebuzzCheckout.initiatePayment(options);
  };

  const handlePay = async () => {
    setIsSubmitted(true);
    if (!validateForm(formData, address, familyMembers, true)) return;

    const filledFamilyMembers = familyMembers
      .map((m) => ({
        name: m.name.trim(),
        gotra: m.gotra.trim(),
      }))
      .filter((m) => m.name || m.gotra);

    const payload = {
      name: formData.name.trim(),
      mobile: formData.mobile.trim(),
      email: formData.email.trim(),
      gotra: dontKnowGotra ? "Sadharana" : formData.gotra.trim(),
      planId: plan.planId,
      paymentMode: billingMode,
      jyotirlingaIds: localJyotirlinga.map((j) => j._id),
      familyMembers: filledFamilyMembers,
      ...(billingMode === "upfront" && appliedCoupon
        ? { discountedAmount: pricing.upfrontTotal }
        : {}),
      ...(isAddressPlan
        ? {
          deliveryAddress: {
            name: address.addressName.trim() || formData.name.trim() || "Devotee",
            mobile: formData.mobile.trim(),
            line1: address.line1.trim(),
            line2: address.line2.trim(),
            city: address.city.trim(),
            state: address.state.trim(),
            pinCode: address.pinCode.trim(),
          },
        }
        : {}),
      vv_utm: getVvUtm(),
    };

    setLoading(true);

    // Auto-login / register user silently before payment
    try {
      const { data: authData } = await api.post(
        "/phone-login-or-register",
        {
          phone: formData.mobile.trim(),
          name: formData.name.trim(),
          gotra: dontKnowGotra ? "Sadharana" : formData.gotra.trim(),
          ...(isAddressPlan ? {
            address1: address.line1.trim(),
            city: address.city.trim(),
            state: address.state.trim(),
            pincode: address.pinCode.trim(),
          } : {}),
          country: "India",
        }
      );
      localStorage.setItem("userDetails", JSON.stringify({ user: authData.user, token: authData.token }));
      localStorage.setItem("checkoutContact", JSON.stringify({ name: formData.name.trim(), phone: formData.mobile.trim(), email: formData.email.trim() }));
    } catch {
      // Non-blocking — proceed even if auto-login fails
    }

    // InitiateCheckout
    fbqTrack("InitiateCheckout", {
      content_ids: [plan.id || "12-jyotirlinga"],
      content_name: `12 Jyotirlinga - ${plan.name}`,
      content_category: "12 Jyotirlinga Subscription",
      content_type: "product",
      value: billingMode === "upfront" ? pricing.upfrontTotal : pricing.autopayMonthlyAmount,
      currency: "INR",
      num_items: localJyotirlinga.length,
    });
    gtag("event", "begin_checkout", {
      currency: "INR",
      value: billingMode === "upfront" ? pricing.upfrontTotal : pricing.autopayMonthlyAmount,
      items: [{
        item_id: plan.id || "12-jyotirlinga",
        item_name: `12 Jyotirlinga - ${plan.name}`,
        item_category: "12 Jyotirlinga Subscription",
        price: billingMode === "upfront" ? pricing.upfrontTotal : pricing.autopayMonthlyAmount,
        quantity: localJyotirlinga.length || 1,
      }],
    });

    try {
      const { data } = await api.post(
        "/jyotirlinga-subscription/initiate-payment",
        {
          ...payload,
          gateway: "razorpay", // Always use Razorpay for both modes
        }
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
          email: formData.email.trim() || `${formData.mobile.trim()}@gmail.com`,
        },
        readonly: {
          contact: true,
          email: true,
          name: false,
        },
        theme: { color: "#c89b3c" },
        modal: {
          ondismiss: () => setLoading(false),
          confirm_close: true,
        },
      };

      if (data.mode === "upfront") {
        const options = {
          ...commonOptions,
          description: `${plan.name} Plan — Pay Full Amount`,
          amount: data.amount,
          currency: data.currency,
          order_id: data.razorpayOrderId,
          handler: async (rzpResponse: any) => {
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
                      razorpay_payment_id: rzpResponse.razorpay_payment_id,
                      razorpay_order_id: rzpResponse.razorpay_order_id,
                      razorpay_signature: rzpResponse.razorpay_signature,
                    })
                  ).data,
              });
              if (outcome.status === "declined") throw new Error(outcome.message);

              // Purchase — DISABLED: Backend CAPI (jyotirlingaSubscriptionController) sends this event to avoid double-counting
              /*
              fbqTrack("Purchase", {
                content_ids: [safePlan.id || "12-jyotirlinga"],
                content_name: `12 Jyotirlinga - ${safePlan.name}`,
                content_category: "12 Jyotirlinga Subscription",
                content_type: "product",
                value: pricing.upfrontTotal,
                currency: "INR",
                transaction_id: rzpResponse.razorpay_payment_id,
              });
              */
              gtag("event", "purchase", {
                transaction_id: rzpResponse.razorpay_payment_id || data.orderID,
                value: pricing.upfrontTotal,
                currency: "INR",
                affiliation: "Vedic Vaibhav",
                items: [{
                  item_id: safePlan.id || "12-jyotirlinga",
                  item_name: `12 Jyotirlinga - ${safePlan.name}`,
                  item_category: "12 Jyotirlinga Subscription",
                  price: pricing.upfrontTotal,
                  quantity: localJyotirlinga.length || 1,
                }],
              });
              localStorage.setItem("last_jyotirlinga_booking", data.orderID);
              onClose();
              saveNavState("12-jyotirlinga-success", {
                bookingId: data.orderID,
                planName: safePlan.name,
                amount: pricing.upfrontTotal,
                selectedCount: localJyotirlinga.length,
                paymentMode: "upfront",
              });
              router.replace("/services/12-jyotirlinga/success");
            } catch (error: any) {
              // PaymentInfoFailed — Razorpay upfront verification error
              fbqTrack("PaymentInfoFailed", {
                content_ids: [safePlan.id || "12-jyotirlinga"],
                value: pricing.upfrontTotal,
                currency: "INR",
              });
              gtag("event", "payment_failed", {
                currency: "INR",
                value: pricing.upfrontTotal,
                items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga - ${safePlan.name}` }],
              });
              showSnackbar(
                error?.response?.data?.message ||
                "Payment was received, but booking confirmation failed.",
                "error"
              );
            } finally {
              setVerifying(false);
              window.dispatchEvent(new CustomEvent("bookings-updated"));
              setLoading(false);
            }
          },
        };

        await openRazorpayCheckout(options);
        return;
      }

      const options = {
        ...commonOptions,
        description: `${plan.name} Plan — Monthly AutoPay Mandate`,
        order_id: data.razorpayOrderId,
        customer_id: data.customerId,
        recurring: "1",
        handler: async (rzpResponse: any) => {
          setVerifying(true);
          try {
            await api.post(
              "/jyotirlinga-subscription/verify-payment",
              {
                orderID: data.orderID,
                paymentMode: "autopay",
                razorpay_payment_id: rzpResponse.razorpay_payment_id,
                razorpay_order_id: rzpResponse.razorpay_order_id,
                razorpay_signature: rzpResponse.razorpay_signature,
              }
            );

            // Purchase — DISABLED: Backend CAPI (jyotirlingaSubscriptionController) sends this event to avoid double-counting
            /*
            fbqTrack("Purchase", {
              content_ids: [safePlan.id || "12-jyotirlinga"],
              content_name: `12 Jyotirlinga - ${safePlan.name}`,
              content_category: "12 Jyotirlinga Subscription",
              content_type: "product",
              value: pricing.autopayMonthlyAmount,
              currency: "INR",
              transaction_id: rzpResponse.razorpay_payment_id,
            });
            */
            gtag("event", "purchase", {
              transaction_id: rzpResponse.razorpay_payment_id || data.orderID,
              value: pricing.autopayMonthlyAmount,
              currency: "INR",
              affiliation: "Vedic Vaibhav",
              items: [{
                item_id: safePlan.id || "12-jyotirlinga",
                item_name: `12 Jyotirlinga - ${safePlan.name}`,
                item_category: "12 Jyotirlinga Subscription",
                price: pricing.autopayMonthlyAmount,
                quantity: localJyotirlinga.length || 1,
              }],
            });
            localStorage.setItem("last_jyotirlinga_booking", data.orderID);
            onClose();
            saveNavState("12-jyotirlinga-success", {
              bookingId: data.orderID,
              planName: safePlan.name,
              amount: pricing.autopayMonthlyAmount,
              selectedCount: localJyotirlinga.length,
              paymentMode: "autopay",
            });
            router.replace("/services/12-jyotirlinga/success");
          } catch (error: any) {
            // PaymentInfoFailed — autopay verification error
            fbqTrack("PaymentInfoFailed", {
              content_ids: [safePlan.id || "12-jyotirlinga"],
              value: pricing.autopayMonthlyAmount,
              currency: "INR",
            });
            gtag("event", "payment_failed", {
              currency: "INR",
              value: pricing.autopayMonthlyAmount,
              items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga - ${safePlan.name}` }],
            });
            showSnackbar(
              error?.response?.data?.message ||
              "Mandate was created, but booking confirmation failed.",
              "error"
            );
          } finally {
            setVerifying(false);
            window.dispatchEvent(new CustomEvent("bookings-updated"));
            setLoading(false);
          }
        },
      };

      await openRazorpayCheckout(options);
    } catch (error: any) {
      setLoading(false);
      // PaymentInfoFailed — order creation error
      fbqTrack("PaymentInfoFailed", {
        content_ids: [safePlan.id || "12-jyotirlinga"],
        value: pricing.upfrontTotal,
        currency: "INR",
      });
      gtag("event", "payment_failed", {
        currency: "INR",
        value: pricing.upfrontTotal,
        items: [{ item_id: safePlan.id || "12-jyotirlinga", item_name: `12 Jyotirlinga - ${safePlan.name}` }],
      });
      showSnackbar(
        error?.response?.data?.message ||
        error?.message ||
        "Unable to initiate payment. Please try again.",
        "error"
      );
    }
  };

  const ctaText =
    billingMode === "upfront"
      ? `Pay ₹${pricing.upfrontTotal.toLocaleString()} Now`
      : `Set Up AutoPay • ₹${pricing.autopayMonthlyAmount.toLocaleString()}/month`;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        aria-labelledby="subscription-modal-title"
        disableEnforceFocus
        disableAutoFocus
        disableScrollLock
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(5px)",
          zIndex: 1200,
        }}
      >
        <Box
          sx={{
            width: "95%",
            maxWidth: 600,
            maxHeight: "85vh",
            marginTop: "60px",
            bgcolor: "#fffaf0",
            border: "1px solid rgba(234,88,12,0.4)",
            borderRadius: 4,
            boxShadow: "0 0 20px rgba(234,88,12,0.2)",
            position: "relative",
            color: "#431407",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Close button — outside scroll area so it's always clickable */}
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              color: "#c2410c",
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Scrollable content area */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              p: { xs: 2, md: 3 },
              "&::-webkit-scrollbar": { display: "none" },
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >

            <Typography
              id="subscription-modal-title"
              variant="h5"
              component="h2"
              sx={{
                fontFamily: "Cinzel, serif",
                textAlign: "center",
                mb: 1,
                color: "#c2410c",
                pr: { xs: 4, md: 0 },
              }}
            >
              Complete Your Subscription
            </Typography>

            <Typography
              variant="subtitle2"
              sx={{
                textAlign: "center",
                mb: 2,
                color: "#ea580c",
                fontStyle: "italic",
              }}
            >
              {plan.name} - {plan.nameHindi}
            </Typography>

            {/* COMMENTED OUT FOR SPACE: 
            {plan.planId === "Basic" && (
              <Box sx={{ textAlign: "center", mb: 2, px: 1 }}>
                <Typography variant="body2" sx={{ color: "#f5d78e", fontStyle: "italic" }}>
                  🔱 Thousands of families are receiving Mahadev's prasad at home every month. Upgrade to Sankalp Plan and bring temple blessings directly to your doorstep.
                </Typography>
                <Typography
                  variant="body2"
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      document.getElementById("plan-sankalp")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 300);
                  }}
                  sx={{ color: "#c89b3c", mt: 0.5, cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}
                >
                  Upgrade to Sankalp Plan →
                </Typography>
              </Box>
            )}
            {plan.planId === "Intermediate" && (
              <Box sx={{ textAlign: "center", mb: 2, px: 1 }}>
                <Typography variant="body2" sx={{ color: "#f5d78e", fontStyle: "italic" }}>
                  🔥 You're already close to Mahadev. Take one step further — with Live Darshan, a sacred Miniature Jyotirlinga, and a premium monthly experience only Ananta devotees receive.
                </Typography>
                <Typography
                  variant="body2"
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      document.getElementById("plan-ananta")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 300);
                  }}
                  sx={{ color: "#c89b3c", mt: 0.5, cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}
                >
                  Upgrade to Ananta Plan →
                </Typography>
              </Box>
            )}
            {plan.planId === "Advance" && (
              <Typography
                variant="body2"
                sx={{ textAlign: "center", mb: 2, color: "#f5d78e", fontStyle: "italic", px: 1 }}
              >
                🕉️ You have chosen the highest path of devotion. Your seva, your prasad, and your sacred Jyotirlinga — everything is being arranged with complete love and dedication. Har Har Mahadev. 🙏
              </Typography>
            )}
            */}


            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "rgba(234,88,12,0.03)",
                borderRadius: 2,
                border: "1px solid rgba(234,88,12,0.2)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2" sx={{ color: "#7c2d12" }}>
                  Selected Jyotirlinga ({localJyotirlinga.length}):
                </Typography>
                {localJyotirlinga.length < allJyotirlinga.length && (
                  <button
                    onClick={() => {
                      setLocalJyotirlinga(allJyotirlinga);
                      // Lightweight confetti without canvas-confetti library
                      const colors = ["#12c721", "#dde016", "#FFD700", "#98f026", "#ff6b35"];
                      const end = Date.now() + 600;
                      const canvas = document.createElement("canvas");
                      canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999";
                      canvas.width = window.innerWidth;
                      canvas.height = window.innerHeight;
                      document.body.appendChild(canvas);
                      const ctx = canvas.getContext("2d")!;
                      const particles = Array.from({ length: 60 }, () => ({
                        x: Math.random() < 0.5 ? 0 : canvas.width,
                        y: Math.random() * canvas.height,
                        vx: (Math.random() * 4 + 2) * (Math.random() < 0.5 ? 1 : -1),
                        vy: -(Math.random() * 6 + 2),
                        color: colors[Math.floor(Math.random() * colors.length)],
                        size: Math.random() * 6 + 3,
                        gravity: 0.15,
                      }));
                      const frame = () => {
                        if (Date.now() > end) { canvas.remove(); return; }
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        particles.forEach(p => {
                          p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
                          ctx.fillStyle = p.color;
                          ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
                        });
                        requestAnimationFrame(frame);
                      };
                      frame();
                    }}
                    style={{
                      background: "linear-gradient(135deg, #fef08a, #f97316)",
                      color: "#431407",
                      border: "none",
                      borderRadius: "999px",
                      padding: "4px 12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    + Add All 12 Jyotirlinga
                  </button>
                )}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  maxHeight: 220,
                  overflowY: "auto",
                  "&::-webkit-scrollbar": { display: "none" },
                  msOverflowStyle: "none",
                  scrollbarWidth: "none",
                }}
              >
                {sortedSelectedJyotirlinga.map((j) => {
                  const singleTempleBase = Math.round(
                    ((j.price || 0) * plan.pricePercentage) / 100
                  );

                  return (
                    <Box
                      key={j._id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        bgcolor: "rgba(234,88,12,0.1)",
                        p: 1,
                        borderRadius: 1,
                        border: "1px solid rgba(234,88,12,0.2)",
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "#c2410c", fontWeight: "bold" }}
                        >
                          {j.nameEnglish}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#7c2d12" }}>
                          {getMonthBadgeText(j.month, j.startDate, j.endDate)}
                        </Typography>
                        {j.pujaDate && (
                          <Typography variant="caption" sx={{ color: "#ea580c", display: "block" }}>
                            Puja Date: {new Date(j.pujaDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </Typography>
                        )}
                      </Box>

                      <Typography variant="body2" sx={{ color: "#c2410c", fontWeight: 600 }}>
                        {billingMode === "upfront"
                          ? `₹${singleTempleBase.toLocaleString()} once`
                          : `1 monthly cycle`}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box
              component="form"
              noValidate
              autoComplete="off"
              sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
            >
              {/* Mobile first — triggers autofill */}
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <TextField
                  label="Mobile Number *"
                  name="mobile"
                  type="tel"
                  fullWidth
                  value={formData.mobile}
                  onChange={handleInputChange}
                  variant="outlined"
                  error={!!errors.mobile}
                  helperText={errors.mobile}
                  sx={textFieldStyle}
                />
                <TextField
                  label="Email Address (Optional)"
                  name="email"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={handleInputChange}
                  variant="outlined"
                  error={!!errors.email}
                  helperText={errors.email}
                  sx={textFieldStyle}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <TextField
                  label="Full Name *"
                  name="name"
                  fullWidth
                  value={formData.name}
                  onChange={handleInputChange}
                  variant="outlined"
                  error={!!errors.name}
                  helperText={errors.name}
                  sx={textFieldStyle}
                />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <TextField
                    label="Gotra *"
                    name="gotra"
                    fullWidth
                    value={dontKnowGotra ? "" : formData.gotra}
                    onChange={handleInputChange}
                    disabled={dontKnowGotra}
                    variant="outlined"
                    error={!!errors.gotra}
                    helperText={errors.gotra}
                    sx={textFieldStyle}
                  />
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", mt: 0.3 }}
                    onClick={() => {
                      setDontKnowGotra((v) => !v);
                      if (!dontKnowGotra) setFormData((p) => ({ ...p, gotra: "" }));
                    }}
                  >
                    <Box sx={{
                      width: 16, height: 16, border: "1.5px solid #ea580c", borderRadius: "4px",
                      background: dontKnowGotra ? "linear-gradient(135deg,#fef08a,#f97316)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {dontKnowGotra && <span style={{ fontSize: 11, color: "#431407", fontWeight: 900 }}>✓</span>}
                    </Box>
                    <Typography variant="caption" sx={{ color: "#c2410c", userSelect: "none", fontWeight: 500 }}>
                      I don't know my gotra
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box
              // sx={{
              //   mt: 0.5,
              //   p: 1.5,
              //   bgcolor: "rgba(200,155,60,0.1)",
              //   borderRadius: 1,
              //   border: "1px solid rgba(200,155,60,0.3)",
              // }}
              >
                {/* <Typography variant="subtitle2" sx={{ color: "#c89b3c", mb: 1 }}>
                Payment Plan:
              </Typography>

              {!canUseAutopay ? (
                <Typography
                  variant="body1"
                  sx={{ color: "#f5d78e", fontWeight: "bold" }}
                >
                  Pay Full Amount
                </Typography>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  
                  <div
                    onClick={() => setBillingMode("upfront")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: billingMode === "upfront" ? "1px solid rgba(200,155,60,0.5)" : "1px solid rgba(200,155,60,0.15)",
                      background: billingMode === "upfront" ? "rgba(200,155,60,0.08)" : "transparent",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "2px solid #c89b3c",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: billingMode === "upfront" ? "0 0 8px rgba(200,155,60,0.8)" : "none",
                      transition: "box-shadow 0.2s ease",
                    }}>
                      {billingMode === "upfront" && (
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "linear-gradient(135deg, #f5d78e, #c89b3c)" }} />
                      )}
                    </div>
                    <div>
                      <div style={{ color: billingMode === "upfront" ? "#f5d78e" : "#cfc2b0", fontSize: 13, fontWeight: 600 }}>One-time Payment</div>
                      <div style={{ color: "#a89880", fontSize: 11 }}>Pay in full, save more</div>
                    </div>
                  </div>

                 
                  <div
                    onClick={() => setBillingMode("autopay")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: billingMode === "autopay" ? "1px solid rgba(200,155,60,0.5)" : "1px solid rgba(200,155,60,0.15)",
                      background: billingMode === "autopay" ? "rgba(200,155,60,0.08)" : "transparent",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "2px solid #c89b3c",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: billingMode === "autopay" ? "0 0 8px rgba(200,155,60,0.8)" : "none",
                      transition: "box-shadow 0.2s ease",
                    }}>
                      {billingMode === "autopay" && (
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "linear-gradient(135deg, #f5d78e, #c89b3c)" }} />
                      )}
                    </div>
                    <div>
                      <div style={{ color: billingMode === "autopay" ? "#f5d78e" : "#cfc2b0", fontSize: 13, fontWeight: 600 }}>Monthly Autopay</div>
                      <div style={{ color: "#a89880", fontSize: 11 }}>Spread over months</div>
                    </div>
                  </div>
                </div>
              )}

              <Typography
                variant="caption"
                sx={{ display: "block", mt: 1.2, color: "#cfc2b0" }}
              >
                {!canUseAutopay
                  ? "Single Jyotirlinga bookings are available only as full upfront payment."
                  : billingMode === "upfront"
                  ? `Pay once now for all ${selectedCount} selected Jyotirlinga.`
                  : `Step 1 today: UPI mandate registration (typically ₹${MANDATE_AUTH_DISPLAY_AMOUNT}). After that, one monthly debit of ₹${pricing.autopayMonthlyAmount.toLocaleString()} will be triggered for ${pricing.autopayCycles} months.`}
              </Typography> */}
              </Box>

              <Divider sx={{ bgcolor: "rgba(234,88,12,0.2)", my: 0.5 }} />

              <Box
                sx={{
                  p: 1.5,
                  border: "1.5px dashed #ea580c",
                  borderRadius: 2,
                  bgcolor: "rgba(234,88,12,0.04)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1.5,
                  }}
                >
                  <Box>
                    <Typography variant="body1" sx={{ color: "#c2410c", fontWeight: "bold" }}>
                      Family Members
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#ea580c", display: "block", mt: 0.3, fontWeight: 600, fontSize: "0.8rem" }}>
                      🎁 {freeFamilyCount} member{freeFamilyCount !== 1 ? "s" : ""} FREE with {safePlan.name || "this plan"}
                    </Typography>
                    <Box sx={{ display: "inline-flex", alignItems: "center", mt: 0.5, px: 1, py: 0.3, borderRadius: 1, background: "rgba(234,88,12,0.1)", border: "1px solid rgba(234,88,12,0.3)" }}>
                      <Typography sx={{ color: "#c2410c", fontSize: "0.8rem", fontWeight: 700 }}>
                        Additional members: ₹{FAMILY_MEMBER_ADDON_PER_MEMBER}/person
                      </Typography>
                    </Box>
                  </Box>
                  <button
                    type="button"
                    onClick={() => setFamilyMembers((prev) => [...prev, { name: "", gotra: "" }])}
                    style={{
                      background: "linear-gradient(135deg, #fef08a, #f97316)",
                      color: "#431407", border: "none", borderRadius: 999,
                      padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    + Add Member
                  </button>
                </Box>

                {familyMembers.map((member, index) => {
                  const isFree = index < freeFamilyCount;
                  return (
                    <Box
                      key={index}
                      sx={{
                        position: "relative",
                        display: "flex",
                        gap: 1,
                        mb: 1,
                        alignItems: "flex-start",
                        bgcolor: isFree ? "rgba(234,88,12,0.08)" : "rgba(234,88,12,0.02)",
                        p: 1,
                        pt: isFree ? 3.5 : 1,
                        borderRadius: 1.5,
                        border: isFree
                          ? "1px solid rgba(234,88,12,0.4)"
                          : "1px solid rgba(234,88,12,0.15)",
                      }}
                    >
                      {isFree && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 4,
                            left: -18,
                            px: 1,
                            py: 0.35,
                            background: "linear-gradient(90deg, #f97316, #fef08a)",
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            boxShadow: "2px 3px 8px rgba(234,88,12,0.3)",
                            transform: "rotate(-30deg)",
                            transformOrigin: "center",
                          }}
                        >
                          <Typography
                            sx={{
                              color: "#431407",
                              fontSize: "0.62rem",
                              letterSpacing: 1.5,
                              lineHeight: 1,
                            }}
                          >
                            ✦FREE
                          </Typography>
                        </Box>
                      )}

                      <Box
                        sx={{
                          flex: 1,
                          display: "flex",
                          gap: 1,
                          flexDirection: { xs: "column", sm: "row" },
                        }}
                      >
                        <TextField
                          label={`Member ${index + 1} Name`}
                          value={member.name}
                          onChange={(e) =>
                            handleFamilyMemberChange(index, "name", e.target.value)
                          }
                          size="small"
                          fullWidth
                          error={!!familyErrors[index]?.name}
                          helperText={familyErrors[index]?.name}
                          sx={textFieldStyle}
                        />
                        <TextField
                          label="Gotra"
                          value={member.gotra}
                          onChange={(e) =>
                            handleFamilyMemberChange(index, "gotra", e.target.value)
                          }
                          size="small"
                          fullWidth
                          error={!!familyErrors[index]?.gotra}
                          helperText={familyErrors[index]?.gotra}
                          sx={textFieldStyle}
                        />
                      </Box>

                      <IconButton
                        onClick={() => handleRemoveFamilyMember(index)}
                        size="small"
                        sx={{ color: "#ef5350", mt: 0.5, flexShrink: 0 }}
                      >
                        <RemoveCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>

              {isAddressPlan && (
                <Box
                  sx={{
                    p: 1.5,
                    border: "1.5px solid #ea580c",
                    borderRadius: 2,
                    bgcolor: "rgba(234,88,12,0.04)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <HomeIcon sx={{ color: "#ea580c", fontSize: 20 }} />
                    <Typography
                      variant="body1"
                      sx={{ color: "#c2410c", fontWeight: "bold" }}
                    >
                      Prasad Delivery Address
                    </Typography>
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{ color: "#7c2d12", display: "block", mb: 2 }}
                  >
                    Your sacred prasad will be shipped to this address each month after the puja.
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <TextField
                      label="Recipient Name (Optional)"
                      name="addressName"
                      fullWidth
                      value={address.addressName}
                      onChange={handleAddressChange}
                      variant="outlined"
                      size="small"
                      error={!!addressErrors.addressName}
                      helperText={addressErrors.addressName}
                      sx={textFieldStyle}
                    />

                    <TextField
                      label="Address Line 1 *"
                      name="line1"
                      fullWidth
                      value={address.line1}
                      onChange={handleAddressChange}
                      variant="outlined"
                      size="small"
                      error={!!addressErrors.line1}
                      helperText={addressErrors.line1}
                      sx={textFieldStyle}
                    />

                    <TextField
                      label="Address Line 2 (Optional)"
                      name="line2"
                      fullWidth
                      value={address.line2}
                      onChange={handleAddressChange}
                      variant="outlined"
                      size="small"
                      sx={textFieldStyle}
                    />

                    <Box
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        flexDirection: { xs: "column", sm: "row" },
                      }}
                    >
                      <TextField
                        label="City *"
                        name="city"
                        fullWidth
                        value={address.city}
                        onChange={handleAddressChange}
                        variant="outlined"
                        size="small"
                        error={!!addressErrors.city}
                        helperText={addressErrors.city}
                        sx={textFieldStyle}
                      />
                      <TextField
                        label="State *"
                        name="state"
                        fullWidth
                        value={address.state}
                        onChange={handleAddressChange}
                        variant="outlined"
                        size="small"
                        error={!!addressErrors.state}
                        helperText={addressErrors.state}
                        sx={textFieldStyle}
                      />
                    </Box>

                    <TextField
                      label="PIN Code *"
                      name="pinCode"
                      fullWidth
                      value={address.pinCode}
                      onChange={handleAddressChange}
                      variant="outlined"
                      size="small"
                      inputProps={{ maxLength: 6 }}
                      error={!!addressErrors.pinCode}
                      helperText={addressErrors.pinCode}
                      sx={textFieldStyle}
                    />
                  </Box>
                </Box>
              )}
            </Box>

            {/* Coupon Section */}
            <Box sx={{ px: { xs: 2, md: 3 }, mt: 2, mb: 1 }}>
              {!appliedCoupon ? (
                <Box>
                  {!showCouponInput ? (
                    <Typography
                      onClick={() => setShowCouponInput(true)}
                      variant="caption"
                      sx={{
                        color: "rgba(234,88,12,0.7)",
                        cursor: "pointer",
                        textDecoration: "underline",
                        "&:hover": { color: "#c2410c" },
                      }}
                    >
                      Have a coupon code?
                    </Typography>
                  ) : (
                    <Box>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <TextField
                          placeholder="Coupon code"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value);
                            if (couponError) setCouponError("");
                          }}
                          size="small"
                          sx={{ flex: 1, ...textFieldStyle }}
                        />
                        <Button
                          onClick={handleApplyCoupon}
                          variant="outlined"
                          sx={{
                            color: "#ea580c",
                            borderColor: "#ea580c",
                            fontSize: "0.75rem",
                            px: 1,
                            "&:hover": { borderColor: "#c2410c", color: "#c2410c" },
                          }}
                        >
                          Apply
                        </Button>
                      </Box>
                      {couponError && (
                        <Typography variant="caption" sx={{ color: "#ef5350", mt: 0.5, display: "block" }}>
                          {couponError}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: "rgba(76, 175, 80, 0.1)",
                    border: "1px dashed #4caf50",
                    p: 1.5,
                    borderRadius: 1.5,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ color: "#4caf50", fontWeight: 600 }}>
                      '{appliedCoupon.code}' Applied!
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#81c784" }}>
                      Special discount applied! Final amount: ₹1
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={handleRemoveCoupon}
                    sx={{ color: "#ef5350", minWidth: "auto", textTransform: "none" }}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Box>

            {/* End scrollable area */}
          </Box>

          {/* Fixed payment section */}
          <Box
            sx={{
              pt: 2,
              pb: { xs: 2, md: 3 },
              px: { xs: 2, md: 3 },
              borderTop: "1px solid rgba(234,88,12,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              bgcolor: "#fff7ed",
            }}
          >
            {billingMode === "upfront" ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "#7c2d12", display: "block" }}
                  >
                    Pay Full Amount:
                  </Typography>
                  {pricing.upfrontDiscountAmount > 0 && (
                    <>
                      <Typography variant="caption" sx={{ color: "#9a3412", display: "block", textDecoration: "line-through" }}>
                        Original: ₹{(pricing.planAdjustedBase + pricing.familyAddOnTotal).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#15803d", display: "block", fontWeight: 600 }}>
                        🎉 You save ₹{pricing.upfrontDiscountAmount.toLocaleString()} ({pricing.upfrontDiscountPercent}% off)
                      </Typography>
                    </>
                  )}
                  {pricing.familyAddOnTotal > 0 && (
                    <Typography variant="caption" sx={{ color: "#ea580c", display: "block" }}>
                      Family Add-on: ₹{pricing.familyAddOnTotal.toLocaleString()}
                    </Typography>
                  )}
                </Box>

                <Typography
                  variant="h4"
                  sx={{ color: "#c2410c", fontWeight: "bold" }}
                >
                  ₹{pricing.upfrontTotal.toLocaleString()}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "#7c2d12", display: "block" }}
                  >
                    UPI AutoPay Mandate:
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#7c2d12", display: "block" }}>
                    Today: mandate registration
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#9a3412" }}>
                    Future debits: ₹{pricing.autopayMonthlyAmount.toLocaleString()} ×{" "}
                    {pricing.autopayCycles} months = ₹
                    {pricing.autopayTotalJourney.toLocaleString()}
                  </Typography>
                  {pricing.familyAddOnTotal > 0 && (
                    <Typography variant="caption" sx={{ color: "#ea580c", display: "block" }}>
                      Family Add-on included: ₹{pricing.familyAddOnTotal.toLocaleString()}
                    </Typography>
                  )}
                </Box>

                <Typography
                  variant="h4"
                  sx={{ color: "#c2410c", fontWeight: "bold" }}
                >
                  ₹{pricing.autopayMonthlyAmount.toLocaleString()}/mo
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              fullWidth
              disabled={loading}
              onClick={handlePay}
              sx={{
                background: "linear-gradient(135deg, #fef08a, #f97316, #ea580c)",
                color: "#431407",
                fontWeight: "bold",
                py: 1.5,
                fontSize: "1rem",
                letterSpacing: "0.05em",
                boxShadow: "0 4px 20px rgba(234,88,12,0.4)",
                "&:hover": {
                  background: "linear-gradient(135deg, #fde047, #ea580c, #c2410c)",
                  boxShadow: "0 6px 24px rgba(234,88,12,0.5)",
                },
                "&.Mui-disabled": {
                  background: "rgba(234,88,12,0.25)",
                  color: "#9a3412",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: "#431407" }} />
              ) : (
                ctaText
              )}
            </Button>
          </Box>
        </Box>
      </Modal>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", fontFamily: "Cinzel, serif" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      {verifying && <PaymentLoader />}
    </>
  );
};

const textFieldStyle = {
  "& .MuiOutlinedInput-input": {
    padding: "9px 12px",
  },
  "& .MuiOutlinedInput-root": {
    color: "#431407",
    fontSize: "0.9rem",
    backgroundColor: "#ffffff",
    "& fieldset": {
      borderColor: "rgba(234, 88, 12, 0.35)",
    },
    "&:hover fieldset": {
      borderColor: "#ea580c",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#c2410c",
    },
    "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active":
    {
      WebkitBoxShadow: "0 0 0 1000px #ffffff inset",
      WebkitTextFillColor: "#431407",
      caretColor: "#431407",
      borderRadius: "inherit",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#9a3412",
    fontSize: "0.875rem",
    "&:not(.MuiInputLabel-shrink)": {
      transform: "translate(14px, 9px) scale(1)",
    },
    "&.Mui-focused": {
      color: "#c2410c",
    },
  },
  "& .MuiFormHelperText-root": {
    color: "#ef9a9a",
    "&.Mui-error": {
      color: "#ef5350",
    },
  },
};

export default PlanSubscriptionModal;