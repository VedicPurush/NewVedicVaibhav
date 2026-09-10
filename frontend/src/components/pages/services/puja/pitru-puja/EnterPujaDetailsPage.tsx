"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PersonIcon from "@mui/icons-material/Person";
import GroupsIcon from "@mui/icons-material/Groups";
import { api } from "@/lib/api";
import { orderRequestFields } from "@/lib/currency";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";
import { PITRU_PUJA_ID } from "./constants";

const KASHYAP_GOTRA = "Kashyap";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    if (document.getElementById("razorpay-js")) return resolve(true);
    const script = document.createElement("script");
    script.id = "razorpay-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const ordinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white border border-[#F4E4CC] rounded-2xl p-4 shadow-sm">{children}</div>
);

const SectionHeading: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({
  icon,
  title,
  subtitle,
}) => (
  <div className="flex items-start gap-3 mb-3">
    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[#FBE7C6] shrink-0">{icon}</span>
    <div>
      <h2 className="font-display text-[15px] font-bold text-[#5C1D1D] leading-snug">{title}</h2>
      {subtitle && <p className="text-[12px] text-stone-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[13px] text-stone-600 font-medium block mb-2">
    <span className="text-[#C0392B] mr-0.5">*</span>
    {children}
  </label>
);

const EnterPujaDetailsPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const packageTitle = searchParams.get("title") ?? "";
  const price = searchParams.get("price") ?? "";
  const dateLabel = searchParams.get("dateLabel") ?? "";
  const mandirName = searchParams.get("mandirName") ?? "";
  const mandirPlace = searchParams.get("mandirPlace") ?? "";
  const packageImage = searchParams.get("image") ?? "";
  const personsCount = Math.max(1, parseInt(searchParams.get("persons") ?? "1", 10) || 1);

  const [isSummaryOpen, setIsSummaryOpen] = useState(true);

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [hasDifferentCallingNumber, setHasDifferentCallingNumber] = useState(false);
  const [callingNumber, setCallingNumber] = useState("");

  const [kartaName, setKartaName] = useState("");

  const [kartaGotra, setKartaGotra] = useState("");
  const [gotraUnknown, setGotraUnknown] = useState(false);

  const [ancestorNames, setAncestorNames] = useState<string[]>(() => Array(personsCount).fill(""));

  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAncestorNameChange = (index: number, value: string) => {
    setAncestorNames((prev) => prev.map((name, i) => (i === index ? value : name)));
  };

  const handleGotraUnknownToggle = (checked: boolean) => {
    setGotraUnknown(checked);
    setKartaGotra(checked ? KASHYAP_GOTRA : "");
  };

  const handleProceedToPay = async () => {
    if (!whatsappNumber.trim()) return setFormError("Please enter your WhatsApp number.");
    if (!kartaName.trim()) return setFormError("Please enter the Karta's name.");
    if (!kartaGotra.trim()) return setFormError("Please enter or select the Karta's Gotra.");
    if (ancestorNames.some((n) => !n.trim())) return setFormError("Please enter all ancestor name(s).");

    setFormError("");
    setIsSubmitting(true);

    try {
      const { data: createData } = await api.post("/create-pitru-puja-booking", {
        pujaId: PITRU_PUJA_ID,
        packageLabel: packageTitle,
        whatsappNumber: whatsappNumber.trim(),
        ...(hasDifferentCallingNumber ? { callingNumber: callingNumber.trim() } : {}),
        kartaName: kartaName.trim(),
        kartaGotra: kartaGotra.trim(),
        ancestorNames: ancestorNames.map((n) => `Late ${n.trim()}`),
      });

      const orderIdInternal: string = createData.booking.orderId;

      const { data: paymentData } = await api.post("/pitru-puja-payment", {
        orderId: orderIdInternal,
        ...orderRequestFields(),
      });

      const { order, key } = paymentData;

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setFormError("Payment SDK failed to load. Are you online?");
        setIsSubmitting(false);
        return;
      }

      const rzp = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        name: "Vedic Vaibhav",
        description: packageTitle ? `Pitru Puja — ${packageTitle}` : "Pitru Puja Booking",
        order_id: order.id,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const outcome = await verifyPaymentWithRetry<{ success?: boolean; message?: string }>({
            attempt: async () =>
              (
                await api.post("/verify-pitru-puja-payment", {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: orderIdInternal,
                })
              ).data,
          });

          setIsSubmitting(false);

          if (outcome.status === "declined") {
            setFormError(`Payment verification failed: ${outcome.message}`);
            return;
          }

          try {
            sessionStorage.setItem(
              "pitruPujaSuccessState",
              JSON.stringify({
                orderId: orderIdInternal,
                packageTitle,
                price,
                kartaName: kartaName.trim(),
                whatsappNumber: whatsappNumber.trim(),
                dateLabel,
                mandirName,
                mandirPlace,
                paymentId: response.razorpay_payment_id,
              }),
            );
          } catch {
            // sessionStorage can throw in private-browsing edge cases — the
            // success page falls back to generic copy when it's empty.
          }

          router.push("/services/puja/pitru-dosh-shanti-puja/payment-success");
        },
        modal: {
          ondismiss: () => setIsSubmitting(false),
        },
        prefill: { name: kartaName.trim() || "Devotee", contact: whatsappNumber.trim() },
        theme: { color: "#5C1D1D" },
      });

      rzp.open();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Something went wrong. Please try again.";
      setFormError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#F4E4CC] sticky top-0 bg-[#FFF8F0] z-10">
        <button type="button" onClick={() => router.back()} className="text-[#5C1D1D]">
          <ArrowBackIcon style={{ fontSize: 20 }} />
        </button>
        <h1 className="font-display text-[17px] font-bold text-[#5C1D1D]">Enter details for your puja</h1>
      </div>

      <div className="max-w-3xl mx-auto p-4 pb-28 space-y-4">
        {/* Package summary */}
        <Card>
          <div className="flex items-start gap-3">
            {packageImage && (
              <img
                loading="lazy"
                src={packageImage}
                alt={packageTitle}
                className="w-14 h-14 rounded-xl object-cover shrink-0 bg-stone-100"
              />
            )}
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setIsSummaryOpen((v) => !v)}
                className="w-full flex items-center justify-between"
              >
                <span className="text-[13px] text-stone-500">{packageTitle}</span>
                <KeyboardArrowDownIcon
                  style={{
                    fontSize: 20,
                    color: "#78716c",
                    transform: isSummaryOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              <div className="text-[22px] font-bold text-[#5C1D1D] mt-1">₹ {price}/-</div>
            </div>
          </div>

          {isSummaryOpen && (dateLabel || mandirName) && (
            <>
              <div className="border-t border-dashed border-stone-300 my-3" />
              {mandirName && (
                <div className="flex items-center gap-2 text-[13px] text-stone-600 mb-2">
                  <LocationOnIcon style={{ fontSize: 15, color: "#5C1D1D" }} />
                  {mandirName}
                  {mandirPlace ? `, ${mandirPlace},` : ""}
                </div>
              )}
              {dateLabel && (
                <div className="flex items-center gap-2 text-[13px] text-stone-600">
                  <CalendarTodayIcon style={{ fontSize: 15, color: "#C98A3B" }} />
                  {dateLabel}
                </div>
              )}
            </>
          )}
        </Card>

        {/* WhatsApp number */}
        <Card>
          <h2 className="font-display text-[15px] font-bold text-[#5C1D1D] mb-3">Add your WhatsApp number</h2>

          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-3 focus-within:border-[#EA6A12] transition-colors">
            <WhatsAppIcon style={{ fontSize: 20, color: "#25D366" }} />
            <span className="text-[14px] text-stone-500">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="Enter your WhatsApp number"
              className="flex-1 min-w-0 text-[14px] outline-none bg-transparent"
            />
          </div>

          <label className="flex items-center gap-2 mt-3 text-[13px] text-stone-600">
            <input
              type="checkbox"
              checked={hasDifferentCallingNumber}
              onChange={(e) => setHasDifferentCallingNumber(e.target.checked)}
              className="w-4 h-4 accent-[#EA6A12]"
            />
            I have a different number for calling
          </label>

          {hasDifferentCallingNumber && (
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-3 mt-2 focus-within:border-[#EA6A12] transition-colors">
              <span className="text-[14px] text-stone-500">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                value={callingNumber}
                onChange={(e) => setCallingNumber(e.target.value)}
                placeholder="Enter your calling number"
                className="flex-1 min-w-0 text-[14px] outline-none bg-transparent"
              />
            </div>
          )}

          <p className="text-[12px] text-stone-500 mt-2">Puja updates will be sent to this number.</p>
        </Card>

        {/* Karta name */}
        <Card>
          <SectionHeading
            icon={<PersonIcon style={{ fontSize: 18, color: "#8A4B12" }} />}
            title="Enter name of the person performing Puja for their ancestors (Karta)"
          />

          <RequiredLabel>Name of Karta</RequiredLabel>
          <div className="flex items-center rounded-xl border border-stone-200 bg-white px-4 py-3 focus-within:border-[#EA6A12] transition-colors">
            <input
              type="text"
              value={kartaName}
              onChange={(e) => setKartaName(e.target.value)}
              placeholder="Enter Karta's full name"
              className="flex-1 min-w-0 text-[14px] outline-none bg-transparent"
            />
            <span className="text-[13px] text-stone-400 whitespace-nowrap">and family</span>
          </div>
          <p className="text-[12px] text-stone-500 mt-2">Benefits of this Puja extend to your entire family.</p>
        </Card>

        {/* Karta gotra */}
        <Card>
          <RequiredLabel>Add Karta&apos;s Gotra (person performing puja)</RequiredLabel>
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 focus-within:border-[#EA6A12] transition-colors">
            <input
              type="text"
              value={kartaGotra}
              onChange={(e) => setKartaGotra(e.target.value)}
              disabled={gotraUnknown}
              placeholder="Enter the Karta's Gotra (if known)"
              className="flex-1 min-w-0 text-[14px] outline-none bg-transparent disabled:text-stone-400"
            />
            <InfoOutlinedIcon
              style={{ fontSize: 18, color: "#C98A3B" }}
              titleAccess="Your Gotra identifies your ancestral lineage — the priest uses it while taking the Sankalp for this puja."
            />
          </div>

          <label className="flex items-center gap-2 mt-3 text-[13px] text-stone-600">
            <input
              type="checkbox"
              checked={gotraUnknown}
              onChange={(e) => handleGotraUnknownToggle(e.target.checked)}
              className="w-4 h-4 accent-[#EA6A12]"
            />
            If you don&apos;t know your Gotra, select this
          </label>

          {gotraUnknown && (
            <p className="text-[12px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mt-2 leading-relaxed">
              As per scriptures, the Sankalp can be taken with Kashyap Gotra, allowing you to receive the full
              benefit of the puja.
            </p>
          )}
        </Card>

        {/* Ancestor names */}
        <Card>
          <SectionHeading
            icon={<GroupsIcon style={{ fontSize: 18, color: "#8A4B12" }} />}
            title="For which ancestor are you booking puja rituals?"
            subtitle="Enter the name of ancestor(s)"
          />

          <div className="space-y-3">
            {ancestorNames.map((name, index) => (
              <div key={index}>
                <RequiredLabel>{`Name of ${ordinal(index + 1)} Ancestor`}</RequiredLabel>
                <div className="flex items-stretch rounded-xl border border-stone-200 bg-white overflow-hidden focus-within:border-[#EA6A12] transition-colors">
                  <span className="flex items-center px-3 bg-[#FBE7C6] text-[13px] font-semibold text-[#8A4B12] border-r border-stone-200">
                    Late
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleAncestorNameChange(index, e.target.value)}
                    placeholder="Ancestor's name"
                    className="flex-1 min-w-0 px-3 py-3 text-[14px] outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {formError && (
          <p className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {formError}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#F4E4CC] px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={handleProceedToPay}
            disabled={isSubmitting}
            className="w-full rounded-full bg-[#EA6A12] hover:bg-[#d55e0a] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-[15px] py-3 shadow-md transition-colors"
          >
            {isSubmitting ? "Processing..." : price ? `Proceed to Pay — ₹${price}/-` : "Proceed to Pay"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnterPujaDetailsPage;
