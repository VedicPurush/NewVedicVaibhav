"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  Collapse,
  DatePicker,
  Input,
  Radio,
} from "antd";
import type { RadioChangeEvent } from "antd";
import dayjs from "dayjs";
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  BellOutlined,
  CameraOutlined,
  GiftOutlined,
  HeartOutlined,
} from "@ant-design/icons";

import Layout from "@/components/layout/Layout";
import PaymentLoader from "@/components/pages/services/chadhava/PaymentLoader";
import MandirData from "./MandirData";
import MandirRecommend from "./MandirRecommend";
import { useMandirDetailQuery } from "@/hooks/queries/useMandirQueries";
import { usePersonalizedPoojasQuery } from "@/hooks/queries/usePoojaQueries";
import { captureVvUtm, getVvUtm } from "@/lib/utm";
import { gtag } from "@/lib/gtag";
import { api, apiUrl } from "@/lib/api";
import { orderRequestFields, toInr, useMoney } from "@/lib/currency";
import { extractIdFromSlug } from "@/lib/slug";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";

const { Panel } = Collapse;

const getMetaHeaders = (): Record<string, string> => {
  const getCookie = (name: string) => {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  };
  const fbp = getCookie('_fbp');
  const cookieFbc = getCookie('_fbc');
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  const fbc = cookieFbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-event-source-url': window.location.href };
  if (fbp) headers['x-fbp'] = fbp;
  if (fbc) headers['x-fbc'] = fbc;
  return headers;
};

const IndividualMandir = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div>
      <Layout content={<IndividualMandirContent />} activeIndex="mandir" />
    </div>
  );
};

export default IndividualMandir;

// ─── Meta Pixel safe tracker ──────────────────────────────────────────────────
const isFbqFn = (fn: unknown): fn is (...args: any[]) => void => typeof fn === "function";
const fbqTrack = (event: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  const fbq = (window as any).fbq;
  if (isFbqFn(fbq)) {
    try { fbq("track", event, params || {}); } catch (e) { console.warn("fbq track failed", e); }
    return;
  }
  const win = window as any;
  win._fbqQueue = win._fbqQueue || [];
  win._fbqQueue.push({ event, params });
  if (!win._fbqInterval) {
    win._fbqInterval = window.setInterval(() => {
      const f = (window as any).fbq;
      if (isFbqFn(f)) {
        (win._fbqQueue || []).forEach((e: any) => { try { f("track", e.event, e.params || {}); } catch { } });
        win._fbqQueue = [];
        window.clearInterval(win._fbqInterval);
        win._fbqInterval = 0;
      }
    }, 400);
  }
};

