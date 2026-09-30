"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import TempleHinduIcon from "@mui/icons-material/TempleHindu";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { useAnyPoojaDetailQuery, useMandirByIdQuery } from "@/hooks/useAllPoojas";
import { getVvUtm } from "@/lib/utm";
import { api } from "@/lib/api";
import { orderRequestFields, useMoney, toInr } from "@/lib/currency";
import { extractIdFromSlug } from "@/lib/slug";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";
import {
  buildViewModel,
  normalizeMobile,
  makeSafeEmail,
  formatDateToMDY,
  formatDateLong,
  loadRazorpay,
  toPaise,
  PALETTE,
  Card,
  CardHeading,
  RequiredLabel,
  FieldError,
  fieldStyle,
  FIELD_CLASS,
  PUJA_SHARED_STYLES,
} from "./newPujaShared";

type Member = { name: string; gotra: string };

const emptyMember = (): Member => ({ name: "", gotra: "" });

const EnterPujaBookingPage = () => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const pujaId = extractIdFromSlug(id);
  const packageLabel = useSearchParams()?.get("packageLabel") || "";

  const { data: detail, isLoading: isPoojaLoading } = useAnyPoojaDetailQuery(pujaId);
  const pooja = detail?.pooja;
  const source: "new" | "legacy" = detail?.source === "new" ? "new" : "legacy";

  const mandirIdRaw = pooja?.mandirLists?.[0]?.mandirId;
  const mandirId =
    source === "new" ? "" : typeof mandirIdRaw === "string" ? mandirIdRaw : mandirIdRaw?._id || "";
  const { data: mandir } = useMandirByIdQuery(mandirId);

  const PUJA = useMemo(() => buildViewModel(pooja, mandir, undefined, source), [pooja, mandir, source]);
  const P = PUJA.palette;

  /**
   * Legacy poojas point at a real Mandir document. New poojas embed their
   * temple as free text — `mandirDetails`'s own sub-document id is the best
   * available value, and it currently resolves to nothing in the `mandirs`
   * collection. That is harmless for THIS page's own booking record, but it
   * means prasad dispatch (pandit lookup -> pincode -> Shiprocket) will not
   * find a pandit for a new-source puja until mandirDetails gets a real
   * `mandirId` ref — tracked separately from this page.
   */
  const md = pooja?.mandirDetails?.[0]; // new only
  const resolvedMandirID = source === "new" ? md?._id || "" : mandirId;

  /**
   * The package price IS the order total; the server recomputes exactly this
   * from the catalog in verifyOrderAmount, keyed on this same `label` — so a
   * bad or tampered `packageLabel` in the URL is never trusted for the amount,
   * only for which card to show here.
   */
  const selectedPackage = PUJA.packages.find((pkg) => pkg.label === packageLabel) ?? null;
  const needsPackageChoice = PUJA.packages.length > 0 && !selectedPackage;
  /** The seva itself, before any add-on. `total` below adds prasad to this. */
  const sevaPrice = selectedPackage?.price ?? PUJA.basePrice;

  const [isSummaryOpen, setIsSummaryOpen] = useState(true);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [gotra, setGotra] = useState("");
  /* One slot per family member the chosen package covers, on top of the
     yajmaan — sized to personCount directly. */
  const [members, setMembers] = useState<Member[]>([]);
  const date = PUJA.poojaDates[0] || "";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Prasad delivery — only offered when the puja has it marked available.
  const [needPrasad, setNeedPrasad] = useState(false);
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");

  /**
   * One source of truth for "is prasad part of this order": it drives the
   * charge, the address validation and the `isAddressSelected` flag sent to
   * the server. Deriving them separately risks charging for prasad without
   * flagging it (or vice versa), which verifyOrderAmount rejects outright.
   */
  const wantsPrasad = PUJA.isPrasadAvailable && needPrasad;
  const prasadCharge = wantsPrasad ? PUJA.prasadPrice : 0;
  const total = sevaPrice + prasadCharge;

  // The yajmaan is always included on top — personCount is how many
  // ADDITIONAL family members the package price covers, not the total headcount.
  const familySlotCount = selectedPackage?.personCount ?? 0;
  useEffect(() => {
    setMembers((prev) => {
      if (prev.length === familySlotCount) return prev;
      return Array.from({ length: familySlotCount }, (_, i) => prev[i] ?? emptyMember());
    });
  }, [familySlotCount]);

  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const setFieldRef = (key: string) => (el: HTMLInputElement | null) => {
    fieldRefs.current[key] = el;
  };

  const updateMember = (index: number, field: keyof Member, value: string) =>
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));

  /** Slots the devotee actually filled in — blanks are dropped, never sent. */
  const namedMembers = members
    .map((m) => ({ name: m.name.trim(), gotra: m.gotra.trim() }))
    .filter((m) => m.name || m.gotra);

  const validate = () => {
    const next: Record<string, string> = {};

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      next.mobile = "Enter a valid 10-digit mobile number";
    }
    if (name.trim().length < 2) {
      next.name = "Please enter the yajmaan's full name";
    }
    if (gotra.trim().length < 2) {
      next.gotra = "Please enter your gotra (write Kashyap if unknown)";
    }
    /* The package is a ceiling, not a quota: a devotee who wants fewer names in
       the sankalp than it covers leaves the rest blank and pays the same. Only a
       half-filled row is an error, since a name with no gotra cannot be recited. */
    members.forEach((m, i) => {
      const memberName = m.name.trim();
      const memberGotra = m.gotra.trim();
      if (!memberName && !memberGotra) return;
      if (memberName.length < 2) next[`f-${i}-name`] = `Enter family member ${i + 1}'s name`;
      if (memberGotra.length < 2) next[`f-${i}-gotra`] = `Enter family member ${i + 1}'s gotra`;
    });

    if (wantsPrasad) {
      if (!address1.trim()) next.address1 = "Address is required.";
      if (!/^[1-9]\d{5}$/.test(pincode)) next.pincode = "Enter a valid 6-digit PIN code.";
      if (!city.trim()) next.city = "City is required.";
      if (!state.trim()) next.state = "State is required.";
    }

    setErrors(next);
    return next;
  };

  const revealField = (key: string) => {
    const el = fieldRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => el.focus({ preventScroll: true }), 450);
  };

  const handleBook = async () => {
    const mobileNo = normalizeMobile(mobile);
    const email = makeSafeEmail(mobileNo);
    const merchantTransactionId = `TXN${Date.now()}`;

    // yajmaan first, then each family member — order matters, the sankalp is
    // read out in this sequence and bhaktaNames[0] is treated as the yajmaan
    const bhaktaNames = [name.trim(), ...namedMembers.map((x) => x.name)];
    const gotras = [gotra.trim(), ...namedMembers.map((x) => x.gotra)];

    const [firstname, ...rest] = name.trim().split(/\s+/);
    const lastname = rest.join(" ");

    // keep the handoff payload for the success page / any later step
    localStorage.setItem(
      "selectedPackage",
      JSON.stringify({
        pujaId,
        packageName: "singlePackage",
        packageLabel: selectedPackage?.label ?? "",
        yajmaanName: name.trim(),
        yajmaanMobile: mobileNo,
        yajmaanGotra: gotra.trim(),
        poojaDate: date,
        familyMembers: namedMembers,
        totalAmount: total,
      })
    );

    try {
      // 1. create/lookup the user so the booking is attached to an account
      const authRes = await api.post(`/phone-login-or-register`, {
        phone: mobileNo,
        email,
        firstname,
        lastname,
        gotra: gotra.trim(),
        familyMembers: bhaktaNames,
      });
      const { user, token } = authRes.data || {};
      if (token) localStorage.setItem("token", token);
      if (user) localStorage.setItem("userDetails", JSON.stringify({ user }));

      /* The booking record requires userID and mandirID, and it is written
         *after* Razorpay confirms payment. If either is missing the save fails
         once the money is already taken, so refuse to open checkout at all. */
      if (!user?._id || !resolvedMandirID) {
        throw new Error(
          "This puja is not ready for booking yet. Please contact support — no payment has been taken."
        );
      }

      const bookingDetails = {
        userID: user._id,
        mandirID: resolvedMandirID,
        poojaSource: source,
        poojaID: pujaId,
        totalPrice: total,
        bookingDate: new Date(),
        package: "singlePackage",
        // names which catalog package to price against — see verifyOrderAmount
        packageLabel: selectedPackage?.label ?? "",
        referralCode: localStorage.getItem("vedicvaibhav_ref_code"),
        gotra: gotras,
        bhaktaNames,
        dakshinaToPandit: null,
        donateToMandir: null,
        brahmanBhoj: null,
        poojaStatus: "booked",
        isAddressSelected: wantsPrasad,
        // what prasad actually cost on this order — 0 when not taken, so the
        // booking answers "was prasad bought?" without inferring it
        prasadAmount: prasadCharge,
        /**
         * "pending" means a real prasad awaiting dispatch; "N/A" means none was
         * bought. Every pooja booking used to say "pending" regardless, which
         * made the field useless for filtering and showed a misleading
         * "pending" in the booking report and confirmation email.
         *
         * Sent as a non-empty string on purpose: finalizePoojaBookingRecord
         * does `details.prasadStatus || "pending"`, so anything falsy here
         * would be rewritten back to "pending". Passing an explicit value
         * bypasses that fallback without the controller needing to change —
         * which keeps the legacy Payment.tsx flow (always "pending") exactly
         * as it was.
         */
        prasadStatus: wantsPrasad ? "pending" : "N/A",
        address1: wantsPrasad ? address1.trim() : "",
        address2: wantsPrasad ? address2.trim() : "",
        city: wantsPrasad ? city.trim() : "",
        state: wantsPrasad ? state.trim() : "",
        country: wantsPrasad ? country.trim() : "",
        pincode: wantsPrasad ? Number(pincode) || 0 : 0,
        email,
        firstname,
        lastname,
        mobile: mobileNo,
        mandirimage: pooja?.poojaCardImage,
        mandirname: PUJA.mandirName,
        poojaname: pooja?.title,
        // the date the devotee is booked for (both shapes now carry a schedule)
        poojadate: date ? formatDateToMDY(date) : "",
        poojadateISO: date || "",
        poojatime: PUJA.poojaTime,
        // meta / tracking
        fbp: document.cookie.match(/_fbp=([^;]+)/)?.[1],
        fbc: document.cookie.match(/_fbc=([^;]+)/)?.[1],
        eventSourceUrl: window.location.href,
        vv_utm: getVvUtm(),
      };

      // 2. backend creates the Razorpay order and returns its key
      const orderRes = await api.post(`/create-razorpay-order`, {
        // Still the INDIA LIST TOTAL in paise, unchanged — the server checks it
        // against the catalog and only then applies any foreign markup.
        amount: toPaise(total), // paise
        receipt: merchantTransactionId,
        merchantTransactionId,
        bookingDetails,
        // Presentment request: which currency to bill in, and the market.
        ...orderRequestFields(),
      });
      const { orderId, key, amount: orderAmount, currency: orderCurrency } = orderRes.data || {};
      if (!orderId || !key) throw new Error("Could not start checkout. Please try again.");

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not reach Razorpay. Check your connection.");

      // 3. open checkout
      const rzp = new (window as any).Razorpay({
        key,
        /**
         * ⚠️ TAKEN FROM THE CREATE-ORDER RESPONSE, never re-computed here — the
         * server may have fallen back to INR for a currency the account is not
         * enabled for, and a checkout that opens on a different currency than the
         * order carries either fails or verifies against the wrong expectation.
         */
        amount: orderAmount ?? toPaise(total),
        currency: orderCurrency || "INR",
        name: "Vedic Vaibhav",
        description: pooja?.title || "Pooja Booking Payment",
        order_id: orderId,
        notes: { merchantTransactionId, poojaId: pujaId, userId: user?._id || "" },
        prefill: { name: name.trim(), email, contact: mobileNo },
        theme: { color: P.navy },
        handler: async (response: any) => {
          try {
            // 4. the server verifies the signature — never trust the client here.
            // The payment is already captured by now, so retry through the webhook
            // race instead of calling it a failure (see lib/verify-payment.ts).
            const outcome = await verifyPaymentWithRetry<any>({
              attempt: async () =>
                (
                  await api.post(`/verify-razorpay-payment`, {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    merchantTransactionId,
                  })
                ).data,
            });

            if (outcome.status === "declined") {
              window.gtag?.("event", "payment_failed", {
                currency: "INR",
                value: toInr(total),
                items: [{ item_id: pujaId, item_name: pooja?.title || "Puja Booking" }],
              });
              alert("We could not verify your payment. If money was debited, contact support with ID " + merchantTransactionId);
              return;
            }

            // Retained from the retry work: the booking id read below comes from
            // the verified response, which is empty while the webhook settles.
            const verifyRes = { data: outcome.status === "confirmed" ? outcome.data : ({} as any) };

            // GA4 Purchase is NOT sent here — PujaPaymentSuccessful sends it on
            // /pujapaymentsuccess below. Firing in both places double-counted
            // every mobile booking, under two different transaction ids.

            localStorage.setItem("bookedpujaID", pujaId);
            localStorage.setItem("bookingId", verifyRes.data.bookingId || "");
            localStorage.setItem("merchantTransactionId", merchantTransactionId);
            localStorage.setItem("lastPujaAmount", String(total));
            localStorage.setItem("lastPujaOrderId", verifyRes.data.bookingId || merchantTransactionId);

            router.push("/pujapaymentsuccess");
          } catch (err: any) {
            console.error("Verification failed", err?.response?.data || err);
            alert("We could not verify your payment. If money was debited, contact support with ID " + merchantTransactionId);
          }
        },
      });

      rzp.on("payment.failed", (resp: any) => {
        console.error("Razorpay payment failed", resp?.error);
        window.gtag?.("event", "payment_failed", {
          currency: "INR",
          value: toInr(total),
          items: [{ item_id: pujaId, item_name: pooja?.title || "Puja Booking" }],
        });
        alert(resp?.error?.description || "Payment failed. Please try again.");
      });

      rzp.open();
    } catch (err: any) {
      console.error("Booking failed", err?.response?.data || err);
      alert(err?.response?.data?.message || err?.message || "Could not start payment. Please try again.");
    }
  };

  const handleProceedToPay = async () => {
    if (!PUJA.isBookable || submitting) return;
    if (needsPackageChoice) return; // guarded out of the UI already, see below

    const found = validate();
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      revealField(firstInvalid);
      return;
    }

    setSubmitting(true);
    try {
      await handleBook();
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "flex-1 min-w-0 px-3 py-3 text-[14px] outline-none bg-transparent";

  if (isPoojaLoading || !pooja) {
    return (
      <div
        className="grid min-h-screen place-items-center font-sans text-[14px]"
        style={{ color: PALETTE.inkSoft }}
      >
        Loading puja details…
      </div>
    );
  }

  /* Only reachable by hand-editing the URL — the landing page never links here
     without a valid packageLabel once a puja has packages. */
  if (needsPackageChoice) {
    return (
      <div className="min-h-screen bg-white grid place-items-center px-6 text-center font-sans">
        <div>
          <p className="text-[14px] text-stone-700 mb-4">Please choose a puja package first.</p>
          <button
            type="button"
            onClick={() => router.push(`/services/puja/${pujaId}/select-package`)}
            className="rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white"
            style={{ backgroundColor: P.navy }}
          >
            Choose a package
          </button>
        </div>
      </div>
    );
  }

  const summaryImage = selectedPackage?.image || PUJA.heroImage;
  const dateLabel = date ? formatDateLong(date) : "";

  return (
    <div className="min-h-screen bg-white font-sans" style={{ color: P.ink }}>
      <style>{PUJA_SHARED_STYLES}</style>

      <div
        className="sticky top-0 z-10 border-b"
        style={{ backgroundColor: P.cream, borderColor: P.line }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-2 min-[360px]:gap-3 px-3 min-[360px]:px-4 py-3.5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="shrink-0"
            style={{ color: P.navy }}
          >
            <ArrowBackIcon style={{ fontSize: 22 }} />
          </button>
          <h1
            className="font-heading font-bold text-[17px] min-[360px]:text-[19px] md:text-[22px] min-w-0 break-words"
            style={{ color: P.textDark }}
          >
            Enter details for your puja
          </h1>
        </div>
      </div>

      <div
        className="max-w-3xl mx-auto px-3 md:px-0 pt-4 pb-28 space-y-4"
        style={{ ["--puja-primary" as string]: P.navy } as React.CSSProperties}
      >
        {/* Seva summary — same collapsible pattern as the pitru puja checkout */}
        <div className="rounded-xl border overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)]" style={{ borderColor: P.navy }}>
          <button
            type="button"
            onClick={() => setIsSummaryOpen((v) => !v)}
            aria-expanded={isSummaryOpen}
            className="w-full flex items-center gap-2 min-[360px]:gap-3 px-2.5 min-[360px]:px-3 py-3 text-left"
            style={{ backgroundImage: `linear-gradient(to right, ${P.chip}, ${P.cream})` }}
          >
            {summaryImage && (
              <img
                loading="lazy"
                src={summaryImage}
                alt={PUJA.title}
                className="w-16 h-12 min-[360px]:w-20 min-[360px]:h-14 object-contain shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] min-[360px]:text-[15px] font-medium text-stone-900 truncate">
                {PUJA.title}
              </div>
              {selectedPackage && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-full text-[11px] px-2 py-0.5 mt-0.5 max-w-full"
                  style={{ backgroundColor: P.chip, color: P.chipInk }}
                >
                  <PersonOutlineIcon style={{ fontSize: 13 }} className="shrink-0" />
                  <span className="truncate">
                    {selectedPackage.personCount > 0
                      ? `Yajmaan + ${selectedPackage.personCount} family member${selectedPackage.personCount === 1 ? "" : "s"}`
                      : "Yajmaan only"}
                  </span>
                </span>
              )}
              <div className="text-[18px] min-[360px]:text-[20px] font-medium leading-tight mt-0.5 whitespace-nowrap" style={{ color: P.orange }}>
                {money(total)}
              </div>
            </div>
            <KeyboardArrowDownIcon
              className="self-start shrink-0"
              style={{
                fontSize: 22,
                color: P.navy,
                transform: isSummaryOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {isSummaryOpen && (PUJA.mandirName || dateLabel) && (
            <div className="flex items-stretch py-2.5 md:py-3 text-white" style={{ backgroundColor: P.raw }}>
              {PUJA.mandirName && (
                <div className="flex items-center gap-2 md:gap-3 flex-1 px-3 md:px-4 min-w-0">
                  <TempleHinduIcon style={{ fontSize: 22 }} className="shrink-0" />
                  <div className="leading-tight min-w-0">
                    <div className="italic text-[12px] md:text-[13px] break-words line-clamp-2">{PUJA.mandirName}</div>
                    {PUJA.state && <div className="italic text-[10px] opacity-80 truncate">{PUJA.state}</div>}
                  </div>
                </div>
              )}
              {PUJA.mandirName && dateLabel && <div className="w-px bg-white/70 my-0.5" />}
              {dateLabel && (
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0 min-w-fit pl-2.5 pr-2 md:basis-[30%] md:pl-3 whitespace-nowrap">
                  <CalendarMonthOutlinedIcon style={{ fontSize: 18 }} className="shrink-0" />
                  <div className="italic text-[12px] md:text-[13px] leading-tight">{dateLabel}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile number */}
        <Card P={P}>
          <CardHeading P={P} title="Add your mobile number" />
          <RequiredLabel>Mobile number</RequiredLabel>
          <div className={FIELD_CLASS} style={fieldStyle(P, !!errors.mobile)}>
            <span
              className="flex items-center px-3 text-[13px] font-semibold border-r shrink-0"
              style={{ backgroundColor: P.chip, color: P.chipInk, borderColor: errors.mobile ? "#C0392B" : P.line }}
            >
              +91
            </span>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              placeholder="10-digit mobile number"
              ref={setFieldRef("mobile")}
              aria-invalid={!!errors.mobile}
              className={inputClass}
              style={{ color: P.ink }}
            />
          </div>
          <FieldError message={errors.mobile} />
          <p className="text-[12px] mt-2" style={{ color: P.inkSoft }}>
            Puja updates will be sent to this number.
          </p>
        </Card>

        {/* Yajmaan name */}
        <Card P={P}>
          <CardHeading
            P={P}
            icon={<PersonOutlineIcon style={{ fontSize: 18, color: P.navy }} />}
            title="Enter the name of the person taking the Sankalp (Yajmaan)"
          />
          <RequiredLabel>Name of Yajmaan</RequiredLabel>
          <div className={FIELD_CLASS} style={fieldStyle(P, !!errors.name)}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter the yajmaan's full name"
              autoComplete="name"
              ref={setFieldRef("name")}
              aria-invalid={!!errors.name}
              className={inputClass}
              style={{ color: P.ink }}
            />
          </div>
          <FieldError message={errors.name} />
          <p className="text-[12px] mt-2" style={{ color: P.inkSoft }}>
            Panditji reads the Sankalp in this name during the puja.
          </p>
        </Card>

        {/* Gotra */}
        <Card P={P}>
          <CardHeading P={P} title="Add your Gotra" subtitle="Gotra of the person taking the Sankalp" />
          <RequiredLabel>Your Gotra</RequiredLabel>
          <div className={FIELD_CLASS} style={fieldStyle(P, !!errors.gotra)}>
            <input
              value={gotra}
              onChange={(e) => setGotra(e.target.value)}
              placeholder="Enter your Gotra (write Kashyap if unknown)"
              ref={setFieldRef("gotra")}
              aria-invalid={!!errors.gotra}
              className={inputClass}
              style={{ color: P.ink }}
            />
          </div>
          <FieldError message={errors.gotra} />
          <p className="text-[12px] mt-2" style={{ color: P.inkSoft }}>
            Your Gotra identifies your ancestral lineage — it is recited during the Sankalp.
          </p>
        </Card>

        {/* Family sankalp list — one slot per member the package covers */}
        {members.length > 0 && (
          <Card P={P}>
            <CardHeading
              P={P}
              icon={<GroupsOutlinedIcon style={{ fontSize: 18, color: P.navy }} />}
              title="Family Sankalp List"
              subtitle="Enter the name and gotra of each family member"
            />

            <p
              className="text-[12px] rounded-xl border px-3 py-2 mb-3 leading-relaxed"
              style={{ backgroundColor: P.paper, borderColor: P.paperLine, color: P.paperInk }}
            >
              This package covers up to {members.length} family member
              {members.length === 1 ? "" : "s"}. Fill in only as many as you wish — the rest can be
              left blank, and the price is unchanged.
            </p>

            <div className="space-y-3">
              {members.map((m, i) => (
                <div key={i} className="rounded-xl border p-3" style={{ borderColor: P.line, backgroundColor: P.creamCard }}>
                  <span className="block text-[12px] font-semibold mb-2" style={{ color: P.textDark }}>
                    Member {i + 1}
                    <span className="font-normal ml-1 text-stone-400">(optional)</span>
                  </span>
                  <div className={FIELD_CLASS} style={fieldStyle(P, !!errors[`f-${i}-name`])}>
                    <input
                      value={m.name}
                      onChange={(e) => updateMember(i, "name", e.target.value)}
                      placeholder="Name"
                      ref={setFieldRef(`f-${i}-name`)}
                      aria-invalid={!!errors[`f-${i}-name`]}
                      className="flex-1 min-w-0 px-3 py-2.5 text-[14px] outline-none bg-transparent"
                      style={{ color: P.ink }}
                    />
                  </div>
                  <FieldError message={errors[`f-${i}-name`]} />
                  <div className={`${FIELD_CLASS} mt-2`} style={fieldStyle(P, !!errors[`f-${i}-gotra`])}>
                    <input
                      value={m.gotra}
                      onChange={(e) => updateMember(i, "gotra", e.target.value)}
                      placeholder="Gotra"
                      ref={setFieldRef(`f-${i}-gotra`)}
                      aria-invalid={!!errors[`f-${i}-gotra`]}
                      className="flex-1 min-w-0 px-3 py-2.5 text-[14px] outline-none bg-transparent"
                      style={{ color: P.ink }}
                    />
                  </div>
                  <FieldError message={errors[`f-${i}-gotra`]} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Prasad delivery — only offered when the mandir actually has it available */}
        {PUJA.isPrasadAvailable && (
          <Card P={P}>
            <CardHeading
              P={P}
              icon={<LocalShippingOutlinedIcon style={{ fontSize: 18, color: P.navy }} />}
              title="Prasad Delivery"
            />

            <label className="flex items-center gap-2 text-[13px]" style={{ color: P.ink }}>
              <input
                type="checkbox"
                checked={needPrasad}
                onChange={(e) => setNeedPrasad(e.target.checked)}
                className="w-4 h-4"
                style={{ accentColor: P.navy }}
              />
              <span>
                I want prasad delivered to my home
                <span className="font-semibold ml-1" style={{ color: P.orange }}>
                  (+{money(PUJA.prasadPrice)})
                </span>
              </span>
            </label>

            {needPrasad && (
              <div className="mt-3 space-y-3">
                <div>
                  <RequiredLabel>Address</RequiredLabel>
                  <div className={FIELD_CLASS} style={fieldStyle(P, !!errors.address1)}>
                    <input
                      value={address1}
                      onChange={(e) => setAddress1(e.target.value)}
                      placeholder="House no., Building, Street"
                      ref={setFieldRef("address1")}
                      aria-invalid={!!errors.address1}
                      className={inputClass}
                      style={{ color: P.ink }}
                    />
                  </div>
                  <FieldError message={errors.address1} />
                </div>

                <div>
                  <label className="text-[13px] text-stone-700 font-medium block mb-2">
                    Address Line 2 <span className="text-stone-400 font-normal">(optional)</span>
                  </label>
                  <div className={FIELD_CLASS} style={fieldStyle(P)}>
                    <input
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      placeholder="Area, Landmark"
                      className={inputClass}
                      style={{ color: P.ink }}
                    />
                  </div>
                </div>

                <div>
                  <RequiredLabel>Pincode</RequiredLabel>
                  <div className={FIELD_CLASS} style={fieldStyle(P, !!errors.pincode)}>
                    <input
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      type="tel"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit pincode"
                      ref={setFieldRef("pincode")}
                      aria-invalid={!!errors.pincode}
                      className={inputClass}
                      style={{ color: P.ink }}
                    />
                  </div>
                  <FieldError message={errors.pincode} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <RequiredLabel>City</RequiredLabel>
                    <div className={FIELD_CLASS} style={fieldStyle(P, !!errors.city)}>
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        ref={setFieldRef("city")}
                        aria-invalid={!!errors.city}
                        className={inputClass}
                        style={{ color: P.ink }}
                      />
                    </div>
                    <FieldError message={errors.city} />
                  </div>
                  <div>
                    <RequiredLabel>State</RequiredLabel>
                    <div className={FIELD_CLASS} style={fieldStyle(P, !!errors.state)}>
                      <input
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        ref={setFieldRef("state")}
                        aria-invalid={!!errors.state}
                        className={inputClass}
                        style={{ color: P.ink }}
                      />
                    </div>
                    <FieldError message={errors.state} />
                  </div>
                </div>

                <div>
                  <label className="text-[13px] text-stone-700 font-medium block mb-2">Country</label>
                  <div className={FIELD_CLASS} style={fieldStyle(P)}>
                    <input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={inputClass}
                      style={{ color: P.ink }}
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Price details */}
        <Card P={P}>
          <CardHeading
            P={P}
            icon={<ReceiptLongOutlinedIcon style={{ fontSize: 18, color: P.navy }} />}
            title="Price Details"
          />
          <div className="space-y-2 text-[13px]" style={{ color: P.inkSoft }}>
            <div className="flex justify-between gap-2 min-[360px]:gap-3">
              <span className="truncate">{selectedPackage?.label || PUJA.basePriceLabel}</span>
              <span className="shrink-0 whitespace-nowrap" style={{ color: P.ink }}>
                {money(sevaPrice)}
              </span>
            </div>
            {namedMembers.length > 0 && (
              <div className="flex justify-between gap-2 min-[360px]:gap-3">
                <span className="truncate">Family members named</span>
                <span className="shrink-0 whitespace-nowrap" style={{ color: P.ink }}>
                  {namedMembers.length} of {members.length}
                </span>
              </div>
            )}
            {prasadCharge > 0 && (
              <div className="flex justify-between gap-2 min-[360px]:gap-3">
                <span className="truncate">Prasad delivery</span>
                <span className="shrink-0 whitespace-nowrap" style={{ color: P.ink }}>
                  {money(prasadCharge)}
                </span>
              </div>
            )}
            <div
              className="flex justify-between gap-2 min-[360px]:gap-3 border-t border-dashed pt-2 text-[15px] font-semibold"
              style={{ borderColor: P.line, color: P.textDark }}
            >
              <span className="truncate">Total Seva</span>
              <span className="shrink-0 whitespace-nowrap">{money(total)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Same bar as the landing page's "Proceed" state */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white px-3 py-2.5 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={handleProceedToPay}
            disabled={submitting || !PUJA.isBookable}
            className="w-full min-h-[52px] flex items-center justify-center rounded-xl text-white px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: P.raw }}
          >
            <span className="text-[15px] font-medium tracking-wide">
              {!PUJA.isBookable
                ? PUJA.isExpired
                  ? "Booking closed for this puja"
                  : "Currently unavailable"
                : submitting
                ? "Opening secure checkout…"
                : `Proceed to Pay – ${money(total)}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnterPujaBookingPage;
