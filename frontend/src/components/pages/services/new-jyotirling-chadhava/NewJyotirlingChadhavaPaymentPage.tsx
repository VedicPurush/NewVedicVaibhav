"use client";

// NewJyotirlingChadhavaPaymentPage.tsx
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { AnimatePresence, motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import "./NewJyotirlingChadhavaPaymentPage.css";
import { api } from "@/lib/api";
import { orderRequestFields, useMoney, shipsPrasad, toInr, localizeCopy, sanitizePhone, isValidPhone } from "@/lib/currency";
import { readNavState, saveNavState } from "@/lib/nav-state";
import { gtag } from "@/lib/gtag";
import { getVvUtm } from "@/lib/utm";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";

// --- Meta Pixel safe tracker (queues until fbq is ready) ---
const isFbq = (fn: unknown): fn is (...args: any[]) => void =>
  typeof fn === 'function';

const fbqTrack = (event: string, params?: Record<string, any>, options?: { eventID?: string }) => {
  if (typeof window === 'undefined') return;

  const fbq = (window as any).fbq;
  if (isFbq(fbq)) {
    try {
      fbq('track', event, params || {}, options);
    } catch (e) {
      console.warn('fbq track failed', e);
    }
    return;
  }

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

declare global {
  interface Window {
    Razorpay: any;
  }
}

const JYOTIRLING_COUPONS = [
  { code: "SHIVA50", label: "Auspicious ₹50 Off on Seva", discount: 50, minPackagePrice: 300, visible: true },
  { code: "KEDAR100", label: "Kedarnath Blessing ₹80 Off", discount: 80, minPackagePrice: 800, visible: true },
  { code: "MAHADEV150", label: "Mahadev Kripa ₹150 Off", discount: 150, minPackagePrice: 1500, visible: true },
  { code: "RUDRA250", label: "Rudra Divine ₹200 Off", discount: 200, minPackagePrice: 2500, visible: true },
  { code: "TYAGI@19", label: "Special Testing Code", discount: 999999, minPackagePrice: 0, visible: false },
];

const EXTRA_MEMBER_RATE = 50;

const InlineError = ({ message }: { message?: string }) => (
  <AnimatePresence mode="wait">
    {message && (
      <motion.div
        initial={{ opacity: 0, y: -5, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -5, height: 0 }}
        transition={{ duration: 0.2 }}
        style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", overflow: "hidden" }}
      >
        <span style={{ fontSize: "12px", color: "#ef4444", backgroundColor: "#fee2e2", borderRadius: "9999px", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0 }}>!</span>
        <span style={{ fontSize: "13px", fontWeight: 500, color: "#ef4444", fontFamily: "serif", letterSpacing: "0.025em" }}>{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

const ModernInput = ({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  error,
  touched,
  maxLength,
  pattern,
  inputMode,
  disabled,
  id
}: any) => {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <label style={{ fontSize: "0.85rem", color: "#4b5563", marginBottom: "0.25rem", display: "block", fontWeight: 600 }}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        style={{
          width: "100%",
          padding: "0.6rem 0.75rem",
          borderRadius: "0.5rem",
          border: error && touched ? "1px solid #ef4444" : "1px solid #d1d5db",
          fontSize: "1rem",
          backgroundColor: disabled ? "#f3f4f6" : "#f9fafb",
          outline: "none"
        }}
        placeholder={placeholder}
        type={type}
        maxLength={maxLength}
        pattern={pattern}
        inputMode={inputMode}
        disabled={disabled}
      />
      <InlineError message={touched ? error : ""} />
    </div>
  );
};

const PageContent = () => {
  /**
   * Every price here renders through `money()` — the India list price converted
   * into the devotee's own currency for DISPLAY only. `totalPrice` POSTED to the
   * server stays the India list total; the server owns the markup.
   */
  const { money, country } = useMoney();
  const router = useRouter();

  // react-router carried this via location.state; in Next it comes from sessionStorage.
  const [state, setState] = useState<Record<string, any>>({});
  const [stateLoaded, setStateLoaded] = useState(false);

  useEffect(() => {
    setState(readNavState<Record<string, any>>("jyotirling-chadhava-payment") ?? {});
    setStateLoaded(true);
  }, []);

  const selectedJyotirlingIds: string[] = state.selectedJyotirlingIds || [];
  const selectedOfferings: string[] = state.selectedOfferings || [];
  const bookedTemples: any[] = state.selectedTemplesData || [];
  const selectedOfferingObjs: any[] = state.selectedOfferingsData || [];
  const incomingTotalAmount: number = state.totalAmount || 0;

  // Devotee Details Form
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [devoteeName, setDevoteeName] = useState("");
  const [gotra, setGotra] = useState("");
  const [dontKnowGotra, setDontKnowGotra] = useState(false);
  const [family, setFamily] = useState<string[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Unique Booking Session ID for tracking abandoned carts
  const [bookingSessionId] = useState(() => `JYOTIR_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
  const lastSavedPhoneRef = useRef("");
  const abandonedCartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** ⚠️ Physical goods, home market only — and decided at PAYMENT time, so a
   *  country switch after the prasad was selected cannot slip an unshippable
   *  item into the order. See NewChadhavaPaymentPage for the full note. */
  const needPrasad: boolean = (state.needPrasad || false) && shipsPrasad();
  const prasad: any = state.prasad || null;
  const needAddress = needPrasad;

  const [address, setAddress] = useState({
    address1: "",
    postal: "",
    city: "",
    state: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // ViewContent — fire when payment page loads
    fbqTrack("ViewContent", {
      content_ids: ["jyotirling_chadhava_checkout"],
      content_name: "Jyotirlinga Chadhava Checkout",
      content_category: "Jyotirlinga Chadhava",
      content_type: "product",
      currency: "INR",
    });
    gtag("event", "view_item", {
      currency: "INR",
      items: [{
        item_id: "jyotirling_chadhava_checkout",
        item_name: "Jyotirlinga Chadhava Checkout",
        item_category: "Jyotirlinga Chadhava",
      }],
    });
  }, []);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const lastFetchedPhoneRef = useRef<string>("");
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isValidIndianMobile = (s: string) => /^[6-9]\d{9}$/.test(s);

  const fetchUserDetails = async (phone: string) => {
    const clearFields = () => {
      setDevoteeName("");
      setGotra("");
      setAddress({ address1: "", postal: "", city: "", state: "" });
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
        if (full) setDevoteeName(full);

        if (data.user.gotra) setGotra(data.user.gotra);

        setAddress({
          address1: data.user.address1 || "",
          postal: data.user.pincode || "",
          city: data.user.city || "",
          state: data.user.state || "",
        });

        if (data.user.familyMembers && Array.isArray(data.user.familyMembers)) {
          setFamily(data.user.familyMembers);
        }
      } else {
        clearFields();
      }
    } catch (e: any) {
      if (e.response && e.response.status === 404) {
        clearFields();
      } else {
        console.log("Details fetch failed", e);
      }
    }
  };

  useEffect(() => {
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
    }

    const cleanedPhone = whatsappNumber.replace(/\D/g, "");
    if (isValidIndianMobile(cleanedPhone) && cleanedPhone !== lastFetchedPhoneRef.current) {
      lastFetchedPhoneRef.current = cleanedPhone;
      fetchTimerRef.current = setTimeout(() => {
        fetchUserDetails(cleanedPhone);
      }, 500);
    }

    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
    };
  }, [whatsappNumber]);

  const validateField = (field: string, value: any) => {
    let error = "";
    switch (field) {
      case "whatsappNumber":
        if (!value) error = "Mobile number is required.";
        else if (!isValidPhone(value, country)) error = "Enter a valid mobile number.";
        break;
      case "devoteeName":
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
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
    return error;
  };

  const handleBlur = (field: string, value: any) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  // Coupon State
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [showCouponPanel, setShowCouponPanel] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, _setShowSuccessModal] = useState(false);

  useEffect(() => {
    // Redirect if no data
    if (stateLoaded && (selectedJyotirlingIds.length === 0 || selectedOfferings.length === 0)) {
      router.push("/services/new-jyotirling-chadhava");
    }
  }, [stateLoaded, selectedJyotirlingIds, selectedOfferings, router]);

  useEffect(() => {
    const savedName = localStorage.getItem("userName");
    const savedPhone = localStorage.getItem("userPhone");
    const savedGotra = localStorage.getItem("userGotra");
    if (savedName) setDevoteeName(savedName);
    if (savedPhone) setWhatsappNumber(savedPhone);
    if (savedGotra) setGotra(savedGotra);

    try {
      const stored = localStorage.getItem("userDetails");
      if (stored) {
        const parsed = JSON.parse(stored);
        const user = parsed.user;
        if (user) {
          if (!savedName) {
            const fName = user.firstname || user.firstName || user.given_name || "";
            const lName = user.lastname || user.lastName || user.family_name || "";
            const fullName = `${fName} ${lName}`.trim();
            if (fullName) setDevoteeName(fullName);
          }
          if (!savedPhone) {
            let ph = user.phone || "";
            ph = ph.replace(/\D/g, "");
            if (ph.length === 12 && ph.startsWith("91")) ph = ph.slice(2);
            if (ph.length > 10) ph = ph.slice(-10);
            if (ph) setWhatsappNumber(ph);
          }
          if (!savedGotra && user.gotra) setGotra(user.gotra);

          let addr1 = user.address1 || "";
          let cityVal = user.city || "";
          let stateVal = user.state || "";
          let postalVal = user.pincode || "";

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

    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const numSelectedTemples = selectedJyotirlingIds.length;

  const baseAmount = incomingTotalAmount || selectedOfferingObjs.reduce((sum, off) => sum + ((off.price || 0) * numSelectedTemples), 0);
  const totalOriginalAmount = selectedOfferingObjs.reduce((sum, off) => sum + ((off.originalPrice || off.price || 0) * numSelectedTemples), 0);
  const totalSavings = Math.max(totalOriginalAmount - baseAmount, 0);

  // Family and Pricing Calculation
  const extraCharges = family.length * EXTRA_MEMBER_RATE;

  // Coupon Logic
  const visibleCoupons = JYOTIRLING_COUPONS.filter((c) => c.visible);
  const discountAmount = appliedCoupon ? Math.min(appliedCoupon.discount, baseAmount + extraCharges - 1) : 0;

  const finalAmount = Math.max(baseAmount + extraCharges - discountAmount, 1);

  // Handlers
  const addFamilyMember = () => setFamily((prev) => [...prev, ""]);
  const updateFamilyMember = (i: number, v: string) => setFamily((prev) => { const arr = [...prev]; arr[i] = v; return arr; });
  const removeFamilyMember = (i: number) => setFamily((prev) => prev.filter((_, idx) => idx !== i));

  const applyCoupon = (code: string) => {
    const found = JYOTIRLING_COUPONS.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!found) {
      setCouponError("Invalid coupon code.");
      return;
    }
    if (baseAmount < found.minPackagePrice) {
      setCouponError(`This coupon is valid for packages ${money(found.minPackagePrice)}+.`);
      return;
    }
    setAppliedCoupon(found);
    setCouponError("");
    setCouponInput(found.code);
    setShowCouponPanel(false);
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponInput(""); setCouponError(""); };

  // Background Abandoned Cart Trigger
  const saveAbandonedCart = async (phone: string, isForcedStatus?: string) => {
    try {
      const cleaned = sanitizePhone(phone, country);
      if (!isValidPhone(cleaned, country)) return;

      lastSavedPhoneRef.current = cleaned;

      await api.post("/api/jyotirling-chadhava/abandoned-cart", {
        ...orderRequestFields(),
        whatsapp: cleaned,
        bookingSessionId,
        name: devoteeName,
        gotra: dontKnowGotra ? "Kashyap" : gotra,
        familyMembers: family,
        selectedTemples: bookedTemples.map((t: any) => ({
          ...t,
          image: typeof t.image === "object" ? t.image?.location : t.image
        })),
        selectedOfferings: selectedOfferingObjs.map((o: any) => ({
          ...o,
          image: typeof o.image === "object" ? o.image?.location : o.image
        })),
        totalPrice: finalAmount,
        familyMemberExtraCharge: extraCharges,
        devicePlatform: "web",
        bookingSource: "New Jyotirling Page",
        address: needAddress ? address : null,
        prasadDetails: needPrasad ? prasad : null,
        status: isForcedStatus || "abandoned_cart",
        vv_utm: getVvUtm(),
        pageStep: "checkout",
      });
    } catch (err) {
      console.warn("Silent abandoned cart save failed", err);
    }
  };

  const handlePaymentExitOrFailure = async () => {
    if (isValidPhone(whatsappNumber, country)) {
      saveAbandonedCart(whatsappNumber, "abandoned_cart");
    }
  };

  useEffect(() => {
    if (!isValidPhone(whatsappNumber, country)) {
      return; // incomplete or invalid number, do not save
    }

    if (abandonedCartTimerRef.current) {
      clearTimeout(abandonedCartTimerRef.current);
    }

    // Save immediately if this phone has never been saved before in this session
    const cleaned = sanitizePhone(whatsappNumber, country);
    if (lastSavedPhoneRef.current !== cleaned) {
      lastSavedPhoneRef.current = cleaned;
      saveAbandonedCart(whatsappNumber);
      return;
    }

    // Otherwise, debounce the save (e.g. for changes in other fields)
    abandonedCartTimerRef.current = setTimeout(() => {
      saveAbandonedCart(whatsappNumber);
    }, 1000);

    return () => {
      if (abandonedCartTimerRef.current) {
        clearTimeout(abandonedCartTimerRef.current);
      }
    };
  }, [
    whatsappNumber,
    devoteeName,
    gotra,
    dontKnowGotra,
    family,
    bookedTemples,
    selectedOfferingObjs,
    finalAmount,
    extraCharges,
    address,
    prasad
  ]);

  const handlePayAndBook = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // --- ROBUST VALIDATION ---
    const newErrors: { [key: string]: string } = {};
    let firstErrorField = "";

    if (!whatsappNumber.trim()) {
      newErrors.whatsappNumber = "Mobile number is required.";
    } else if (!isValidPhone(whatsappNumber, country)) {
      newErrors.whatsappNumber = "Enter a valid mobile number.";
    }
    if (newErrors.whatsappNumber && !firstErrorField) firstErrorField = "whatsappNumber";

    if (!devoteeName.trim()) {
      newErrors.devoteeName = "Name is required.";
    } else if (devoteeName.trim().length < 3) {
      newErrors.devoteeName = "Name must be at least 3 characters.";
    }
    if (newErrors.devoteeName && !firstErrorField) firstErrorField = "devoteeName";

    if (needAddress) {
      if (!address.address1.trim()) {
        newErrors.address1 = "Address is required.";
      } else if (address.address1.trim().length < 10) {
        newErrors.address1 = "Please enter a complete address (min 10 chars).";
      }
      if (newErrors.address1 && !firstErrorField) firstErrorField = "address1-input";

      if (!address.postal) {
        newErrors.postal = "PIN Code is required.";
      } else if (!/^[1-9]\d{5}$/.test(address.postal)) {
        newErrors.postal = "Invalid PIN Code.";
      }
      if (newErrors.postal && !firstErrorField) firstErrorField = "postal-input";

      if (!address.city.trim()) newErrors.city = "City is required.";
      if (newErrors.city && !firstErrorField) firstErrorField = "city-input";

      if (!address.state.trim()) newErrors.state = "State is required.";
      if (newErrors.state && !firstErrorField) firstErrorField = "state-input";
    }

    if (!dontKnowGotra && !gotra.trim()) {
      newErrors.gotra = "Please enter Gotra or check 'I don't know my Gotra'.";
      if (!firstErrorField) firstErrorField = "gotra";
    }

    setErrors(newErrors);
    setTouched({
      whatsappNumber: true,
      devoteeName: true,
      address1: true,
      postal: true,
      city: true,
      state: true,
      gotra: true,
    });

    if (Object.keys(newErrors).length > 0) {
      let userErrorMsg = newErrors[firstErrorField];
      if (
        firstErrorField === "address1-input" ||
        firstErrorField === "postal-input" ||
        firstErrorField === "city-input" ||
        firstErrorField === "state-input"
      ) {
        userErrorMsg = "Please fill in your delivery address.";
      }
      setToastMessage(userErrorMsg);

      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus();
      }
      return;
    }

    setIsSubmitting(true);

    // Save locally
    localStorage.setItem("userName", devoteeName);
    localStorage.setItem("userPhone", whatsappNumber);
    if (!dontKnowGotra) localStorage.setItem("userGotra", gotra);

    // Auto-login logic
    try {
      const { data } = await api.post("/phone-login-or-register", {
        phone: whatsappNumber,
        name: devoteeName,
      });

      if (data && data.user) {
        localStorage.setItem("userDetails", JSON.stringify(data));
        const customEvent = new CustomEvent("userLoginSuccess", { detail: data });
        window.dispatchEvent(customEvent);
      }
    } catch (err) {
      console.warn("Auto-login failed:", err);
    }

    // Track InitiateCheckout
    fbqTrack("InitiateCheckout", {
      content_ids: selectedOfferings,
      content_name: "Jyotirlinga Chadhava",
      content_category: "Jyotirlinga Chadhava",
      content_type: "product",
      value: toInr(finalAmount),
      currency: "INR",
    });
    gtag("event", "begin_checkout", {
      currency: "INR",
      value: toInr(finalAmount),
      items: selectedOfferingObjs.map((o: any) => ({
        item_id: o.id,
        item_name: o.name,
        item_category: "Jyotirlinga Chadhava",
        price: o.price,
        quantity: numSelectedTemples || 1,
      })),
    });

    try {
      // 1. Initiate Payment
      const initRes = await api.post("/api/jyotirling-chadhava/initiate-payment", {
        // Presentment request only — `totalPrice` below stays the India list
        // total and the server applies the foreign markup. See lib/currency.ts.
        ...orderRequestFields(),
        name: devoteeName,
        whatsapp: whatsappNumber,
        gotra: dontKnowGotra ? "Kashyap" : gotra,
        familyMembers: family,
        selectedTemples: bookedTemples.map((t: any) => ({
          ...t,
          image: typeof t.image === "object" ? t.image?.location : t.image
        })),
        selectedOfferings: selectedOfferingObjs.map((o: any) => ({
          ...o,
          image: typeof o.image === "object" ? o.image?.location : o.image
        })),
        totalPrice: finalAmount,
        familyMemberExtraCharge: extraCharges,
        devicePlatform: "web",
        bookingSource: "New Jyotirling Page",
        fbp: getFbp() || undefined,
        fbc: getFbc() || undefined,
        eventSourceUrl: window.location.href,
        address: needAddress ? address : null,
        prasadDetails: needPrasad ? prasad : null,
        bookingSessionId,
        vv_utm: getVvUtm(),
        pageStep: "checkout",
      });

      if (!initRes.data.success) {
        throw new Error(initRes.data.message || "Payment initiation failed");
      }

      const { orderID, razorpayOrderId, amount, currency, chargedAmount, key } = initRes.data;

      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: "Vedic Vaibhav",
        description: "Jyotirlinga Chadhava Seva",
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          try {
            // 2. Verify Payment. The payment is already captured at this point, and
            // this endpoint additionally re-fetches the payment from Razorpay — so a
            // slow gateway or the webhook finalising first must not read as a
            // failure. Retry before giving up (see lib/verify-payment.ts).
            const outcome = await verifyPaymentWithRetry<any>({
              attempt: async () =>
                (
                  await api.post("/api/jyotirling-chadhava/verify-payment", {
                    orderID: orderID,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                  })
                ).data,
            });

            if (outcome.status !== "declined") {
              // Track Purchase
              fbqTrack("Purchase", {
                content_ids: selectedOfferings,
                content_name: "Jyotirlinga Chadhava",
                content_category: "Jyotirlinga Chadhava",
                content_type: "product",
                value: toInr(finalAmount),
                currency: "INR",
                num_items: selectedOfferings.length,
              }, { eventID: `jyotirling_chadhava_purchase_${orderID}` });

              gtag("event", "purchase", {
                transaction_id: orderID,
                value: toInr(finalAmount),
                currency: "INR",
                items: selectedOfferingObjs.map((o: any) => ({
                  item_id: o.id,
                  item_name: o.name,
                  item_category: "Jyotirlinga Chadhava",
                  price: o.price,
                  quantity: numSelectedTemples || 1,
                })),
              });

              setIsSubmitting(false);
              saveNavState("jyotirling-chadhava-success", {
                devoteeName,
                whatsappNumber,
                gotra: dontKnowGotra ? "Kashyap" : gotra,
                family,
                bookedTemples,
                selectedOfferingObjs,
                finalAmount,
                orderID,
                transactionID: response.razorpay_payment_id,
                // The receipt on the success page must show what the card was
                // ACTUALLY billed, not the India list total re-priced by
                // whatever country happens to be active when it renders.
                currency,
                chargedAmount,
              });
              router.push("/services/new-jyotirling-chadhava/success");
            } else {
              // Track PaymentInfoFailed
              fbqTrack("PaymentInfoFailed", {
                content_ids: selectedOfferings,
                content_name: "Jyotirlinga Chadhava",
                content_category: "Jyotirlinga Chadhava",
                value: toInr(finalAmount),
                currency: "INR",
                reason: "Payment verification failed"
              });

              setIsSubmitting(false);
              saveNavState("jyotirling-chadhava-failure", {
                orderID,
                finalAmount,
                errorReason: "Payment verification failed"
              });
              router.push("/services/new-jyotirling-chadhava/failure");
            }
          } catch (err) {
            console.error("Verification error:", err);

            // Track PaymentInfoFailed
            fbqTrack("PaymentInfoFailed", {
              content_ids: selectedOfferings,
              content_name: "Jyotirlinga Chadhava",
              content_category: "Jyotirlinga Chadhava",
              value: toInr(finalAmount),
              currency: "INR",
              reason: "An error occurred during payment verification."
            });

            setIsSubmitting(false);
            saveNavState("jyotirling-chadhava-failure", {
              orderID,
              finalAmount,
              errorReason: "An error occurred during payment verification."
            });
            router.push("/services/new-jyotirling-chadhava/failure");
          }
        },
        prefill: {
          name: devoteeName,
          contact: whatsappNumber,
          email: `${whatsappNumber}@gmail.com`,
        },
        theme: {
          color: "#0d52a2",
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            handlePaymentExitOrFailure();
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        console.error("Razorpay Payment Failed:", response.error.description);
        handlePaymentExitOrFailure();

        // Track PaymentInfoFailed
        fbqTrack("PaymentInfoFailed", {
          content_ids: selectedOfferings,
          content_name: "Jyotirlinga Chadhava",
          content_category: "Jyotirlinga Chadhava",
          value: toInr(finalAmount),
          currency: "INR",
          reason: response.error.description || "Payment failed or cancelled."
        });

        setIsSubmitting(false);
        saveNavState("jyotirling-chadhava-failure", {
          orderID,
          finalAmount,
          errorReason: response.error.description || "Payment failed or cancelled."
        });
        router.push("/services/new-jyotirling-chadhava/failure");
      });
      rzp.open();


    } catch (error: any) {
      console.error("Payment initiation error:", error);
      alert(error?.response?.data?.message || "Failed to initiate payment. Please try again later.");
      setIsSubmitting(false);
    }
  };

  if (!stateLoaded) return null;

  return (
    <div className="payment-page-container">
      {/* Top Animated Error Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: "-50%" }}
            animate={{ opacity: 1, y: 20, x: "-50%" }}
            exit={{ opacity: 0, y: -100, x: "-50%" }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              position: "fixed",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 99999,
              backgroundColor: "rgba(254, 242, 242, 0.95)", // soft red
              backdropFilter: "blur(8px)",
              border: "1px solid #fee2e2",
              borderLeft: "4px solid #ef4444", // strong red indicator
              borderRadius: "0.75rem",
              padding: "0.75rem 1.25rem",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              maxWidth: "90%",
              width: "400px",
            }}
          >
            <span style={{ fontSize: "1.25rem", color: "#ef4444" }}>⚠️</span>
            <div style={{ flex: 1, fontSize: "0.9rem", fontWeight: 600, color: "#991b1b" }}>
              {toastMessage}
            </div>
            <button
              onClick={() => setToastMessage(null)}
              style={{
                background: "none",
                border: "none",
                color: "#f87171",
                cursor: "pointer",
                fontSize: "1.1rem",
                padding: "0 4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Section */}
      <div className="summary-section">
        <h2 className="summary-title">Chadhava Summay</h2>
        <div className="summary-card">
          <div className="selected-temples-label">Selected Jyotirlinga ({numSelectedTemples})</div>
          <div className="temple-tags">
            {bookedTemples.map(t => <span key={t.id} className="temple-tag">{t.nameEnglish}</span>)}
          </div>

          <table className="summary-table">
            <thead>
              <tr>
                <th>Offering</th>
                <th>Price</th>
                <th>Temple</th>
                <th className="total-col">Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedOfferingObjs.map(off => (
                <tr key={off.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "#1f2937" }}>{off.name}</div>
                    {(off.description || off.shortDescription) && (
                      <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px", fontWeight: 400, lineHeight: "1.3" }}>
                        {off.description || off.shortDescription}
                      </div>
                    )}
                  </td>
                  <td>
                    {off.originalPrice && off.originalPrice > off.price ? (
                      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                        {/* <span style={{ textDecoration: "line-through", color: "#9ca3af", fontSize: "12px" }}>{money(off.originalPrice)}</span> */}
                        <span>{money(off.price)}</span>
                      </div>
                    ) : (
                      <>{money(off.price)}</>
                    )}
                  </td>
                  <td>x {numSelectedTemples}</td>
                  <td className="total-col">
                    {off.originalPrice && off.originalPrice > off.price ? (
                      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                        <span style={{ textDecoration: "line-through", color: "#9ca3af", fontSize: "12px" }}>{money(off.originalPrice * numSelectedTemples)}</span>
                        <span>{money(off.price * numSelectedTemples)}</span>
                      </div>
                    ) : (
                      <>{money(off.price * numSelectedTemples)}</>
                    )}
                  </td>
                </tr>
              ))}
              {needPrasad && prasad && (
                <tr>
                  <td>{prasad.name}</td>
                  <td>{money(298)}</td>
                  <td>x {numSelectedTemples}</td>
                  <td className="total-col">{money(prasad.price)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="summary-divider"></div>

          <div className="sub-total-row">
            <span>Sub Total</span>
            <span>{money(baseAmount)}</span>
          </div>

          {totalSavings > 0 && (
            <div className="savings-row">
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span className="savings-icon">%</span>
                YAY! You have saved {money(totalSavings)}
              </span>
            </div>
          )}

          {/* Additional Charges and Discounts on Summary */}
          {extraCharges > 0 && (
            <div className="sub-total-row" style={{ color: '#0d52a2', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              <span>Family Members ({family.length} × {money(EXTRA_MEMBER_RATE)})</span>
              <span>+ {money(extraCharges)}</span>
            </div>
          )}
          {appliedCoupon && (
            <div className="sub-total-row" style={{ color: '#059669', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              <span>Discount ({appliedCoupon.code})</span>
              <span>- {money(discountAmount)}</span>
            </div>
          )}

          <div className="payable-row">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#d97706"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2z" /></svg>
              Total Payable Amount
            </span>
            <span>{money(finalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Devotee Form Section */}
      <div className="summary-section">
        <div className="summary-card">
          <h2 className="summary-title" style={{ fontSize: '0.9rem' }}>Devotee Details (Sankalp)</h2>
          <form id="payment-form" onSubmit={handlePayAndBook}>

            {/* 1. WhatsApp Number (Moved to top as requested) */}
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.25rem', display: 'block' }}>WhatsApp Number</label>
              <div style={{
                display: "flex",
                alignItems: "stretch",
                borderRadius: '0.5rem',
                border: errors.whatsappNumber && touched.whatsappNumber ? '1px solid #ef4444' : '1px solid #d1d5db',
                backgroundColor: '#f9fafb',
                overflow: 'hidden',
              }}>
                {/* A fixed-offset absolute badge overlapped the typed digits whenever
                    it rendered wider than assumed — e.g. Windows has no flag-emoji
                    ligature and falls back to two separate letter glyphs (IN), and a
                    3-digit dial code (+971) is wider still. A flex sibling reserves
                    exactly the width the badge needs, for any country. */}
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0 0.6rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: "#4b5563",
                  whiteSpace: 'nowrap',
                  borderRight: '1px solid #d1d5db',
                  flexShrink: 0,
                }}>
                  {country.flag} +{country.dial}
                </span>
                <input
                  id="whatsappNumber"
                  type="tel"
                  required
                  className="form-input"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '0.6rem 0.75rem',
                    border: 'none',
                    fontSize: '1rem',
                    backgroundColor: 'transparent',
                    outline: 'none',
                    fontWeight: 600
                  }}
                  placeholder={country.iso2 === "IN" ? "Enter 10-digit mobile number" : "Mobile number"}
                  value={whatsappNumber}
                  onChange={(e) => {
                    const digits = sanitizePhone(e.target.value, country);
                    setWhatsappNumber(digits);
                    if (touched.whatsappNumber) validateField("whatsappNumber", digits);
                  }}
                  onBlur={() => handleBlur("whatsappNumber", whatsappNumber)}
                />
              </div>
              <InlineError message={touched.whatsappNumber ? errors.whatsappNumber : ""} />
            </div>

            {/* 2. Devotee Full Name */}
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.25rem', display: 'block' }}>Devotee Full Name</label>
              <input
                id="devoteeName"
                type="text"
                required
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: errors.devoteeName && touched.devoteeName ? '1px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '1rem',
                  backgroundColor: '#f9fafb',
                  outline: 'none'
                }}
                placeholder="Enter devotee name"
                value={devoteeName}
                onChange={(e) => {
                  setDevoteeName(e.target.value);
                  if (touched.devoteeName) validateField("devoteeName", e.target.value);
                }}
                onBlur={() => handleBlur("devoteeName", devoteeName)}
              />
              <InlineError message={touched.devoteeName ? errors.devoteeName : ""} />
            </div>

            {/* 3. Gotra */}
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.25rem', display: 'block' }}>Gotra (Clan Name)</label>
              <input
                id="gotra"
                type="text"
                disabled={dontKnowGotra}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: !dontKnowGotra && errors.gotra && touched.gotra ? '1px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '1rem',
                  backgroundColor: dontKnowGotra ? '#f3f4f6' : '#f9fafb',
                  outline: 'none'
                }}
                placeholder={dontKnowGotra ? "Default (Kashyap)" : "Enter Gotra name"}
                value={dontKnowGotra ? "" : gotra}
                onChange={(e) => {
                  setGotra(e.target.value);
                  if (touched.gotra) validateField("gotra", e.target.value);
                }}
                onBlur={() => handleBlur("gotra", gotra)}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                <input
                  id="dontKnowGotra"
                  type="checkbox"
                  checked={dontKnowGotra}
                  onChange={(e) => {
                    setDontKnowGotra(e.target.checked);
                    if (e.target.checked) {
                      setErrors(prev => ({ ...prev, gotra: "" }));
                    }
                  }}
                />
                <label htmlFor="dontKnowGotra" style={{ fontSize: '0.8rem', color: '#0d52a2', fontWeight: 600 }}>I don't know my Gotra</label>
              </div>
              <InlineError message={!dontKnowGotra && touched.gotra ? errors.gotra : ""} />
            </div>

            {/* Address Section */}
            {needAddress && (
              <div style={{ backgroundColor: "#ffffff", borderRadius: "1rem", border: "1px solid #d1d5db", padding: "1rem", marginTop: "1rem" }} id="address">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.15rem" }}>📦</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#1f2937", textTransform: "uppercase", letterSpacing: "0.05em" }}>Delivery Address</span>
                </div>
                <div id="address1">
                  <ModernInput
                    id="address1-input"
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
                    id="postal-input"
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div id="city">
                    <ModernInput
                      id="city-input"
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
                      id="state-input"
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
            )}

            {/* 4. Family Members Section */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', color: '#0d52a2', fontWeight: 700, textTransform: 'uppercase' }}>
                  Family Members <span style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'none' }}>({money(EXTRA_MEMBER_RATE)}/member)</span>
                </h3>
                <button onClick={addFamilyMember} type="button" style={{ fontSize: '0.8rem', background: '#eff6ff', color: '#0d52a2', border: '1px solid #93c5fd', borderRadius: '0.5rem', padding: '0.2rem 0.5rem', fontWeight: 600 }}>
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
                    style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}
                  >
                    <input
                      type="text"
                      value={member}
                      onChange={(e) => updateFamilyMember(idx, e.target.value)}
                      style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #93c5fd', background: '#eff6ff', fontSize: '0.95rem', outline: 'none' }}
                      placeholder={`Family Member ${idx + 1} Name`}
                    />
                    <button
                      onClick={() => removeFamilyMember(idx)}
                      type="button"
                      style={{ flexShrink: 0, minWidth: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', padding: '0 0.75rem', borderRadius: '0.5rem', border: '1px solid #fca5a5' }}
                    >✕</button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 5. Coupon Section */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <button
                type="button"
                onClick={() => setShowCouponPanel((v) => !v)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 600, color: '#d97706', background: 'none', border: 'none', padding: '0.2rem 0' }}
              >
                <span>🏷️ Have a Coupon?</span>
                <span style={{ fontSize: '0.75rem' }}>{showCouponPanel ? "▲" : "▼"}</span>
              </button>

              <AnimatePresence>
                {showCouponPanel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                        style={{ flex: 1, border: '1px solid #fcd34d', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.95rem', outline: 'none', background: '#fffbeb', textTransform: 'uppercase' }}
                        placeholder="Enter coupon code"
                      />
                      <button
                        type="button"
                        onClick={() => applyCoupon(couponInput)}
                        style={{ color: 'white', background: '#d97706', fontSize: '0.9rem', fontWeight: 700, padding: '0 1rem', borderRadius: '0.5rem', border: 'none' }}
                      >Apply</button>
                    </div>

                    {couponError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{couponError}</p>}

                    {visibleCoupons.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <p style={{ color: '#d97706', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Available Offers</p>
                        {visibleCoupons.map((c) => {
                          const isUnlocked = baseAmount >= c.minPackagePrice;
                          const amtNeeded = c.minPackagePrice - baseAmount;
                          return (
                            <div
                              key={c.code}
                              onClick={() => isUnlocked && applyCoupon(c.code)}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                border: '1px solid',
                                borderColor: !isUnlocked
                                  ? '#e5e7eb'
                                  : appliedCoupon?.code === c.code
                                    ? '#fbbf24'
                                    : '#fde68a',
                                background: !isUnlocked
                                  ? '#f3f4f6'
                                  : appliedCoupon?.code === c.code
                                    ? '#fef3c7'
                                    : '#fffbeb',
                                borderRadius: '0.5rem',
                                padding: '0.5rem',
                                marginBottom: '0.25rem',
                                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                                opacity: isUnlocked ? 1 : 0.8
                              }}
                            >
                              <div>
                                <p style={{ fontWeight: 700, fontSize: '0.85rem', color: isUnlocked ? '#b45309' : '#9ca3af' }}>
                                  {c.code} {!isUnlocked && <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 500 }}>(Locked)</span>}
                                </p>
                                <p style={{ color: isUnlocked ? '#d97706' : '#9ca3af', fontSize: '0.75rem', fontWeight: isUnlocked ? 500 : 400 }}>
                                  {isUnlocked ? localizeCopy(c.label) : `Add ${money(amtNeeded)} more of seva to unlock`}
                                </p>
                              </div>
                              <span style={{ color: isUnlocked ? '#059669' : '#9ca3af', fontSize: '0.85rem', fontWeight: 700 }}>
                                -{money(c.discount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.5rem', padding: '0.5rem', marginTop: '0.5rem' }}>
                  <div>
                    <p style={{ color: '#047857', fontSize: '0.85rem', fontWeight: 700 }}>✅ {appliedCoupon.code} applied!</p>
                    <p style={{ color: '#059669', fontSize: '0.75rem' }}>You save {money(discountAmount)}</p>
                  </div>
                  <button type="button" onClick={removeCoupon} style={{ color: '#9ca3af', fontSize: '0.75rem', border: 'none', background: 'none', cursor: 'pointer' }}>✕ Remove</button>
                </div>
              )}
            </div>

          </form>
        </div>
      </div>

      <div className="bottom-spacer"></div>

      {/* Sticky Bottom Bar */}
      <div className="sticky-bottom-bar">
        <div className="sticky-price-info">
          <div className="sticky-total-price">{money(finalAmount)}</div>
          <div className="sticky-total-label">TOTAL</div>
        </div>
        <button className="sticky-btn" onClick={() => handlePayAndBook()} disabled={isSubmitting}>
          {isSubmitting ? "Processing..." : "Book Your Seva ►"}
        </button>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', width: '90%', maxWidth: '320px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d52a2', marginBottom: '0.5rem' }}>🕉 Har Har Mahadev! 🕉</h2>
            <p style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '1.5rem' }}>Your Chadhava has been booked successfully.</p>
            <button onClick={() => router.push('/services/new-jyotirling-chadhava')} style={{ width: '100%', background: '#0d52a2', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
};

const NewJyotirlingChadhavaPaymentPage = () => {
  return <Layout content={<PageContent />} activeIndex="puja" />;
};

export default NewJyotirlingChadhavaPaymentPage;
