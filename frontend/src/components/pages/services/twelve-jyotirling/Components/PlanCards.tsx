"use client";

import React, { useState } from "react";
import { useJyotirlingaPlansQuery } from "@/hooks/queries/useJyotirlingaPlansQuery";
import type { JyotirlingaPlan } from "@/lib/api/jyotirlingaPlans.api";
import Container from '@mui/material/Container';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import { motion, AnimatePresence } from "framer-motion";
import CheckIcon from "@mui/icons-material/Check";
import StarIcon from "@mui/icons-material/Star";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";

import PlanSubscriptionModal, { SubscribablePlan } from "./PlanSubscriptionModal";
import LoginModel from "@/components/pages/home/LoginModel";

// Jyotirlinga Interface (duplicated to avoid circular dependency)
interface IJyotirlinga {
  _id: string;
  nameEnglish: string;
  nameHindi: string;
  month: string;
  monthNumber: number;
  location: string;
  purpose: string;
  benefits: string[];
  image: string;
  price: number;
  createdAt?: string;
  updatedAt?: string;
}

interface PlanCardsProps {
  selectedJyotirlinga: IJyotirlinga[];
  allJyotirlinga: IJyotirlinga[];
  onStepChange?: (step: number) => void;
}

const PlanCards: React.FC<PlanCardsProps> = ({ selectedJyotirlinga, allJyotirlinga, onStepChange }) => {
  const [billingMode, _setBillingMode] = useState<"upfront" | "autopay">("upfront");
  const { data: plans = [], isLoading: loading } = useJyotirlingaPlansQuery();

  // Subscription Modal State
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [selectedPlanForSubscription, setSelectedPlanForSubscription] = useState<SubscribablePlan | null>(null);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningType, setWarningType] = useState<"one" | "two">("one");
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Info Modal State
  const [infoPlan, setInfoPlan] = useState<JyotirlingaPlan | null>(null);

  const scrollToCalendar = () => {
    const calendarSection = document.getElementById("calendar");
    if (calendarSection) {
      calendarSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };


  // Calculate total base price from selected Jyotirlinga
  const totalBasePrice = selectedJyotirlinga.reduce(
    (sum, item) => sum + (item.price || 0),
    0
  );

  if (loading) {
    return (
      <div className="py-24 text-center text-[#d6c2a3]">
        Loading Plans...
      </div>
    );
  }

  return (
    <section
      id="plans"
      className="py-0 relative overflow-hidden"
    //   style={{
    //     background:
    //       "radial-gradient(circle at top, #2a1a0f 0%, #1a120b 45%, #0f0a07 100%)",
    //   }}
    >
      <Container maxWidth="lg">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2
            className="text-3xl md:text-4xl font-display tracking-wide mb-4"
            style={{
              background: "linear-gradient(90deg, #f5d78e, #c89b3c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              paddingTop: "0.2em",
              lineHeight: 1.4,
            }}
          >
            Choose Your Blessing Plan
          </h2>

          <p className="text-lg text-[#d6c2a3] italic mb-6">
            अपना आशीर्वाद प्लान चुनें — Start your 12-month divine journey
          </p>

          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#c89b3c] to-transparent mx-auto mb-8"></div>

          {/* ---- News Marquee ---- */}
          <style>{`
            @keyframes jyo_dt_marquee_r {
              0% { transform: translate3d(-50%,0,0); }
              100% { transform: translate3d(0,0,0); }
            }
            @keyframes jyo_dt_pop {
              0%, 100% { transform: scale(1); filter: drop-shadow(0 0 3px rgba(200,155,60,0.2)); }
              50% { transform: scale(1.05); filter: drop-shadow(0 0 10px rgba(200,155,60,0.6)); }
            }
          `}</style>
          <div className="mb-4">
            <div className="text-center mb-3">
              <span
                style={{ animation: "jyo_dt_pop 2s ease-in-out infinite" }}
                className="inline-block rounded-full border border-[#c89b3c]/40 bg-[#c89b3c]/10 px-5 py-1.5 text-[10px] font-extrabold tracking-widest text-[#f5d78e] uppercase"
              >
                Featured on 200+ News Channels
              </span>
            </div>
            <div className="overflow-hidden">
              <div
                className="flex w-max gap-3 will-change-transform transform-gpu"
                style={{ animation: "jyo_dt_marquee_r 26s linear infinite" }}
              >
                {[
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-1-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-2-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-3-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-4-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-5-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-6-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-7-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-1-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-2-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-3-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-4-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-5-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-6-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-7-optimized.webp",
                ].map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="flex h-11 w-[110px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#c89b3c]/40 bg-white p-1.5 shadow-md"
                  >
                    <img
                      src={imgUrl}
                      alt={`Media ${idx}`}
                      className="h-full w-full object-contain will-change-transform transform-gpu brightness-110"
                      style={{ transform: "translate3d(0,0,0)" }}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Billing Mode Toggle — hidden until autopay is implemented */}
          {/* <div className="flex justify-center mb-10"> ... </div> */}


        </motion.div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => {
            // Dynamic Price Calculation
            const selectedCount = selectedJyotirlinga.length;
            const planAdjustedBase = Math.round((totalBasePrice * plan.pricePercentage) / 100);

            // Upfront: Apply discount
            const upfrontDiscount = Math.round((planAdjustedBase * plan.yearlyPercentageDiscount) / 100);
            const upfrontTotal = planAdjustedBase - (selectedCount > 1 ? upfrontDiscount : 0);

            // Autopay: Apply 6% markup and divide by count
            const autopayMarkup = 1.06;
            const autopayTotal = Math.round(planAdjustedBase * autopayMarkup);
            const autopayMonthly = selectedCount > 0 ? Math.ceil(autopayTotal / selectedCount) : 0;

            const displayPrice = billingMode === "upfront" ? upfrontTotal : autopayMonthly;
            const perUnit = billingMode === "upfront" ? (selectedCount > 1 ? "once" : "total") : "month";

            const handleSubscribe = () => {
              if (billingMode === "upfront" && selectedJyotirlinga.length === 0) {
                setWarningType("one");
                setWarningModalOpen(true);
                scrollToCalendar();
                return;
              }
              if (billingMode === "autopay" && selectedJyotirlinga.length < 2) {
                setWarningType("two");
                setWarningModalOpen(true);
                scrollToCalendar();
                return;
              }
              const userDetails = localStorage.getItem("userDetails");
              if (!userDetails) {
                setLoginModalOpen(true);
                return;
              }
              setSelectedPlanForSubscription(plan);
              setSubscriptionModalOpen(true);
              onStepChange?.(3);
            };

            return (
              <motion.div
                key={plan.id}
                id={plan.popular ? "plan-sankalp" : plan.premium ? "plan-ananta" : undefined}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={handleSubscribe}
                className="relative rounded-2xl p-8 transition-all duration-300 backdrop-blur-sm flex flex-col h-full cursor-pointer group"
                style={{
                  border: plan.popular
                    ? "2px solid #c89b3c"
                    : plan.premium
                      ? "1px solid rgba(180,60,40,0.6)"
                      : "1px solid rgba(200,155,60,0.3)",
                  boxShadow: plan.popular
                    ? "0 0 40px rgba(200,155,60,0.4)"
                    : "none",
                  transform: plan.popular ? "scale(1.03)" : "scale(1)",
                }}
                whileHover={{ y: -4, boxShadow: plan.popular ? "0 0 55px rgba(200,155,60,0.55)" : "0 0 25px rgba(200,155,60,0.2)" }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                    style={{
                      background: plan.popular
                        ? "linear-gradient(135deg, #f5d78e, #c89b3c)"
                        : "linear-gradient(135deg, #7a1d1d, #b33a3a)",
                      color: plan.popular ? "#000" : "#fff",
                    }}
                  >
                    {plan.popular ? (
                      <StarIcon sx={{ fontSize: 14 }} />
                    ) : (
                      <WorkspacePremiumIcon sx={{ fontSize: 14 }} />
                    )}
                    {plan.badge}
                  </div>
                )}

                {/* Info Icon with Know More tooltip */}
                <div className="absolute top-3 right-3 flex flex-col items-center z-10">
                  {/* Know More speech bubble */}
                  <div
                    className="relative mb-1.5 px-2.5 py-1 rounded-lg text-xs font-medium pointer-events-none select-none"
                    style={{
                      background: "rgba(18,12,6,0.85)",
                      border: "1px solid rgba(200,155,60,0.55)",
                      color: "#f5d78e",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Know more
                    {/* Arrow pointing down */}
                    <span
                      className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 block w-3 h-3 rotate-45"
                      style={{
                        background: "rgba(18,12,6,0.85)",
                        borderRight: "1px solid rgba(200,155,60,0.55)",
                        borderBottom: "1px solid rgba(200,155,60,0.55)",
                      }}
                    />
                  </div>

                  {/* Pulsing Info button */}
                  <motion.button
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoPlan(plan);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-full"
                    style={{
                      // background: "rgba(200,155,60,0.12)",
                      // border: "1px solid rgba(200,155,60,0.4)",
                      color: "#c89b3c",
                      // boxShadow: "0 0 8px rgba(200,155,60,0.3)",
                    }}
                    title="Know more about this plan"
                  >
                    <InfoOutlinedIcon sx={{ fontSize: 25 }} />
                  </motion.button>
                </div>

                {/* Plan Header */}
                <div className="text-center mb-6 pt-4">
                  <h3 className="text-xl font-semibold text-[#f5d78e]">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-[#e7b56d]">
                    {plan.nameHindi}
                  </p>

                  {selectedJyotirlinga.length > 0 ? (
                    <div className="mt-5">
                      <span className="text-4xl font-bold text-[#f5d78e]">
                        ₹{displayPrice.toLocaleString()}
                      </span>
                      <span className="text-sm text-[#cfc2b0]">
                        /{perUnit}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-5">
                      <span className="text-sm text-[#cfc2b0]">
                        Select Jyotirlinga to see price
                      </span>
                    </div>
                  )}
                  {/* autopay save badge — hidden until autopay is implemented */}
                  {/* {billingMode === "upfront" && selectedCount > 1 && (
                    <div>🎉 Save ₹{(autopayTotal - upfrontTotal).toLocaleString()} vs monthly</div>
                  )}
                  {billingMode === "autopay" && selectedCount > 1 && (
                    <p>{selectedCount} monthly payments</p>
                  )} */}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-[#d6c2a3]"
                    >
                      <CheckIcon
                        sx={{
                          fontSize: 16,
                          color: "#c89b3c",
                          marginTop: "2px",
                        }}
                      />
                      {feature}
                    </li>
                  ))}

                  {/* Includes Section */}
                  {plan.includes && plan.includes.length > 0 && (
                    <>
                      <li className="pt-4 border-t border-[#c89b3c]/30 mt-4 mb-3 text-[#f5d78e] font-medium text-sm">
                        Prasad Box Includes:
                      </li>

                      {/* Full-width first item */}
                      <li className="flex items-start gap-1.5 text-[12px] leading-tight text-[#d6c2a3] mb-3">
                        <div className="w-1 h-1 rounded-full bg-[#c89b3c] mt-1.5 flex-shrink-0" />
                        {plan.includes[0]}
                      </li>

                      {/* Remaining items in 2 columns */}
                      {plan.includes.length > 1 && (
                        <li className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                          {Array.from({ length: Math.ceil((plan.includes.length - 1) / 5) }).map((_, colIdx) => (
                            <div key={colIdx} className="space-y-2.5">
                              {plan.includes.slice(1 + colIdx * 5, 1 + (colIdx + 1) * 5).map((includeItem: string, idx: number) => (
                                <div
                                  key={`inc-${colIdx}-${idx}`}
                                  className="flex items-start gap-1.5 text-[12px] leading-tight text-[#d6c2a3]"
                                >
                                  <div className="w-1 h-1 rounded-full bg-[#c89b3c] mt-1.5 flex-shrink-0" />
                                  {includeItem}
                                </div>
                              ))}
                            </div>
                          ))}
                        </li>
                      )}
                    </>
                  )}
                </ul>

                {/* Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleSubscribe(); }}
                  className="w-full py-3 rounded-[10px] font-semibold transition-all mt-auto"
                  style={{
                    background: plan.popular
                      ? "linear-gradient(135deg, #f5d78e, #c89b3c)"
                      : plan.premium
                        ? "linear-gradient(135deg, #7a1d1d, #b33a3a)"
                        : "rgba(255,255,255,0.08)",
                    color: plan.popular
                      ? "#000"
                      : plan.premium
                        ? "#fff"
                        : "#f5d78e",
                    border: "2px solid #c89b3c",
                  }}
                >
                  {plan.premium
                    ? "Start My Ananta Experience →"
                    : plan.popular
                      ? "Protect My Family with Sankalp →"
                      : "Begin My Bhakti Journey →"}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Subscription Modal */}
        <PlanSubscriptionModal
          open={subscriptionModalOpen}
          onClose={() => setSubscriptionModalOpen(false)}
          plan={selectedPlanForSubscription}
          selectedJyotirlinga={selectedJyotirlinga}
          allJyotirlinga={allJyotirlinga}
          onPaymentSuccess={() => onStepChange?.(4)}
          initialBillingMode={billingMode}
        />

        {/* Warning Modal for No Selection */}
        <Modal
          open={warningModalOpen}
          onClose={() => setWarningModalOpen(false)}
          aria-labelledby="warning-modal-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <Box
            sx={{
              width: "90%",
              maxWidth: 400,
              bgcolor: "#1a120b",
              border: "1px solid #c89b3c",
              borderRadius: 4,
              boxShadow: "0 0 25px rgba(200, 155, 60, 0.4)",
              p: 4,
              textAlign: "center",
              position: "relative",
              outline: "none"
            }}
          >
            <h3 className="text-2xl font-display text-[#f5d78e] mb-2">
              Har Har Mahadev!
            </h3>
            <p className="text-[#d6c2a3] mb-6">
              {warningType === "one"
                ? "Please select at least 1 Jyotirlinga to start your divine journey."
                : "Please select at least 2 Jyotirlinga to activate Monthly Autopay."}
            </p>

            <button
              onClick={() => {
                setWarningModalOpen(false);
                const calendarSection = document.getElementById("calendar");
                if (calendarSection) {
                  calendarSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="px-8 py-2.5 rounded-full font-semibold transition-all shadow-gold"
              style={{
                background: "linear-gradient(135deg, #f5d78e, #c89b3c)",
                color: "#000",
              }}
            >
              Select Jyotirlinga
            </button>
          </Box>
        </Modal>

        {/* Login Model */}
        <LoginModel
          modalOpen={loginModalOpen}
          setModalOpen={setLoginModalOpen}
          onLoginSuccess={() => {
            setLoginModalOpen(false);
          }}
        />

        {/* Know More Info Modal */}
        <AnimatePresence>
          {infoPlan && (
            <div
              className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center sm:p-4"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
              onClick={() => setInfoPlan(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                transition={{ type: "spring", damping: 22 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-md flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
                style={{
                  background: "#1a120b",
                  border: "1px solid #c89b3c",
                  boxShadow: "0 0 50px rgba(200,155,60,0.3)",
                  maxHeight: "90vh",
                }}
              >
                {/* Top shimmer */}
                <div className="h-1 w-full flex-shrink-0 bg-gradient-to-r from-transparent via-[#f5d78e] to-transparent" />

                {/* ── FIXED: Image (if present) ── */}
                {infoPlan.infoSectionImage && (
                  <div
                    className="flex-shrink-0 w-full overflow-hidden"
                    style={{ maxHeight: "200px", borderBottom: "1px solid rgba(200,155,60,0.25)" }}
                  >
                    <img
                      src={infoPlan.infoSectionImage}
                      alt={infoPlan.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      style={{ maxHeight: "200px" }}
                    />
                  </div>
                )}

                {/* ── FIXED: Header ── */}
                <div className="flex-shrink-0 px-6 pt-5 pb-3">
                  {/* Close */}
                  <button
                    onClick={() => setInfoPlan(null)}
                    className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#c89b3c" }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </button>

                  <div className="flex items-center gap-3 mb-1">
                    <InfoOutlinedIcon sx={{ fontSize: 22, color: "#c89b3c" }} />
                    <h3 className="text-xl font-display text-[#f5d78e]">{infoPlan.name}</h3>
                  </div>
                  <p className="text-[#c89b3c] text-sm ml-8">{infoPlan.nameHindi}</p>

                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-[#c89b3c]/40 to-transparent" />
                    <span className="text-[#f5d78e] text-xs">𑁍</span>
                    <div className="flex-1 h-px bg-gradient-to-l from-[#c89b3c]/40 to-transparent" />
                  </div>
                </div>

                {/* ── SCROLLABLE: Highlights ── */}
                <div className="flex-1 overflow-y-auto px-6 py-3" style={{ overscrollBehavior: "contain" }}>
                  {infoPlan.infoHighlights && infoPlan.infoHighlights.length > 0 ? (
                    <ul className="space-y-3">
                      {infoPlan.infoHighlights.map((highlight, idx) =>
                        highlight.icon ? (
                          <li key={idx} className="flex items-center gap-4">
                            <img
                              src={highlight.icon}
                              alt=""
                              loading="lazy"
                              className="w-14 h-14 object-contain flex-shrink-0 rounded-md"
                              style={{ background: "rgba(200,155,60,0.08)" }}
                            />
                            <span className="text-sm text-[#d6c2a3] leading-snug">{highlight.description}</span>
                          </li>
                        ) : (
                          <li key={idx} className="flex items-start gap-2 text-sm text-[#d6c2a3]">
                            <CheckIcon sx={{ fontSize: 16, color: "#c89b3c", marginTop: "2px" }} />
                            {highlight.description}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <div
                      className="rounded-xl p-5 text-center"
                      style={{ background: "rgba(200,155,60,0.07)", border: "1px dashed rgba(200,155,60,0.3)" }}
                    >
                      <InfoOutlinedIcon sx={{ fontSize: 32, color: "#c89b3c", opacity: 0.5, marginBottom: "8px" }} />
                      <p className="text-[#d6c2a3] text-sm leading-relaxed italic">
                        Know more about this plan
                      </p>
                    </div>
                  )}
                </div>

                {/* ── FIXED: Footer button ── */}
                <div className="flex-shrink-0 px-6 py-4" style={{ borderTop: "1px solid rgba(200,155,60,0.15)" }}>
                  <button
                    onClick={() => setInfoPlan(null)}
                    className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                    style={{
                      background: "linear-gradient(135deg, #f5d78e, #c89b3c)",
                      color: "#000",
                    }}
                  >
                    Got it 🙏
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Container>
    </section>
  );
};

export default PlanCards;