"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import TempleHinduIcon from "@mui/icons-material/TempleHindu";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useVedicPromosQuery } from "@/hooks/queries/usePromoQueries";
import { validatePromo, type AppliedPromo, type PromoCode } from "@/lib/api/promo.api";
import { api } from "@/lib/api";
import { orderRequestFields } from "@/lib/currency";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";
import { PITRU_PUJA_ID } from "./constants";

const KASHYAP_GOTRA = "Kashyap";

const MAROON = "#7A0F1F";

/** Shared input shell — maroon focus border to match the puja landing page. */
const FIELD = "rounded-xl border border-stone-300 bg-white focus-within:border-[#7A0F1F] transition-colors";

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

const formatPrice = (price: string | number) => {
  const amount = Number(price);
  return `₹${Number.isFinite(amount) ? amount.toLocaleString("en-IN") : price}/-`;
};

const apiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/**
 * Coupons offered in "View all coupons". Influencer codes still work when typed,
 * they are just not advertised (same rule as the puja checkout); app-only codes
 * are rejected on the website, so they are not offered either.
 */
const isListablePromo = (promo: PromoCode, now: number) =>
  promo.isActive &&
  !promo.isAppOnly &&
  promo.promoType?.toLowerCase() !== "influencer-promo" &&
  new Date(promo.startDate).getTime() <= now &&
  new Date(promo.expiryDate).getTime() >= now;

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white border border-[#E3B5BD] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
    {children}
  </div>
);

const SectionHeading: React.FC<{ icon?: React.ReactNode; title: string; subtitle?: string }> = ({
  icon,
  title,
  subtitle,
}) => (
  <div className="mb-3">
    <div className="flex items-start gap-2">
      <span className="w-[5px] h-5 mt-0.5 rounded-full bg-gradient-to-b from-[#7A0F1F] to-[#F2B8B8] shrink-0" />
      <h2 className="font-heading text-[16px] md:text-[18px] text-[#7A0F1F] leading-snug flex-1">{title}</h2>
      {icon && (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FDE4E4] shrink-0">{icon}</span>
      )}
    </div>
    {subtitle && <p className="text-[12px] text-stone-500 mt-1 pl-[13px]">{subtitle}</p>}
  </div>
);