const IndividualMandirContent = () => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const params = useParams<{ id: string }>();
  // The route param is a "name-id" slug (see lib/slug.ts) — recover the real
  // Mongo id for the lookups below. A bare legacy id still works unchanged.
  const id = extractIdFromSlug(params?.id);
  const router = useRouter();

  const { data: poojas = [], isLoading: poojasLoading } = usePersonalizedPoojasQuery(id || "");
  const { data: apiData, isLoading: mandirLoading, error: mandirError } = useMandirDetailQuery(id || "");

  const [selectedPujaId, setSelectedPujaId] = useState<string | null>(null);

  // Set default selected puja when poojas are loaded
  useEffect(() => {
    if (poojas.length > 0 && !selectedPujaId) {
      setSelectedPujaId(poojas[0]._id);
    }
  }, [poojas, selectedPujaId]);

  useEffect(() => {
    captureVvUtm();
  }, []);

  // ViewContent — fire when mandir puja page loads with data
  useEffect(() => {
    if (!apiData) return;
    fbqTrack("ViewContent", {
      content_ids: [id || "personalized-puja"],
      content_name: (apiData as any)?.nameEnglish || "Personalized Puja by Mandir",
      content_category: "Personalized Puja",
      content_type: "product",
      currency: "INR",
    });
    gtag("event", "view_item", {
      currency: "INR",
      items: [{
        item_id: id || "personalized-puja",
        item_name: (apiData as any)?.nameEnglish || "Personalized Puja by Mandir",
        item_category: "Personalized Puja",
      }],
    });
  }, [apiData, id]);

  const data = apiData ? { mandir: apiData as any } : null;
  const loading = poojasLoading || mandirLoading;
  const error = mandirError ? "Failed to fetch mandir data" : null;

  const [bookingLoading, setBookingLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>("single");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [names, setNames] = useState<string[]>([""]);
  const [gotra, setGotra] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [formError, setFormError] = useState<string | null>(null); // Keep for general payment/server errors
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  // New state to hold family members fetched from backend
  const [storedFamilyMembers, setStoredFamilyMembers] = useState<string[]>([]);
  // Address fields to sync
  const [userAddress, setUserAddress] = useState<any>({});


  const packageOptions = [
    {
      key: "single",
      label: "SINGLE",
      sub: "1 Person",
      color: "#e6f7ff",
      imgSrc:
        "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_f8y1x1f8y1x1f8y1-removebg-preview.webp",
    },
    {
      key: "couple",
      label: "COUPLE",
      sub: "2 Person",
      color: "#f0f5ff",
      imgSrc:
        "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_8oc9an8oc9an8oc9-removebg-preview.webp",
    },
    {
      key: "family",
      label: "FAMILY",
      sub: "Upto 6",
      color: "#fff7e6",
      imgSrc:
        "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_mjkankmjkankmjka-removebg-preview.webp",
    },
    {
      key: "vip",
      label: "VIP",
      sub: "Corporate",
      color: "#f6ffed",
      imgSrc:
        "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_5wizqr5wizqr5wiz-removebg-preview.webp",
    },
  ];

  // Helper to fill names based on package and stored family
  const fillNames = (pkg: string, family: string[]) => {
    let count = 0;
    if (pkg === "single") count = 1;
    else if (pkg === "couple") count = 2;
    else if (pkg === "family" || pkg === "vip") {
      // If family/vip, expand to show all stored family members (min 6)
      count = Math.max(6, family.length);
    }

    const newNames = Array(count).fill("");
    for (let i = 0; i < count; i++) {
      if (family[i]) newNames[i] = family[i];
    }
    setNames(newNames);
  };

  useEffect(() => {
    fillNames(selectedPackage, storedFamilyMembers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPackage, storedFamilyMembers]);


  // Fetch user details by phone
  const fetchUserDetails = async (phoneStr: string) => {
    if (phoneStr.length !== 10) return;
    try {
      const res = await api.get(`/get-user-by-phone/${phoneStr}`);
      if (res.data && res.data.user) {
        const u = res.data.user;
        // Email
        if (!email && u.email) setEmail(u.email);
        // Gotra
        if (!gotra && u.gotra) setGotra(u.gotra);

        // Family Members
        if (Array.isArray(u.familyMembers) && u.familyMembers.length > 0) {
          setStoredFamilyMembers(u.familyMembers);
        }

        // Address (for syncing back later)
        setUserAddress({
          address1: u.address1,
          address2: u.address2,
          city: u.city,
          state: u.state,
          pincode: u.pincode,
          country: u.country,
          firstname: u.firstname || u.firstName || u.given_name,
          lastname: u.lastname || u.lastName || u.family_name,
        });
      }
    } catch (err) {
      console.error("Error fetching user details", err);
    }
  };

  // Pre-fill on mount if logged in
  useEffect(() => {
    const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
    if (userDetails?.user) {
      const u = userDetails.user;
      const rawPhone = u.phone ? u.phone.replace(/[^0-9]/g, "") : "";
      setMobile(rawPhone.length === 12 && rawPhone.startsWith("91") ? rawPhone.slice(2) : rawPhone);
      setEmail(u.email || "");
      setGotra(u.gotra || "");

      if (Array.isArray(u.familyMembers)) {
        setStoredFamilyMembers(u.familyMembers);
      }

      setUserAddress({
        address1: u.address1,
        address2: u.address2,
        city: u.city,
        state: u.state,
        pincode: u.pincode,
        country: u.country,
        firstname: u.firstname || u.firstName || u.given_name,
        lastname: u.lastname || u.lastName || u.family_name,
      });
    }
  }, []);



  const handleNameChange = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
  };
  const selectedPuja = poojas.find((p: any) => p._id === selectedPujaId);
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  if (!id) return <div>No Mandir ID provided.</div>;
  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!data) return <div>No data available</div>;

  const resetForm = () => {
    setGotra("");
    setEmail("");
    setMobile("");
    setNames([""]);
    setSelectedDate(null);
    setFieldErrors({});
    setFormError(null);
  };

  const goToFailure = (reason: string, replace = false) => {
    try {
      sessionStorage.setItem("personalizedPujaFailureReason", reason);
    } catch { /* ignore */ }
    if (replace) router.replace("/personalized-puja-failure");
    else router.push("/personalized-puja-failure");
  };

  const handleSubmit = async () => {
    const errors: { [key: string]: string } = {};

    if (!selectedDate) errors.date = "Please select a date for your puja.";

    if (selectedPackage !== "vip") {
      if (gotra.trim() === "") errors.gotra = "Please enter your Gotra.";

      const newNamesErrors = names.map(n => !n.trim() ? "Name is required" : "");
      if (newNamesErrors.some(err => err !== "")) {
        errors.names = "Please fill all the name fields.";
      }

      if (mobile.trim() === "") errors.mobile = "Please enter your Mobile number.";
      else if (mobile.length !== 10) errors.mobile = "Mobile number must be 10 digits.";

      if (email.trim() === "") errors.email = "Please enter your Email.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Please fill in your details to book the puja.");
      // Scroll the user back to the booking form so they can complete it
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setBookingLoading(true);

    try {
      const price =
        ({
          single: selectedPuja?.singlePackagePrice,
          couple: selectedPuja?.couplePackagePrice,
          family: selectedPuja?.familyPackagePrice,
          vip: selectedPuja?.jointFamilyPackagePrice,
        } as Record<string, number | undefined>)[selectedPackage] || 0;

      // ✅ Step 0: Sync latest user data to backend (create or update user)
      try {
        const syncPayload = {
          phone: mobile,
          email: email,
          gotra: selectedPackage === "vip" ? "" : gotra,
          // If family/VIP, safe to send all bhakta names as family members
          familyMembers: names,
          address1: userAddress.address1 || "",
          address2: userAddress.address2 || "",
          city: userAddress.city || "",
          state: userAddress.state || "",
          pincode: userAddress.pincode || "",
          country: userAddress.country || "",
          // Split name for profile update (using first name from list)
          firstname: userAddress.firstname || (names[0] ? names[0].split(" ")[0] : ""),
          lastname: userAddress.lastname || (names[0] ? names[0].split(" ").slice(1).join(" ") : ""),
        };

        await axios.post(apiUrl("/phone-login-or-register"), syncPayload);
      } catch (e) {
        console.error("Background user sync failed", e);
        // We do not block payment if this fails, but it's good to log
      }

      // 1) Create order (or use your own booking-first flow)
      const orderRes = await fetch(apiUrl("/create-order"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `amount` stays the INDIA LIST TOTAL in paise; orderRequestFields only
        // says which currency to present in. The server applies the markup.
        body: JSON.stringify({ amount: price * 100, ...orderRequestFields() }),
      });
      const orderData = await orderRes.json();
      if (!orderData?.id) {
        setFormError("Failed to initiate payment. Please try again.");
        setBookingLoading(false);
        return;
      }

      const RazorpayCtor = (window as any).Razorpay;
      if (!RazorpayCtor) {
        alert("Payment SDK not loaded. Please refresh and try again.");
        setFormError("Payment SDK not loaded.");
        setBookingLoading(false);
        return;
      }

      // InitiateCheckout — fire just before Razorpay opens
      fbqTrack("InitiateCheckout", {
        content_ids: [id || "personalized-puja"],
        content_name: selectedPuja?.nameEnglish || "Personalized Puja by Mandir",
        content_category: "Personalized Puja",
        content_type: "product",
        value: toInr(price),
        currency: "INR",
        num_items: 1,
      });
      gtag("event", "begin_checkout", {
        currency: "INR",
        value: toInr(price),
        items: [{
          item_id: id || "personalized-puja",
          item_name: selectedPuja?.nameEnglish || "Personalized Puja by Mandir",
          item_category: "Personalized Puja",
          price: price,
          quantity: 1,
        }],
      });

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Vedic Vaibhav",
        description: selectedPuja?.nameEnglish || "Custom Puja",
        order_id: orderData.id,

        // ✅ SUCCESS
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setVerifying(true);
          try {
            // Payment is already captured here — retry rather than reporting a
            // transient verification hiccup as a failed payment.
            const verifyOutcome = await verifyPaymentWithRetry<any>({
              attempt: async () => {
                const res = await fetch(apiUrl("/verify-payment"), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(response),
                });
                // fetch() does not throw on 4xx/5xx the way axios does; surface it
                // so the retry loop sees a failure instead of a bogus success.
                if (!res.ok) throw new Error(`verify-payment failed (${res.status})`);
                return res.json();
              },
            });
            const verifyData = verifyOutcome.status === "confirmed" ? verifyOutcome.data : null;

            if (!verifyData?.success) {
              fbqTrack("PaymentInfoFailed", {
                content_ids: [id || "personalized-puja"],
                value: toInr(price),
                currency: "INR",
              });
              gtag("event", "payment_failed", {
                currency: "INR",
                value: toInr(price),
                items: [{ item_id: id || "personalized-puja", item_name: selectedPuja?.nameEnglish || "Personalized Puja" }],
              });
              goToFailure("Payment verification failed. Please contact support.");
              return;
            }

            // Save booking
            const payload = {
              userID: "anonymous",
              firstName: names[0] || "Anonymous",
              lastName: ".",
              fullName: names,
              gotra: selectedPackage === "vip" ? "-" : gotra,
              mobile,
              email,
              poojaName: selectedPuja?.nameEnglish || "Custom Puja",
              problemName: selectedPuja?.nameEnglish || "Custom Puja",
              description: "Package selected by the user: " + selectedPackage,
              poojaDate: dayjs(selectedDate).toISOString(),
              selectedMandir: data.mandir._id,
              isFromApp: false,
              price,
              mandirName: data.mandir.nameEnglish,
              vv_utm: getVvUtm(),
              // Idempotency key — lets the retry below re-send this safely instead
              // of minting a second booking for the same payment.
              razorpay_payment_id: response.razorpay_payment_id,
            };

            // The user has already paid at this point and the booking only exists
            // once this call succeeds — there is no webhook fallback that can
            // recreate it. Retrying is what stops a transient failure here from
            // taking someone's money without leaving a booking behind.
            const bookingOutcome = await verifyPaymentWithRetry<any>({
              attempt: async () => {
                const res = await fetch(apiUrl("/add-personalized-pooja-booking"), {
                  method: "POST",
                  headers: getMetaHeaders(),
                  body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(`booking save failed (${res.status})`);
                return res.json();
              },
            });
            const bookingResult = bookingOutcome.status === "confirmed" ? bookingOutcome.data : null;

            // `bookingResult` (not the old `bookingRes.ok`) because the save is now
            // driven by verifyPaymentWithRetry above, which returns the parsed body.
            if (bookingResult) {
              // GA4 Purchase is NOT sent here — PersonalizedPujaSuccess sends it
              // on /personalized-puja-success, which this redirects to. Firing in
              // both places double-counted every booking, under two different
              // transaction ids (razorpay_payment_id here vs the orderId stashed
              // below), so GA4 recorded two separate sales.
              try {
                sessionStorage.setItem("personalizedPujaSuccessState", JSON.stringify({
                  orderId: bookingResult?.orderId || bookingResult?.booking?.orderId,
                  poojaName: payload.poojaName,
                  mandirName: payload.mandirName,
                  poojaDate: payload.poojaDate,
                  price,
                  mobile,
                  devoteeName: names[0],
                  paymentId: response.razorpay_payment_id,
                  // The receipt on the success page must show what the card was
                  // ACTUALLY billed, not the India list total re-priced by
                  // whatever country happens to be active when it renders.
                  currency: orderData.currency,
                  chargedAmount: orderData.chargedAmount,
                }));
              } catch { /* ignore */ }
              resetForm();
              router.replace("/personalized-puja-success");
            } else {
              goToFailure(
                (bookingOutcome.status !== "confirmed" && bookingOutcome.message) ||
                  "Booking save failed after payment.",
              );
            }
          } catch (e) {
            console.error(e);
            goToFailure("Something went wrong after payment.");
          } finally {
            setVerifying(false);
            setBookingLoading(false);
          }
        },

        // ✅ GATEWAY CLOSED (user dismissed)
        modal: {
          ondismiss: () => {
            setFormError("Payment not completed. Please try again.");
            setBookingLoading(false);
          },
        },

        prefill: { name: names[0], email, contact: mobile },
        theme: { color: "#D05800" },
      };

      const rzp = new RazorpayCtor(options);

      // ✅ PAYMENT FAILED
      rzp.on("payment.failed", (resp: any) => {
        const reason = resp?.error?.description || "Payment failed. Please try again.";
        setBookingLoading(false);
        resetForm();
        goToFailure(reason);
      });

      rzp.open(); // 🚪 open ONCE
    } catch (err) {
      console.error("Payment init error:", err);
      alert("Something went wrong while starting payment.");
      setFormError("Something went wrong while starting payment.");
      setBookingLoading(false); // 🔁 back to BOOK NOW
      resetForm(); // 🔄 clear fields
    }
  };



  const minBookableDate = dayjs().add(4, "day").startOf("day");

  // ── package colour palette (mirrors Choose_package_mobile)
  const packageMeta: Record<string, { textColor: string; persons: string }> = {
    single: { textColor: "#628ff0", persons: "1" },
    couple: { textColor: "#9d71e9", persons: "2" },
    family: { textColor: "#eaa556", persons: "6" },
    vip: { textColor: "#359807", persons: "12" },
  };

  const selectedPrice = selectedPuja
    ? ({
      single: selectedPuja.singlePackagePrice,
      couple: selectedPuja.couplePackagePrice,
      family: selectedPuja.familyPackagePrice,
      vip: selectedPuja.jointFamilyPackagePrice,
    } as Record<string, number>)[selectedPackage] ?? 0
    : 0;

  const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN").format(Math.floor(n));

  // ─── Shared JSX blocks (used in both mobile & desktop) ───────────────────

  const heroBlock = (
    <div style={{ position: "relative", width: "100%" }}>
      <img loading="lazy"
        src={data.mandir.mandirIntroImage}
        alt={data.mandir.nameEnglish}
        style={{ width: "100%", height: isSmallScreen ? "auto" : 340, maxWidth: "100%", objectFit: isSmallScreen ? "contain" : "cover", display: "block" }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.0) 55%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(255,255,255,0.92)", borderRadius: 20, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ color: "#f59e0b", fontSize: 14 }}>★</span>
        <span style={{ color: "#1e293b", fontWeight: 800, fontSize: 13 }}>4.7</span>
        <span style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}>(58)</span>
      </div>
    </div>
  );

  const titleBlock = (pad: string) => (
    <div style={{ padding: pad }}>
      <h1 style={{ fontSize: isSmallScreen ? 18 : 24, fontWeight: 700, color: "#0f172a", lineHeight: 1.3, margin: 0 }}>
        {data.mandir.nameEnglish}
      </h1>
      <div style={{ marginTop: 5, color: "#64748b", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
        <span>🛕</span>{data.mandir.nameEnglish}{data.mandir.location ? `, ${data.mandir.location}` : ""}
      </div>
    </div>
  );

  const pujaTypeSelectorBlock = (pad: string) => (
    <div style={{ padding: pad }}>
      <div style={{ background: "#FFFEFA", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: "14px 16px" }}>
        {poojas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🪔</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>
              Sorry, there is no puja available here.
            </div>
          </div>
        ) : (
        <>
        <div style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Puja with your Name &amp; Gotra</h2>
          <p style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, margin: "3px 0 0" }}>
            Receive puja confirmation 📲 with your name and gotra
          </p>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#E35600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          SELECT PUJA TYPE
        </div>
        <Radio.Group onChange={(e: RadioChangeEvent) => setSelectedPujaId(e.target.value)} value={selectedPujaId} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {poojas.map((pooja: any) => (
            <Radio key={pooja._id} value={pooja._id} style={{ fontSize: 13 }}>{pooja.nameEnglish}</Radio>
          ))}
        </Radio.Group>
        </>
        )}
        {selectedPuja && (
          <Collapse ghost defaultActiveKey={[]} style={{ marginTop: 8, marginLeft: -8 }}>
            <Panel key="1" header={<span style={{ fontSize: 13, fontWeight: 600, color: "#E35600" }}>View Benefits</span>}>
              <div dangerouslySetInnerHTML={{ __html: selectedPuja.poojaBenefits }} style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }} />
            </Panel>
          </Collapse>
        )}
      </div>
    </div>
  );

  const whatHappensBlock = (margin: string) => (
    <div style={{ margin, background: "linear-gradient(150deg, #E35600 0%, #f97316 60%, #fb923c 100%)", borderRadius: 16, padding: "20px 20px 22px", color: "white", boxShadow: "0 8px 28px rgba(227,86,0,0.22)" }}>
      <h3 style={{ color: "white", fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>What Happens After Booking?</h3>
      <p style={{ fontSize: 12, opacity: 0.85, margin: "0 0 16px" }}>Here&apos;s your complete puja journey ✨</p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        {[<BellOutlined key="bell" />, <CameraOutlined key="camera" />, <GiftOutlined key="gift" />, <HeartOutlined key="heart" />].map((icon, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.2)", flexShrink: 0, fontSize: 16 }}>{icon}</span>
            {i < 3 && <div style={{ flex: 1, height: 1, borderBottom: "1.5px dashed rgba(255,255,255,0.4)" }} />}
          </span>
        ))}
      </div>
      <ol style={{ paddingLeft: "1.1rem", fontSize: 12, lineHeight: 1.9, margin: 0 }}>
        <li style={{ marginBottom: 3 }}><strong>Reminder:</strong> Notified before your puja begins.</li>
        <li style={{ marginBottom: 3 }}><strong>Update:</strong> Photos &amp; videos after completion.</li>
        <li style={{ marginBottom: 3 }}><strong>Prasad:</strong> Delivered within 5–6 business days.</li>
        <li><strong>Family:</strong> Welcome to the Vedic Vaibhav family 🙏</li>
      </ol>
    </div>
  );


  const packageGridBlock = (cols: string) => (
    <>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#E35600" }}>🪔 Select Puja Package</span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {[48, 12, 6, 6].map((w, i) => (<div key={i} style={{ height: 6, width: w, background: "#E35600", borderRadius: 10 }} />))}
        </div>
      </div>
      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12 }}>
        {packageOptions.map((option) => {
          const price = ({ single: selectedPuja!.singlePackagePrice, couple: selectedPuja!.couplePackagePrice, family: selectedPuja!.familyPackagePrice, vip: selectedPuja!.jointFamilyPackagePrice } as Record<string, number>)[option.key] ?? 0;
          const meta = packageMeta[option.key] ?? { textColor: "#E35600", persons: "1" };
          const isSel = selectedPackage === option.key;
          return (
            <div key={option.key} onClick={() => setSelectedPackage(option.key)} style={{ position: "relative", overflow: "hidden", borderRadius: 16, minHeight: 130, background: "#fff", border: isSel ? "2px solid #f97316" : "1.5px solid #fed7aa", boxShadow: isSel ? "0 0 0 3px rgba(249,115,22,0.12)" : "0 2px 8px rgba(0,0,0,0.03)", cursor: "pointer", transition: "all 0.18s" }}>
              <div style={{ padding: "12px 12px 8px" }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: meta.textColor, letterSpacing: "-0.01em" }}>{option.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: meta.textColor, lineHeight: 1 }}>|</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>Package for {meta.persons} Devotee</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: meta.textColor, marginTop: 8 }}>{money(price)}</div>
              </div>
              <div style={{ position: "absolute", bottom: -4, right: -4, width: 90, height: 100, zIndex: 0 }}>
                <img loading="lazy" src={option.imgSrc} alt={option.label} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "bottom", mixBlendMode: "multiply" }} />
              </div>
              <div style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", border: "2px solid #f97316", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isSel && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316" }} />}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const bookingFormBlock = () => (
    <div style={{ paddingTop: 16 }}>
      {/* Date */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>📅 Select Puja Date</label>
        <DatePicker
          onChange={(date) => { setSelectedDate(date ? date.format("YYYY-MM-DD") : null); if (date) setFieldErrors(prev => ({ ...prev, date: "" })); }}
          disabledDate={(current) => current && current < minBookableDate}
          defaultPickerValue={minBookableDate}
          placeholder={`From ${minBookableDate.format("DD MMM YYYY")}`}
          status={fieldErrors.date ? "error" : ""}
          style={{ width: "100%", borderRadius: 10 }}
        />
        {fieldErrors.date && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 3 }}>{fieldErrors.date}</div>}
      </div>

      {selectedPackage !== "vip" ? (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10 }}>🙏 Bhakta Details</div>

          {/* Mobile */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>📱 Mobile</label>
            <Input placeholder="10-digit number" value={mobile} prefix={<span style={{ fontWeight: 600, color: "#6b7280", marginRight: 4, fontSize: 12 }}>🇮🇳 +91</span>} maxLength={10} status={fieldErrors.mobile ? "error" : ""} onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); if (e.target.value) setFieldErrors(prev => ({ ...prev, mobile: "" })); }} onBlur={(e) => fetchUserDetails(e.target.value.replace(/\D/g, "").slice(0, 10))} style={{ borderRadius: 10 }} />
            {fieldErrors.mobile && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 3 }}>{fieldErrors.mobile}</div>}
          </div>

          {/* Gotra */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Gotra</label>
            <Input placeholder="Enter your Gotra" value={gotra} maxLength={50} status={fieldErrors.gotra ? "error" : ""} onChange={(e) => { setGotra(e.target.value.replace(/[^a-zA-Z\s\-\.]/g, "")); if (e.target.value) setFieldErrors(prev => ({ ...prev, gotra: "" })); }} style={{ borderRadius: 10 }} />
            {fieldErrors.gotra && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 3 }}>{fieldErrors.gotra}</div>}
          </div>

          {/* Names */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{names.length === 1 ? "Bhakta Name" : "Bhakta Names"}</label>
            {names.length === 1 ? (
              <Input placeholder="Your full name" value={names[0]} maxLength={100} status={fieldErrors.names && !names[0]?.trim() ? "error" : ""} onChange={(e) => { handleNameChange(0, e.target.value.replace(/[^a-zA-Z\s\-\.]/g, "")); if (e.target.value) setFieldErrors(prev => ({ ...prev, names: "" })); }} style={{ borderRadius: 10 }} />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {names.map((name, index) => (
                  <Input key={index} placeholder={`Name ${index + 1}`} value={name} maxLength={100} status={fieldErrors.names && !name?.trim() ? "error" : ""} onChange={(e) => { handleNameChange(index, e.target.value.replace(/[^a-zA-Z\s\-\.]/g, "")); if (e.target.value) setFieldErrors(prev => ({ ...prev, names: "" })); }} style={{ borderRadius: 10 }} />
                ))}
              </div>
            )}
            {fieldErrors.names && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 3 }}>{fieldErrors.names}</div>}
          </div>

          {/* Email optional */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
              ✉️ Email <span style={{ fontWeight: 400, color: "#9ca3af", textTransform: "none", letterSpacing: 0 }}>(Optional)</span>
            </label>
            <Input placeholder="your@email.com (optional)" value={email} maxLength={100} status={fieldErrors.email ? "error" : ""} onChange={(e) => { setEmail(e.target.value); if (e.target.value) setFieldErrors(prev => ({ ...prev, email: "" })); }} style={{ borderRadius: 10 }} />
            {fieldErrors.email && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 3 }}>{fieldErrors.email}</div>}
          </div>
        </>
      ) : (
        <div style={{ background: "#fff7f0", border: "1.5px solid #fed7aa", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 20 }}>📞</span>
          <p style={{ margin: 0, fontSize: 13, color: "#9a3412", lineHeight: 1.6 }}>Our team will contact you directly to collect participant details for your VIP puja.</p>
        </div>
      )}

      {formError && (
        <div style={{ marginTop: 12, background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: "10px 14px", color: "#be123c", fontWeight: 500, fontSize: 13 }}>{formError}</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen font-sans" style={{ paddingBottom: isSmallScreen ? 110 : 0 }}>
      {verifying && <PaymentLoader />}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MOBILE LAYOUT — single column + sticky bottom bar                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isSmallScreen && (
        <>
          {heroBlock}
          {titleBlock("14px 14px 0")}
          {pujaTypeSelectorBlock("12px 14px 0")}

          {selectedPuja && (
            <div ref={formSectionRef} style={{ margin: "12px 14px 0", background: "#FDF3EA", borderRadius: "20px 20px 0 0", padding: "16px 16px 0" }}>
              {packageGridBlock("1fr 1fr")}
              {bookingFormBlock()}
            </div>
          )}

          {whatHappensBlock("0 14px 16px")}

          <div style={{ padding: "0 14px" }}>
            <MandirData introData={data.mandir.mandirSectionIntro} historyData={data.mandir.mandirSectionHistory} />
          </div>

          <MandirRecommend />

          {/* Sticky bottom bar — mobile only (hidden when no puja available) */}
          {poojas.length > 0 && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, overflow: "hidden" }}>
            <div style={{ background: "#FBE6CD", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", lineHeight: 1.2 }}>Your puja</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#FF6B00", lineHeight: 1.2, display: "flex", alignItems: "baseline", gap: 2 }}>
                  {money(selectedPrice)}
                </div>
              </div>
              <button disabled={bookingLoading || !selectedPuja} onClick={handleSubmit} style={{ borderRadius: 10, padding: "12px 28px", fontSize: 15, fontWeight: 800, color: "white", background: (bookingLoading || !selectedPuja) ? "#9ca3af" : "#FF6B00", border: "2px solid white", cursor: (bookingLoading || !selectedPuja) ? "not-allowed" : "pointer", boxShadow: "0 2px 10px rgba(255,107,0,0.28)", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s ease" }}>
                {bookingLoading ? (<><svg style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Processing…</>) : "BOOK NOW"}
              </button>
            </div>
          </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DESKTOP LAYOUT — two column                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!isSmallScreen && (
        <>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 40px 0", display: "flex", gap: 32, alignItems: "flex-start" }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              {/* Hero image — contained in left column */}
              <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
                {heroBlock}
              </div>
              {titleBlock("0")}
              {pujaTypeSelectorBlock("16px 0 0")}
              {whatHappensBlock("20px 0 16px")}
              <MandirData introData={data.mandir.mandirSectionIntro} historyData={data.mandir.mandirSectionHistory} />
              <div style={{ paddingBottom: 40 }} />
            </div>

            {/* ── RIGHT COLUMN (sticky sidebar) ── */}
            <style>{`.im-right-col::-webkit-scrollbar { display: none; }`}</style>
            <div className="im-right-col" style={{ width: 420, flexShrink: 0, position: "sticky", top: 88, maxHeight: "calc(100vh - 108px)", overflowY: "auto", scrollbarWidth: "none", paddingBottom: 32 }}>
              {selectedPuja ? (
                <div style={{ background: "#FDF3EA", borderRadius: 20, padding: "20px 20px 0", marginTop: 20 }}>
                  {packageGridBlock("1fr 1fr")}

                  {/* Booking form */}
                  <div style={{ paddingBottom: 0 }}>
                    {bookingFormBlock()}
                  </div>

                  {/* Inline BOOK NOW */}
                  <div style={{ padding: "16px 0 20px", borderTop: "1px solid rgba(0,0,0,0.06)", marginTop: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Total for selected package</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: "#FF6B00", lineHeight: 1.2 }}>
                          {money(selectedPrice)}
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={bookingLoading}
                      onClick={handleSubmit}
                      style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: bookingLoading ? "#9ca3af" : "linear-gradient(135deg, #E35600 0%, #FF6B00 100%)", color: "white", fontSize: 16, fontWeight: 800, cursor: bookingLoading ? "not-allowed" : "pointer", letterSpacing: "0.04em", boxShadow: "0 6px 20px rgba(255,107,0,0.30)", transition: "all 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    >
                      {bookingLoading ? (<><svg style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Processing…</>) : "🙏 Book Puja Now"}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 20, background: "#FDF3EA", borderRadius: 20, padding: 24, textAlign: "center", color: "#9ca3af" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🪔</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {poojas.length === 0 ? "Sorry, there is no puja available here." : "Select a puja type to see packages"}
                  </div>
                </div>
              )}
            </div>

          </div>

          <MandirRecommend />
        </>
      )}
    </div>
  );
};
