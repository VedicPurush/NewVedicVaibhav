"use client";

import { useParams, useRouter } from "next/navigation";
import { useMoney } from "@/lib/currency";
import { extractIdFromSlug } from "@/lib/slug";
import { useEffect, useMemo, useRef, useState } from "react";
import { Carousel, Col, Row, Spin } from "antd";
import Layout from "@/components/layout/Layout";

import ArrowRightAlt from '@mui/icons-material/ArrowRightAlt';
import ArrowForwardIos from '@mui/icons-material/ArrowForwardIos';
import CalendarToday from '@mui/icons-material/CalendarToday';
import TempleHindu from '@mui/icons-material/TempleHindu';
import WhatsApp from '@mui/icons-material/WhatsApp';

import CountdownTimer from "@/components/widgets/puja/TimerCard";
import StickyNavigationPage from "@/components/widgets/puja/Detailing";

import { useMandirByIdQuery, usePoojaDetailQuery } from "@/hooks/useAllPoojas";


/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

const Choose_package_desktop = () => {
  return (
    <div>
      <Layout content={<Choose_package_desktop_content />} activeIndex="puja" />
    </div>
  );
};
export default Choose_package_desktop;

const Choose_package_desktop_content = () => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const router = useRouter();


  const [images, setImages] = useState<string[]>([]); // Start without the first image
  const [firstImage, setFirstImage] = useState<string | null>(null);
  // Define the ref for the packages section

  const handleImageClick = (index: number) => {
    const newImages = [...images];
    const temp = firstImage;
    setFirstImage(newImages[index]); // Set the clicked image as the firstImage
    newImages[index] = temp!; // Swap the images
    setImages(newImages); // Update the images array
  };

  const { id } = useParams<{ id: string }>();
  // `id` is really a "name-id" slug (see lib/slug.ts) — kept AS-IS below when
  // forwarding to the next page (payment/select-package), so the pretty URL
  // carries forward instead of collapsing back to a bare id. `pujaId` is the
  // recovered real Mongo id, used for every actual API lookup.
  const pujaId = extractIdFromSlug(id);

  const {
    data: selectedPuja,
    isLoading: isPoojaLoading,
    isFetching: isPoojaFetching,
  } = usePoojaDetailQuery(pujaId);

  const mandirIdRaw = selectedPuja?.mandirLists?.[0]?.mandirId;
  const mandirId =
    typeof mandirIdRaw === "string"
      ? mandirIdRaw
      : mandirIdRaw?._id || "";

  const {
    data: templeDetails,
    isLoading: isMandirLoading,
    isFetching: isMandirFetching,
  } = useMandirByIdQuery(mandirId);

  const poojaDates = selectedPuja?.mandirLists?.[0]?.poojaMandirDates || [];

  // ---------------- DATE HELPERS (pick nearest upcoming date) ----------------
  const parseFlexibleDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    if (typeof value === "number") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === "string") {
      const s = value.trim();
      if (!s) return null;

      // dd-mm-yyyy
      const m1 = s.match(/^([0-3]?\d)-([0-1]?\d)-(\d{4})$/);
      if (m1) {
        const dd = Number(m1[1]);
        const mm = Number(m1[2]);
        const yyyy = Number(m1[3]);
        const d = new Date(yyyy, mm - 1, dd, 0, 0, 0);
        return isNaN(d.getTime()) ? null : d;
      }

      // yyyy-mm-dd or ISO
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  // We want the date that is nearest to "today" (not time-of-day), so today's campaign
  // stays valid for the full day and only changes after midnight when the date changes.
  // If all dates are in the past, we fallback to the latest past date.
  const pickNearestUpcomingDate = (dates: any[]): any | undefined => {
    if (!Array.isArray(dates) || dates.length === 0) return undefined;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0); // 12:00 AM

    // Normalize each date -> { raw, time }
    type NormalizedDate = { raw: any; time: number };
    const normalized: NormalizedDate[] = dates
      .map((raw) => {
        const d = parseFlexibleDate(raw);
        if (!d) return null;
        const day = new Date(d);
        day.setHours(0, 0, 0, 0); // compare by day only
        return { raw, time: day.getTime() } as NormalizedDate;
      })
      .filter((x): x is NormalizedDate => x !== null);

    if (normalized.length === 0) return undefined;

    // Upcoming includes today (>= today's 12:00 AM)
    const upcoming = normalized.filter((x) => x.time >= todayStart.getTime());
    if (upcoming.length > 0) {
      upcoming.sort((a, b) => a.time - b.time); // nearest upcoming day
      return upcoming[0].raw;
    }

    // All are in the past -> return the most recent past (max)
    normalized.sort((a, b) => b.time - a.time);
    return normalized[0].raw;
  };
  // -------------------------------------------------------------------------

  // ✅ Pick the date that is nearest to us now (nearest upcoming)
  const rawPoojaDate = useMemo(() => {
    return pickNearestUpcomingDate(poojaDates);
  }, [poojaDates]);
  const poojaTime = selectedPuja?.mandirLists?.[0]?.poojaMandirTime || "";

  const isExpired = useMemo(() => {
    if (selectedPuja?.isActive === false) return true;
    if (!rawPoojaDate) return false;
    const parts = String(rawPoojaDate).split("T")[0].split("-");
    const endOfDay = parts.length >= 3
      ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999).getTime()
      : new Date(rawPoojaDate).setHours(23, 59, 59, 999);
    return Date.now() > endOfDay;
  }, [rawPoojaDate, selectedPuja?.isActive]);

  const { poojaDate } = useMemo(() => {
    if (!rawPoojaDate) return { poojaDate: "" };

    const dateObject = new Date(rawPoojaDate);
    // e.g. "Monday, 24 October 2026"
    const formattedDate = dateObject.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return { poojaDate: formattedDate };
  }, [rawPoojaDate]);



  const hasTracked = useRef(false);
  useEffect(() => {
    if (!id || hasTracked.current) return;
    window.fbq?.("track", "ViewContent", {
      puja_id: id,
      pooja_name: selectedPuja?.title,
      content_type: "Pooja",
      currency: "INR",
    });
    hasTracked.current = true;
  }, [id, selectedPuja?.title]);



  // Parent component
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const [_showButton, setShowButton] = useState(true);
  const [prasadModalVisible, setPrasadModalVisible] = useState(false);
  const [prasadSelected, setPrasadSelected] = useState(false);

  const handleSelectPackage = () => {
    if (!selectedPackage) {
      if (packagesSectionRef.current) {
        packagesSectionRef.current.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    // Show prasad modal instead of navigating directly
    setPrasadModalVisible(true);
  };

  const proceedToPayment = (addPrasad: boolean) => {
    if (!selectedPackage) return;

    localStorage.setItem(
      "selectedPackage",
      JSON.stringify({
        pujaId: selectedPuja._id,
        mandirId: selectedPuja.mandirLists[0].mandirId,
        packageName: selectedPackage,
      })
    );

    localStorage.setItem("prasadSelection", addPrasad ? "yes" : "no");
    setPrasadModalVisible(false);
    router.push(`/services/puja/${id}/payment`);
  };

  const shareOnWhatsApp = () => {
    if (!selectedPuja) {
      console.error("Missing required puja or temple details.");
      return;
    }

    // Directly use Hindi text and emojis (DO NOT encode them)
    const pujaDetails = `✷ *${selectedPuja.title}* at *${templeDetails.nameEnglish}*
✷ *Date:* ${poojaDate}
✷ *Time:* ${poojaTime}
✷ *Book Now:* https://vedicvaibhav.com/services/puja/${id}/select-package`;

    // Encode only special characters while keeping Hindi & emojis unchanged
    const encodedMessage = encodeURIComponent(pujaDetails)
      .replace(/%E2%80%8D/g, "") // Remove zero-width characters (common issue with Hindi)
      .replace(/%2A/g, "*") // Decode `*` for bold text
      .replace(/%20/g, " ") // Ensure spaces are proper
      .replace(/%0A/g, "%0A%0A"); // Double newline fix for WhatsApp spacing

    // Construct WhatsApp URL
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    // Open WhatsApp share link
    window.open(whatsappUrl, "_blank");
  };

  const packagesSectionRef = useRef<HTMLDivElement | null>(null);

  if (isPoojaLoading || isMandirLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes flow1 {
          0%,
          100% {
            transform: translateX(-150%) translateY(-50%);
          }
          50% {
            transform: translateX(600%) translateY(-50%);
          }
        }
        @keyframes flow2 {
          0%,
          100% {
            transform: translateX(-150%) translateY(-50%);
          }
          50% {
            transform: translateX(650%) translateY(-50%);
          }
        }
        @keyframes flow3 {
          0%,
          100% {
            transform: translateX(-150%) translateY(-50%);
          }
          50% {
            transform: translateX(700%) translateY(-50%);
          }
        }
        @keyframes orbit1 {
          0% {
            transform: rotate(0deg) translateX(120px) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(120px) rotate(-360deg);
          }
        }
        @keyframes orbit2 {
          0% {
            transform: rotate(120deg) translateX(100px) rotate(-120deg);
          }
          100% {
            transform: rotate(480deg) translateX(100px) rotate(-480deg);
          }
        }
        @keyframes orbit3 {
          0% {
            transform: rotate(240deg) translateX(110px) rotate(-240deg);
          }
          100% {
            transform: rotate(600deg) translateX(110px) rotate(-600deg);
          }
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2);
          }
        }

          /* Apply margin only on mobile sizes */
          @media (max-width: 768px) {
          .mobile-top-margin {
          margin-top: 10px; /* adjust the value as needed */
        }
      }
      `}</style>

      <div style={{ overflowX: "hidden", width: "100%", position: "relative" }}>
        <div className="relative w-full h-2">
          {/* Base glowing line with gradient */}
          <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400 to-transparent blur-sm"></div>
          </div>
          {/* Multiple flowing light waves */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 w-64 bg-gradient-to-r from-transparent via-yellow-300 to-transparent blur-md opacity-80"
              style={{ animation: "flow1 4s ease-in-out infinite" }}
            ></div>
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 w-48 bg-gradient-to-r from-transparent via-orange-400 to-transparent blur-lg opacity-60"
              style={{ animation: "flow2 5s ease-in-out infinite 1s" }}
            ></div>
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 w-32 bg-gradient-to-r from-transparent via-red-400 to-transparent blur-sm opacity-70"
              style={{ animation: "flow3 3.5s ease-in-out infinite 0.5s" }}
            ></div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 bg-gradient-radial from-yellow-300 via-orange-500 to-transparent rounded-full blur-2xl opacity-60 animate-[spin_8s_linear_infinite]"></div>
              <div className="absolute inset-0 bg-gradient-radial from-orange-400 via-red-500 to-transparent rounded-full blur-xl opacity-50 animate-[spin_6s_linear_infinite_reverse]"></div>
              <div className="absolute inset-0 bg-gradient-radial from-yellow-200 to-transparent rounded-full blur-lg animate-pulse"></div>
            </div>
          </div>
          {/* Orbiting particles */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
            <div
              className="absolute top-0 left-1/2 w-3 h-3 bg-yellow-400 rounded-full blur-sm opacity-80"
              style={{ animation: "orbit1 6s linear infinite" }}
            ></div>
            <div
              className="absolute top-0 left-1/2 w-2 h-2 bg-orange-500 rounded-full blur-sm opacity-70"
              style={{ animation: "orbit2 8s linear infinite" }}
            ></div>
            <div
              className="absolute top-0 left-1/2 w-2 h-2 bg-red-400 rounded-full blur-sm opacity-60"
              style={{ animation: "orbit3 7s linear infinite" }}
            ></div>
          </div>
          {/* Side energy bursts */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-24">
            <div className="absolute inset-0 bg-gradient-radial from-red-500 via-orange-500 to-transparent rounded-full blur-2xl opacity-40 animate-[pulse_2.5s_ease-in-out_infinite]"></div>
            <div className="absolute inset-0 bg-gradient-conic from-orange-400 to-transparent rounded-full blur-xl opacity-30 animate-[spin_10s_linear_infinite]"></div>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-24">
            <div className="absolute inset-0 bg-gradient-radial from-red-500 via-orange-500 to-transparent rounded-full blur-2xl opacity-40 animate-[pulse_2.5s_ease-in-out_infinite_1s]"></div>
            <div className="absolute inset-0 bg-gradient-conic from-orange-400 to-transparent rounded-full blur-xl opacity-30 animate-[spin_10s_linear_infinite_reverse]"></div>
          </div>
          {/* Scattered light particles */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-300 rounded-full blur-sm"
              style={{
                left: `${15 + i * 6}%`,
                top: "50%",
                opacity: 0.4,
                animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite ${i * 0.3}s`,
              }}
            ></div>
          ))}
        </div>

        {!isPoojaLoading &&
          !isMandirLoading &&
          (isPoojaFetching || isMandirFetching) && (
            <div className="max-w-6xl mx-auto mt-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur border border-orange-200 text-orange-800 text-xs font-semibold shadow-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                Updating...
              </div>
            </div>
          )}
        {selectedPuja && templeDetails ? (
          <div className="mobile-top-margin" style={{ width: "100%" }}>
            <Col xl={24} md={0} lg={24} xs={0} sm={0}>
              <Row
                style={{
                  position: "relative",
                  backgroundColor: "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    paddingInline: "6%",
                    width: "100%",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  <Row
                    style={{
                      width: "100%",
                      padding: "1.2%",
                      marginTop: "0.8%",
                      borderRadius: "16px",
                      background:
                        "linear-gradient(135deg, rgba(255,248,240,0.4), rgba(255,243,224,0.4))",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,125,0,0.1)",
                      animation: "fadeInUp 0.8s ease-out",
                    }}
                  >
                    {/* Image Carousel */}
                    <Col span={11}>
                      <div
                        style={{
                          borderRadius: "12px",
                          overflow: "hidden",
                          boxShadow: "0 8px 32px rgba(255,125,0,0.15)",
                          border: "2px solid rgba(255,125,0,0.2)",
                          position: "relative",
                          animation: "fadeIn 1s ease-out",
                        }}
                      >
                        {/* Spiritual corner decorations */}
                        <div
                          style={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            width: 24,
                            height: 24,
                            borderTop: "3px solid rgba(255,125,0,0.6)",
                            borderLeft: "3px solid rgba(255,125,0,0.6)",
                            borderRadius: "4px 0 0 0",
                            zIndex: 10,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 24,
                            height: 24,
                            borderTop: "3px solid rgba(255,125,0,0.6)",
                            borderRight: "3px solid rgba(255,125,0,0.6)",
                            borderRadius: "0 4px 0 0",
                            zIndex: 10,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            bottom: 8,
                            left: 8,
                            width: 24,
                            height: 24,
                            borderBottom: "3px solid rgba(255,125,0,0.6)",
                            borderLeft: "3px solid rgba(255,125,0,0.6)",
                            borderRadius: "0 0 0 4px",
                            zIndex: 10,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            bottom: 8,
                            right: 8,
                            width: 24,
                            height: 24,
                            borderBottom: "3px solid rgba(255,125,0,0.6)",
                            borderRight: "3px solid rgba(255,125,0,0.6)",
                            borderRadius: "0 0 4px 0",
                            zIndex: 10,
                          }}
                        />

                        <Carousel
                          arrows={true}
                          draggable={true}
                          infinite={true}
                          autoplay={true}
                          autoplaySpeed={2000}
                          style={{
                            paddingTop: "0%",
                            borderRadius: "12px",
                            minHeight: "13vh",
                          }}
                        >
                          {selectedPuja.images.map(
                            (image: any, index: number) => (
                              <div key={index} style={{ borderRadius: "12px" }}>
                                <img loading="lazy" 
                                  src={image}
                                  style={{
                                    width: "100%",
                                    borderRadius: "12px",
                                    transition: "transform 0.3s ease",
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.transform =
                                      "scale(1.02)";
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.transform =
                                      "scale(1)";
                                  }}
                                  onClick={() => handleImageClick(index)}
                                  alt={`Temple image ${index + 1}`}
                                />
                              </div>
                            )
                          )}
                        </Carousel>
                      </div>
                    </Col>

                    {/* Content Section */}
                    <Col span={13} style={{ paddingInline: "3%" }}>
                      {/* Title with spiritual accent */}
                      <div style={{ position: "relative", marginBottom: "1%" }}>
                        <div
                          style={{
                            fontSize: "36px",
                            fontWeight: "bold",
                            fontFamily: "Hind",
                            background:
                              "linear-gradient(135deg, #8B4513, #FF7D00, #8B4513)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                            animation: "fadeInDown 0.6s ease-out",
                            position: "relative",
                          }}
                        >
                          {selectedPuja.title}
                        </div>
                        {/* Decorative underline */}
                        <div
                          style={{
                            width: "80px",
                            height: "3px",
                            background:
                              "linear-gradient(90deg, #FF7D00, #FFB800)",
                            borderRadius: "2px",
                            marginTop: "0.5%",
                            animation: "expandWidth 0.8s ease-out 0.3s both",
                          }}
                        />
                      </div>

                      {/* Benefits */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          listStyleType: "disc",
                          paddingLeft: "0px",
                          margin: "0",
                          marginTop: "1.5%",
                          fontSize: "18px",
                          fontFamily: "Montserrat",
                          color: "rgba(0,0,0,0.8)",
                          animation: "fadeIn 1s ease-out 0.2s both",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: selectedPuja.poojaCardBenefit,
                        }}
                      ></div>

                      {/* Location */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          color: "rgba(0,0,0,0.7)",
                          fontWeight: "400",
                          fontSize: "16px",
                          marginTop: "1.5%",
                          padding: "0.8% 1.2%",
                          background: "rgba(255,125,0,0.05)",
                          borderRadius: "8px",
                          borderLeft: "3px solid #FF7D00",
                          animation: "slideInLeft 0.6s ease-out 0.4s both",
                          transition: "all 0.3s ease",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255,125,0,0.1)";
                          e.currentTarget.style.transform = "translateX(4px)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255,125,0,0.05)";
                          e.currentTarget.style.transform = "translateX(0)";
                        }}
                      >
                        <TempleHindu
                          style={{ marginRight: "2%", color: "#FF7D00" }}
                        />
                        {templeDetails.nameEnglish}, {templeDetails.city},{" "}
                        {templeDetails.state}
                      </div>

                      {/* Date */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          color: "rgba(0,0,0,0.7)",
                          fontSize: "16px",
                          marginTop: "1%",
                          padding: "0.8% 1.2%",
                          background: "rgba(255,184,0,0.05)",
                          borderRadius: "8px",
                          borderLeft: "3px solid #FFB800",
                          animation: "slideInLeft 0.6s ease-out 0.5s both",
                          transition: "all 0.3s ease",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255,184,0,0.1)";
                          e.currentTarget.style.transform = "translateX(4px)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255,184,0,0.05)";
                          e.currentTarget.style.transform = "translateX(0)";
                        }}
                      >
                        <CalendarToday
                          style={{ marginRight: "2%", color: "#FFB800" }}
                        />
                        {poojaDate}
                      </div>

                      {/* Countdown Timer */}
                      <Row
                        style={{
                          marginTop: "1%",
                          animation: "fadeInUp 0.8s ease-out 0.6s both",
                        }}
                      >
                        <Col span={13}>
                          <CountdownTimer targetDate={rawPoojaDate} isActive={!isExpired} />
                        </Col>
                      </Row>

                      {/* Action Buttons */}
                      <Row
                        style={{
                          justifyContent: "space-between",
                          alignItems: "center",
                          display: "flex",
                          marginTop: "2%",
                          animation: "fadeInUp 0.8s ease-out 0.7s both",
                        }}
                      >
                        <Col
                          span={16}
                          onClick={isExpired ? undefined : handleSelectPackage}
                          style={{
                            cursor: isExpired ? "not-allowed" : "pointer",
                            background: isExpired
                              ? "#9ca3af"
                              : "linear-gradient(90deg, #FF850A 0%, #FF9B21 35%, #FFAD3F 82%)",
                            boxShadow: isExpired ? "none" : "0px 4px 16px rgba(255,125,0,0.3)",
                            color: "white",
                            fontSize: "17px",
                            fontWeight: 600,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            borderRadius: "100px",
                            padding: "1.3%",
                            border: "2px solid rgba(255,255,255,0.3)",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            position: "relative",
                            overflow: "hidden",
                          }}
                          onMouseOver={(e) => {
                            if (isExpired) return;
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0px 6px 24px rgba(255,125,0,0.4)";
                          }}
                          onMouseOut={(e) => {
                            if (isExpired) return;
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0px 4px 16px rgba(255,125,0,0.3)";
                          }}
                        >
                          {!isExpired && (
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: "-100%",
                                width: "100%",
                                height: "100%",
                                background:
                                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                                animation: "shine 3s ease-in-out infinite",
                              }}
                            />
                          )}
                          {isExpired ? "Event Ended" : <><span>Select Package</span>&nbsp;<ArrowRightAlt /></>}
                        </Col>

                        <Col
                          span={8}
                          style={{
                            display: "flex",
                            justifyContent: "end",
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              width: "100%",
                              justifyContent: "end",
                              padding: "0.8% 1.2%",
                              borderRadius: "8px",
                              transition: "all 0.3s ease",
                              fontSize: "15px",
                              fontWeight: 500,
                              color: "rgba(0,0,0,0.7)",
                            }}
                            onClick={shareOnWhatsApp}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background =
                                "rgba(37,211,102,0.1)";
                              e.currentTarget.style.transform =
                                "translateX(-4px)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.transform = "translateX(0)";
                            }}
                          >
                            Share Whatsapp&nbsp;&nbsp;
                            <WhatsApp
                              style={{ color: "#25D366", fontSize: "22px" }}
                            />
                          </div>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </div>
              </Row>

              {/* CSS Animations */}
              <style>{`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fadeInUp {
      from { 
        opacity: 0; 
        transform: translateY(20px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    
    @keyframes fadeInDown {
      from { 
        opacity: 0; 
        transform: translateY(-20px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    
    @keyframes slideInLeft {
      from { 
        opacity: 0; 
        transform: translateX(-30px); 
      }
      to { 
        opacity: 1; 
        transform: translateX(0); 
      }
    }
    
    @keyframes expandWidth {
      from { width: 0; }
      to { width: 80px; }
    }
    
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.05); }
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    @keyframes shine {
      0% { left: -100%; }
      20%, 100% { left: 100%; }
    }
    
    @keyframes bounceRight {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(4px); }
    }
  `}</style>
            </Col>

            {/* Mobile View */}
            <Col xl={0} lg={0} md={24} xs={24} sm={24}>
              <div className="relative w-full h-2">
                {/* Base glowing line with gradient */}
                <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400 to-transparent blur-sm"></div>
                </div>

                {/* Multiple flowing light waves */}
                <div className="absolute inset-0 overflow-hidden">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-1 w-64 bg-gradient-to-r from-transparent via-yellow-300 to-transparent blur-md opacity-80"
                    style={{ animation: "flow1 4s ease-in-out infinite" }}
                  ></div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-1 w-48 bg-gradient-to-r from-transparent via-orange-400 to-transparent blur-lg opacity-60"
                    style={{ animation: "flow2 5s ease-in-out infinite 1s" }}
                  ></div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-1 w-32 bg-gradient-to-r from-transparent via-red-400 to-transparent blur-sm opacity-70"
                    style={{
                      animation: "flow3 3.5s ease-in-out infinite 0.5s",
                    }}
                  ></div>
                </div>

                {/* Central mandala-like glow */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 bg-gradient-radial from-yellow-300 via-orange-500 to-transparent rounded-full blur-2xl opacity-60 animate-[spin_8s_linear_infinite]"></div>
                    <div className="absolute inset-0 bg-gradient-radial from-orange-400 via-red-500 to-transparent rounded-full blur-xl opacity-50 animate-[spin_6s_linear_infinite_reverse]"></div>
                    <div className="absolute inset-0 bg-gradient-radial from-yellow-200 to-transparent rounded-full blur-lg animate-pulse"></div>
                  </div>
                </div>

                {/* Orbiting particles */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                  <div
                    className="absolute top-0 left-1/2 w-3 h-3 bg-yellow-400 rounded-full blur-sm opacity-80"
                    style={{ animation: "orbit1 6s linear infinite" }}
                  ></div>
                  <div
                    className="absolute top-0 left-1/2 w-2 h-2 bg-orange-500 rounded-full blur-sm opacity-70"
                    style={{ animation: "orbit2 8s linear infinite" }}
                  ></div>
                  <div
                    className="absolute top-0 left-1/2 w-2 h-2 bg-red-400 rounded-full blur-sm opacity-60"
                    style={{ animation: "orbit3 7s linear infinite" }}
                  ></div>
                </div>

                {/* Side energy bursts */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-24">
                  <div className="absolute inset-0 bg-gradient-radial from-red-500 via-orange-500 to-transparent rounded-full blur-2xl opacity-40 animate-[pulse_2.5s_ease-in-out_infinite]"></div>
                  <div className="absolute inset-0 bg-gradient-conic from-orange-400 to-transparent rounded-full blur-xl opacity-30 animate-[spin_10s_linear_infinite]"></div>
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-24">
                  <div className="absolute inset-0 bg-gradient-radial from-red-500 via-orange-500 to-transparent rounded-full blur-2xl opacity-40 animate-[pulse_2.5s_ease-in-out_infinite_1s]"></div>
                  <div className="absolute inset-0 bg-gradient-conic from-orange-400 to-transparent rounded-full blur-xl opacity-30 animate-[spin_10s_linear_infinite_reverse]"></div>
                </div>

                {/* Scattered light particles */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-yellow-300 rounded-full blur-sm"
                    style={{
                      left: `${15 + i * 6}%`,
                      top: "50%",
                      opacity: 0.4,
                      animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite ${i * 0.3}s`,
                    }}
                  ></div>
                ))}
              </div>
              <Row
                style={{
                  position: "relative",
                  backgroundColor: "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Fixed Bottom Button */}
                <div
                  style={{
                    position: "fixed",
                    bottom: 10,
                    width: "100%",
                    zIndex: 201,
                    animation: "fadeInUp 0.8s ease-out 0.7s both",
                  }}
                >
                  <Col
                    span={24}
                    onClick={isExpired ? undefined : handleSelectPackage}
                    style={{
                      cursor: isExpired ? "not-allowed" : "pointer",
                      background: isExpired
                        ? "#9ca3af"
                        : "linear-gradient(90deg, #FF850A 0%, #FF9B21 35%, #FFAD3F 82%)",
                      boxShadow: isExpired ? "none" : "0px 4px 20px rgba(255,125,0,0.4)",
                      color: "white",
                      fontSize: "17px",
                      fontWeight: 600,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: "100px",
                      padding: "3.5%",
                      marginInline: "3%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {!isExpired && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: "-100%",
                          width: "100%",
                          height: "100%",
                          background:
                            "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                          animation: "shine 3s ease-in-out infinite",
                        }}
                      />
                    )}
                    {isExpired ? "Event Ended" : <><span>Select Package</span>&nbsp;<ArrowRightAlt /></>}
                  </Col>
                </div>

                {/* Background glow effect */}
                <div
                  style={{
                    position: "absolute",
                    width: "50%",
                    top: "0%",
                    right: 0,
                    zIndex: 1,
                    opacity: 0.5,
                    animation: "pulseGlow 4s ease-in-out infinite",
                  }}
                >
                  <img loading="lazy" 
                    src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/glow2.png"
                    style={{ width: "100%" }}
                   />
                </div>

                <div
                  style={{
                    paddingInline: "3%",
                    width: "100%",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  <Row
                    style={{
                      width: "100%",
                      padding: "2%",
                      marginTop: "2%",
                      borderRadius: "16px",
                      background:
                        "linear-gradient(135deg, rgba(255,248,240,0.4), rgba(255,243,224,0.4))",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,125,0,0.15)",
                      animation: "fadeInUp 0.8s ease-out",
                    }}
                  >
                    {/* Image Carousel */}
                    <Col span={24}>
                      <div
                        style={{
                          borderRadius: "12px",
                          overflow: "hidden",
                          boxShadow: "0 8px 32px rgba(255,125,0,0.15)",
                          border: "2px solid rgba(255,125,0,0.2)",
                          position: "relative",
                          animation: "fadeIn 1s ease-out",
                        }}
                      >
                        {/* Spiritual corner decorations */}
                        <div
                          style={{
                            position: "absolute",
                            top: 6,
                            left: 6,
                            width: 20,
                            height: 20,
                            borderTop: "3px solid rgba(255,125,0,0.6)",
                            borderLeft: "3px solid rgba(255,125,0,0.6)",
                            borderRadius: "4px 0 0 0",
                            zIndex: 10,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            width: 20,
                            height: 20,
                            borderTop: "3px solid rgba(255,125,0,0.6)",
                            borderRight: "3px solid rgba(255,125,0,0.6)",
                            borderRadius: "0 4px 0 0",
                            zIndex: 10,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            bottom: 6,
                            left: 6,
                            width: 20,
                            height: 20,
                            borderBottom: "3px solid rgba(255,125,0,0.6)",
                            borderLeft: "3px solid rgba(255,125,0,0.6)",
                            borderRadius: "0 0 0 4px",
                            zIndex: 10,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            bottom: 6,
                            right: 6,
                            width: 20,
                            height: 20,
                            borderBottom: "3px solid rgba(255,125,0,0.6)",
                            borderRight: "3px solid rgba(255,125,0,0.6)",
                            borderRadius: "0 0 4px 0",
                            zIndex: 10,
                          }}
                        />

                        <Carousel
                          arrows={true}
                          draggable={true}
                          infinite={true}
                          autoplay={true}
                          autoplaySpeed={2000}
                          style={{
                            paddingTop: "0%",
                            borderRadius: "12px",
                            minHeight: "13vh",
                          }}
                        >
                          {selectedPuja.images.map(
                            (image: any, index: number) => (
                              <div key={index} style={{ borderRadius: "12px" }}>
                                <img loading="lazy" 
                                  src={image}
                                  style={{
                                    width: "100%",
                                    borderRadius: "12px",
                                  }}
                                  onClick={() => handleImageClick(index)}
                                  alt={`Temple image ${index + 1}`}
                                />
                              </div>
                            )
                          )}
                        </Carousel>
                      </div>
                    </Col>

                    {/* Content Section */}
                    <Col
                      span={24}
                      style={{ paddingInline: "0%", paddingTop: "4%" }}
                    >
                      {/* Title with spiritual accent */}
                      <div style={{ position: "relative", marginBottom: "2%" }}>
                        <div
                          style={{
                            fontSize: "22px",
                            fontWeight: "bold",
                            fontFamily: "Hind",
                            background:
                              "linear-gradient(135deg, #8B4513, #FF7D00, #8B4513)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                            animation: "fadeInDown 0.6s ease-out",
                          }}
                        >
                          {selectedPuja.title}
                        </div>
                        {/* Decorative underline */}
                        <div
                          style={{
                            width: "60px",
                            height: "3px",
                            background:
                              "linear-gradient(90deg, #FF7D00, #FFB800)",
                            borderRadius: "2px",
                            marginTop: "1.5%",
                            animation: "expandWidth 0.8s ease-out 0.3s both",
                          }}
                        />
                      </div>

                      {/* Benefits */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          listStyleType: "disc",
                          paddingLeft: "0px",
                          margin: "0",
                          marginTop: "3%",
                          fontSize: "16px",
                          fontFamily: "Montserrat",
                          color: "rgba(0,0,0,0.8)",
                          animation: "fadeIn 1s ease-out 0.2s both",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: selectedPuja.poojaCardBenefit,
                        }}
                      ></div>

                      {/* Location */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          color: "rgba(0,0,0,0.7)",
                          fontWeight: "400",
                          fontSize: "14px",
                          marginTop: "3%",
                          padding: "2% 3%",
                          background: "rgba(255,125,0,0.05)",
                          borderRadius: "8px",
                          borderLeft: "3px solid #FF7D00",
                          animation: "slideInLeft 0.6s ease-out 0.4s both",
                        }}
                      >
                        <TempleHindu
                          style={{
                            marginRight: "3%",
                            color: "#FF7D00",
                            fontSize: "18px",
                          }}
                        />
                        {templeDetails.nameEnglish}, {templeDetails.city},{" "}
                        {templeDetails.state}
                      </div>

                      {/* Date */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          color: "rgba(0,0,0,0.7)",
                          fontSize: "14px",
                          marginTop: "2%",
                          padding: "2% 3%",
                          background: "rgba(255,184,0,0.05)",
                          borderRadius: "8px",
                          borderLeft: "3px solid #FFB800",
                          animation: "slideInLeft 0.6s ease-out 0.5s both",
                        }}
                      >
                        <CalendarToday
                          style={{
                            marginRight: "3%",
                            color: "#FFB800",
                            fontSize: "18px",
                          }}
                        />
                        {poojaDate}
                      </div>

                      {/* Countdown Timer */}
                      <Row
                        style={{
                          marginTop: "3%",
                          animation: "fadeInUp 0.8s ease-out 0.6s both",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "100%",
                          paddingLeft: "3%",
                        }}
                      >
                        <Col span={24}>
                          <CountdownTimer targetDate={rawPoojaDate} isActive={!isExpired} />
                        </Col>
                      </Row>

                      {/* WhatsApp Share Button */}
                      <Row
                        style={{
                          justifyContent: "flex-start",
                          alignItems: "center",
                          display: "flex",
                          marginTop: "4%",
                          animation: "fadeInUp 0.8s ease-out 0.7s both",
                        }}
                      >
                        <Col
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "auto",
                            padding: "2.5% 5%",
                            background: "rgba(37,211,102,0.08)",
                            border: "2px solid rgba(37,211,102,0.3)",
                            borderRadius: "12px",
                            transition: "all 0.3s ease",
                          }}
                          onClick={shareOnWhatsApp}
                        >
                          <div
                            style={{
                              cursor: "pointer",
                              display: "flex",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#00A82D",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            Share WhatsApp&nbsp;&nbsp;
                            <WhatsApp
                              style={{ color: "#25D366", fontSize: "20px" }}
                            />
                          </div>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </div>
              </Row>

              {/* CSS Animations */}
              <style>{`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fadeInUp {
      from { 
        opacity: 0; 
        transform: translateY(20px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    
    @keyframes fadeInDown {
      from { 
        opacity: 0; 
        transform: translateY(-15px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    
    @keyframes slideInLeft {
      from { 
        opacity: 0; 
        transform: translateX(-20px); 
      }
      to { 
        opacity: 1; 
        transform: translateX(0); 
      }
    }
    
    @keyframes expandWidth {
      from { width: 0; }
      to { width: 60px; }
    }
    
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.05); }
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    @keyframes shine {
      0% { left: -100%; }
      20%, 100% { left: 100%; }
    }
    
    @keyframes bounceRight {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(4px); }
    }
  `}</style>
            </Col>

            <StickyNavigationPage
              packagesSectionRef={packagesSectionRef} // Ref passed to StickyNavigationPage for smooth scroll
              id={id}
              aboutus={selectedPuja.poojaDescription}
              benefit1description={selectedPuja.poojaBenefits.benefit1Desc}
              benefit1heading={selectedPuja.poojaBenefits.benefit1Heading}
              templeimgSrc={templeDetails.mandirPoojaImage}
              abouttemple={templeDetails.mandirSectionIntro}
              benefit2heading={selectedPuja.poojaBenefits.benefit2Heading}
              benefit2description={selectedPuja.poojaBenefits.benefit2Desc}
              benefit3heading={selectedPuja.poojaBenefits.benefit3Heading}
              benefit3description={selectedPuja.poojaBenefits.benefit3Desc}
              singlepackageprice={
                selectedPuja.mandirLists?.[0]?.singlePackage.price
              }
              singlepackagedesccription={
                selectedPuja.mandirLists?.[0]?.singlePackage.description
              }
              couplepackageprice={
                selectedPuja.mandirLists?.[0]?.partnerPackage.price
              }
              couplepackagedesccription={
                selectedPuja.mandirLists?.[0]?.partnerPackage.description
              }
              familypackageprice={
                selectedPuja.mandirLists?.[0]?.familyBhogPackage.price
              }
              familypackagedesccription={
                selectedPuja.mandirLists?.[0]?.familyBhogPackage.description
              }
              vippackageprice={
                selectedPuja.mandirLists?.[0]?.jointFamilyPackage.price
              }
              vippackagedesccription={
                selectedPuja.mandirLists?.[0]?.jointFamilyPackage.description
              }
              selectedPackage={selectedPackage}
              setSelectedPackage={setSelectedPackage}
              setShowButton={setShowButton}
              pujaImage={selectedPuja.images?.[0] || selectedPuja.poojaCardImage}
              isExpired={isExpired}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "50vh",
            }}
          >
            <Spin size="large" />
          </div>
        )}
      </div>

      {/* Prasad Modal Overlay */}
      {prasadModalVisible && (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/60 backdrop-blur-md transition-opacity"
          onClick={() => { setPrasadModalVisible(false); setPrasadSelected(false); }}
        >
          <div
            className="w-full md:w-1/2 h-auto bg-gradient-to-b from-orange-50 to-white rounded-t-3xl pt-2 pb-6 px-1 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 opacity-70" />

            <div className="px-5">
              {/* Selected Puja Card */}
              <div className="flex items-center gap-4 mb-6 bg-white p-3 rounded-2xl shadow-sm border border-orange-100/50">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-xl blur-sm opacity-20 -z-10" />
                  <img
                    src={selectedPuja?.images?.[0] || selectedPuja?.poojaCardImage || ""}
                    className="w-14 h-14 rounded-xl object-cover border-2 border-orange-100"
                    alt={selectedPuja?.title || "Puja"}
                    loading="lazy"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white">
                    <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-orange-600 mb-0.5">Selected Package</div>
                  <div className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug">{selectedPuja?.title}</div>
                </div>
              </div>

              {/* Heading & Social Proof */}
              <div className="text-center mb-6">
                <h3 className="font-black text-xl text-slate-900 mb-3">Complete Your Devotion 🙏</h3>
                <div className="flex flex-col items-center gap-2">
                  <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5">
                    <span className="text-sm font-black text-orange-700">96% of devotees add Sacred Prasad</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5">
                    <span className="text-xs font-bold text-amber-700">Over 10,000+ Sacred Prasad opted by devotees</span>
                  </div>
                </div>
              </div>

              {/* Prasad Card (clickable toggle) */}
              <div
                className={`relative overflow-hidden flex items-center gap-4 p-4 mb-6 border-2 rounded-2xl transition-all duration-300 cursor-pointer ${
                  prasadSelected ? "bg-orange-50 border-orange-500 shadow-md shadow-orange-100" : "bg-white border-slate-200 hover:border-orange-300"
                }`}
                onClick={() => setPrasadSelected((p) => !p)}
              >
                {/* Selected badge */}
                {prasadSelected && (
                  <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">
                    SELECTED
                  </div>
                )}

                {/* Prasad image */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-xl bg-orange-100 overflow-hidden border border-orange-200 shadow-inner">
                    <img
                      src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/Pandit%20ji%20at%20request/prasadbox.webp"
                      alt="Prasad Box"
                      className="w-full h-full object-cover transform scale-110"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = selectedPuja?.images?.[0] || selectedPuja?.poojaCardImage || "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/prasad-box.jpeg"; }}
                    />
                  </div>
                  <div className="absolute -bottom-2.5 inset-x-0 mx-auto w-fit bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                    <span className="notranslate">{money(201)}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 pr-6">
                  <div className="font-bold text-slate-900 leading-tight mb-1 pr-2">
                    {templeDetails?.nameEnglish ? templeDetails.nameEnglish.split(" ")[0] : "Holy"} Prasad Box
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    Assorted satvik prasad blessed at {templeDetails?.nameEnglish || "the mandir"}, delivered to your home.
                  </div>
                </div>

                {/* Checkbox */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 shrink-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    prasadSelected ? "bg-orange-500 border-orange-500" : "bg-slate-50 border-slate-300"
                  }`}>
                    {prasadSelected && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-3">
                <button
                  className={`w-full py-4 rounded-xl font-black text-white text-base flex items-center justify-center gap-2 transition-all ${
                    prasadSelected
                      ? "bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 scale-[1.02]"
                      : "bg-gradient-to-r from-orange-400 to-red-500"
                  }`}
                  onClick={() => { proceedToPayment(prasadSelected); setPrasadSelected(false); }}
                >
                  {prasadSelected ? "Continue with Prasad" : "Add Prasad to Complete"}
                  <ArrowForwardIos sx={{ fontSize: 16 }} />
                </button>

                <button
                  className="text-xs font-bold text-black underline decoration-slate-300 underline-offset-4 hover:text-slate-600 pb-2 mx-auto"
                  onClick={() => { proceedToPayment(false); setPrasadSelected(false); }}
                >
                  No thanks, I will skip the sacred prasad
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