const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[13px] text-stone-700 font-medium block mb-2">
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

  const [couponInput, setCouponInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [couponError, setCouponError] = useState("");
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [showAllCoupons, setShowAllCoupons] = useState(false);

  const { data: allPromos = [], isLoading: isPromosLoading } = useVedicPromosQuery();
  const listedPromos = useMemo(() => {
    const now = Date.now();
    return allPromos.filter((promo) => isListablePromo(promo, now));
  }, [allPromos]);

  const basePrice = Number(price) || 0;
  const payableAmount = appliedPromo ? appliedPromo.finalAmount : basePrice;

  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAncestorNameChange = (index: number, value: string) => {
    setAncestorNames((prev) => prev.map((name, i) => (i === index ? value : name)));
  };

  const handleGotraUnknownToggle = (checked: boolean) => {
    setGotraUnknown(checked);
    setKartaGotra(checked ? KASHYAP_GOTRA : "");
  };

  /** Validated on the server; the booking request re-validates it against the package price. */
  const applyCoupon = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return setCouponError("Please enter a coupon code.");
    setCouponError("");
    setApplyingCode(code.toUpperCase());
    try {
      const applied = await validatePromo(code, basePrice);
      setAppliedPromo(applied);
      setCouponInput("");
      setShowAllCoupons(false);
    } catch (err) {
      setCouponError(apiErrorMessage(err, "Could not apply this coupon. Please try again."));
    } finally {
      setApplyingCode(null);
    }
  };

  const removeCoupon = () => {
    setAppliedPromo(null);
    setCouponError("");
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
        ...(appliedPromo ? { promoCode: appliedPromo.promoName } : {}),
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
                price: String(payableAmount),
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
        theme: { color: MAROON },
      });

      rzp.open();
    } catch (err: unknown) {
      setFormError(apiErrorMessage(err, "Something went wrong. Please try again."));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#FDE4E4] via-[#FFF4F4] to-white border-b border-[#E3B5BD]">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3.5">
          <button type="button" onClick={() => router.back()} aria-label="Go back" className="text-[#7A0F1F]">
            <ArrowBackIcon style={{ fontSize: 22 }} />
          </button>
          <h1 className="font-heading font-bold text-[19px] md:text-[22px] text-[#7A0F1F]">
            Enter details for your puja
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 md:px-0 pt-4 pb-28 space-y-4">
        {/* Package summary — same look as the selected package on the landing page */}
        <div className="rounded-xl border border-[#C0445A] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <button
            type="button"
            onClick={() => setIsSummaryOpen((v) => !v)}
            aria-expanded={isSummaryOpen}
            className="w-full flex items-center gap-3 bg-gradient-to-r from-[#FFD9D9] to-[#FFF6F6] px-3 py-3 text-left"
          >
            {packageImage && (
              <img loading="lazy" src={packageImage} alt={packageTitle} className="w-20 h-14 object-contain shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium text-stone-900 truncate">{packageTitle}</div>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E7EEFF] text-[#3E5BD8] text-[11px] px-2 py-0.5 mt-0.5">
                <PersonOutlineIcon style={{ fontSize: 13 }} />
                For {personsCount} Pitru
              </span>
              {price && (
                <div className="text-[20px] font-medium leading-tight text-[#4A2BD0] mt-0.5">{formatPrice(price)}</div>
              )}
            </div>
            <KeyboardArrowDownIcon
              className="self-start shrink-0"
              style={{
                fontSize: 22,
                color: MAROON,
                transform: isSummaryOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {isSummaryOpen && (dateLabel || mandirName) && (
            <div className="flex items-stretch bg-[#8D1B2E] py-3 text-white">
              {mandirName && (
                <div className="flex items-center gap-3 flex-1 px-4 min-w-0">
                  <TempleHinduIcon style={{ fontSize: 24 }} className="shrink-0" />
                  <div className="leading-tight min-w-0">
                    <div className="italic text-[13px]">{mandirName}</div>
                    {mandirPlace && <div className="italic text-[10px] opacity-80">{mandirPlace}</div>}
                  </div>
                </div>
              )}
              {mandirName && dateLabel && <div className="w-px bg-white/70 my-0.5" />}
              {dateLabel && (
                <div className="flex items-center gap-2 basis-[30%] shrink-0 min-w-fit pl-3 pr-2 whitespace-nowrap">
                  <CalendarMonthOutlinedIcon style={{ fontSize: 20 }} className="shrink-0" />
                  <div className="italic text-[13px] leading-tight">{dateLabel}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp number */}
        <Card>
          <SectionHeading title="Add your WhatsApp number" />

          <div className={`flex items-center gap-2 px-3 py-3 ${FIELD}`}>
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
              className="w-4 h-4 accent-[#7A0F1F]"
            />
            I have a different number for calling
          </label>

          {hasDifferentCallingNumber && (
            <div className={`flex items-center gap-2 px-3 py-3 mt-2 ${FIELD}`}>
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
            icon={<PersonOutlineIcon style={{ fontSize: 18, color: MAROON }} />}
            title="Enter name of the person performing Puja for their ancestors (Karta)"
          />

          <RequiredLabel>Name of Karta</RequiredLabel>
          <div className={`flex items-center px-4 py-3 ${FIELD}`}>
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
          <SectionHeading title="Add Karta's Gotra" subtitle="Gotra of the person performing the puja" />

          <RequiredLabel>Karta&apos;s Gotra</RequiredLabel>
          <div className={`flex items-center gap-2 px-4 py-3 ${FIELD}`}>
            <input
              type="text"
              value={kartaGotra}
              onChange={(e) => setKartaGotra(e.target.value)}
              disabled={gotraUnknown}
              placeholder="Enter the Karta's Gotra (if known)"
              className="flex-1 min-w-0 text-[14px] outline-none bg-transparent disabled:text-stone-400"
            />
            <InfoOutlinedIcon
              style={{ fontSize: 18, color: MAROON }}
              titleAccess="Your Gotra identifies your ancestral lineage — the priest uses it while taking the Sankalp for this puja."
            />
          </div>

          <label className="flex items-center gap-2 mt-3 text-[13px] text-stone-600">
            <input
              type="checkbox"
              checked={gotraUnknown}
              onChange={(e) => handleGotraUnknownToggle(e.target.checked)}
              className="w-4 h-4 accent-[#7A0F1F]"
            />
            If you don&apos;t know your Gotra, select this
          </label>

          {gotraUnknown && (
            <p className="text-[12px] text-[#2E7D3E] bg-[#F0FAF0] border border-[#C8EAC8] rounded-xl px-3 py-2 mt-2 leading-relaxed">
              As per scriptures, the Sankalp can be taken with Kashyap Gotra, allowing you to receive the full
              benefit of the puja.
            </p>
          )}
        </Card>

        {/* Ancestor names */}
        <Card>
          <SectionHeading
            icon={<GroupsOutlinedIcon style={{ fontSize: 18, color: MAROON }} />}
            title="For which ancestor are you booking puja rituals?"
            subtitle="Enter the name of ancestor(s)"
          />

          <div className="space-y-3">
            {ancestorNames.map((name, index) => (
              <div key={index}>
                <RequiredLabel>{`Name of ${ordinal(index + 1)} Ancestor`}</RequiredLabel>
                <div className={`flex items-stretch overflow-hidden ${FIELD}`}>
                  <span className="flex items-center px-3 bg-[#FDE4E4] text-[13px] font-semibold text-[#7A0F1F] border-r border-stone-300">
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

        {/* Coupon */}
        {basePrice > 0 && (
          <Card>
            <SectionHeading
              icon={<LocalOfferOutlinedIcon style={{ fontSize: 18, color: MAROON }} />}
              title="Apply Coupon"
            />

            {appliedPromo ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#C8EAC8] bg-[#F0FAF0] px-3 py-2.5">
                <CheckCircleIcon style={{ fontSize: 22, color: "#2E9E45" }} />
                <div className="flex-1 min-w-0 leading-tight">
                  <div className="text-[14px] font-semibold text-stone-900 truncate">{appliedPromo.promoName}</div>
                  <div className="text-[12px] text-[#2E7D3E]">You save {formatPrice(appliedPromo.discountAmount)}</div>
                </div>
                <button type="button" onClick={removeCoupon} className="text-[13px] font-semibold text-[#7A0F1F] shrink-0">
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className={`flex-1 flex items-center px-3 ${FIELD}`}>
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        if (couponError) setCouponError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") applyCoupon(couponInput);
                      }}
                      placeholder="Enter coupon code"
                      autoCapitalize="characters"
                      className="flex-1 min-w-0 py-3 text-[14px] uppercase placeholder:normal-case outline-none bg-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => applyCoupon(couponInput)}
                    disabled={!!applyingCode}
                    className="shrink-0 rounded-xl bg-[#6B0F1A] hover:bg-[#560b14] disabled:opacity-60 text-white text-[14px] font-medium px-5 transition-colors"
                  >
                    {applyingCode && applyingCode === couponInput.trim().toUpperCase() ? "Applying..." : "Apply"}
                  </button>
                </div>
                {couponError && <p className="text-[12px] text-red-700 mt-2">{couponError}</p>}

                {(isPromosLoading || listedPromos.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setShowAllCoupons((v) => !v)}
                    aria-expanded={showAllCoupons}
                    className="flex items-center gap-1 mt-3 text-[13px] font-semibold text-[#7A0F1F]"
                  >
                    {showAllCoupons ? "Hide coupons" : "View all coupons"}
                    <KeyboardArrowDownIcon
                      style={{
                        fontSize: 18,
                        transform: showAllCoupons ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    />
                  </button>
                )}

                {showAllCoupons && (
                  <div className="mt-2 space-y-2">
                    {isPromosLoading && <p className="text-[12px] text-stone-500">Loading coupons…</p>}
                    {listedPromos.map((promo) => {
                      const isEligible = basePrice >= (promo.startRange || 0);
                      const isApplying = applyingCode === promo.promoName.toUpperCase();
                      return (
                        <div
                          key={promo._id}
                          className={`flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 ${
                            isEligible ? "border-[#C0445A] bg-[#FFF6F6]" : "border-stone-300 bg-stone-50 opacity-70"
                          }`}
                        >
                          <div className="flex-1 min-w-0 leading-tight">
                            <div className="text-[13px] font-bold tracking-wide text-stone-900">{promo.promoName}</div>
                            <div className="text-[12px] text-[#2E7D3E] mt-0.5">Save {formatPrice(promo.discountAmount)}</div>
                            {promo.description && (
                              <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">{promo.description}</div>
                            )}
                            {!isEligible && (
                              <div className="text-[11px] text-stone-500 mt-0.5">Min. order {formatPrice(promo.startRange)}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => applyCoupon(promo.promoName)}
                            disabled={!isEligible || !!applyingCode}
                            className="shrink-0 rounded-lg border border-[#7A0F1F] text-[#7A0F1F] disabled:border-stone-300 disabled:text-stone-400 text-[12px] font-semibold px-3 py-1.5"
                          >
                            {isApplying ? "Applying..." : "Apply"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {/* Bill summary */}
        {basePrice > 0 && (
          <Card>
            <SectionHeading title="Price Details" />
            <div className="space-y-2 text-[13px] text-stone-600">
              <div className="flex justify-between gap-3">
                <span className="truncate">{packageTitle || "Package"}</span>
                <span className="text-stone-900">{formatPrice(basePrice)}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between gap-3 text-[#2E7D3E]">
                  <span className="truncate">Coupon ({appliedPromo.promoName})</span>
                  <span>− {formatPrice(appliedPromo.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-dashed border-stone-300 pt-2 text-[15px] font-semibold text-[#7A0F1F]">
                <span>Amount to Pay</span>
                <span>{formatPrice(payableAmount)}</span>
              </div>
            </div>
          </Card>
        )}

        {formError && (
          <p className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>
        )}
      </div>

      {/* Same bar as the landing page's "Proceed" state */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white px-3 py-2.5 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={handleProceedToPay}
            disabled={isSubmitting}
            className="w-full min-h-[52px] flex items-center justify-between gap-3 rounded-xl bg-[#6B0F1A] hover:bg-[#560b14] disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 text-left transition-colors"
          >
            {isSubmitting ? (
              <span className="w-full text-center text-[15px] font-medium tracking-wide">Processing...</span>
            ) : (
              <>
                <span className="min-w-0 leading-tight">
                  {price && (
                    <span className="flex items-baseline gap-2">
                      <span className="text-[17px] font-medium">{formatPrice(payableAmount)}</span>
                      {appliedPromo && (
                        <span className="text-[12px] line-through opacity-70">{formatPrice(basePrice)}</span>
                      )}
                    </span>
                  )}
                  <span className="block text-[12px] truncate">{packageTitle}</span>
                </span>
                <span className="shrink-0 text-[14px] font-medium tracking-wide">Proceed to Pay</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnterPujaDetailsPage;
