"use client";

import React, { useRef, useState } from "react";
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import StarIcon from "@mui/icons-material/Star";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { motion, AnimatePresence } from "framer-motion";

import PlanSubscriptionModal, { SubscribablePlan } from "./PlanSubscriptionModal";
import LoginModel from "@/components/pages/home/LoginModel";
import { useJyotirlingaPlansQuery } from "@/hooks/queries/useJyotirlingaPlansQuery";
import type { JyotirlingaPlan } from "@/lib/api/jyotirlingaPlans.api";

// Jyotirlinga Interface
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

interface MobilePlansModalProps {
    open: boolean;
    onClose: () => void;
    selectedJyotirlinga: IJyotirlinga[];
    allJyotirlinga: IJyotirlinga[];
    onStepChange?: (step: number) => void;
}

const MobilePlansModal: React.FC<MobilePlansModalProps> = ({ open, onClose, selectedJyotirlinga, allJyotirlinga, onStepChange }) => {
    const [billingMode, _setBillingMode] = useState<"upfront" | "autopay">("upfront");
    const { data: plans = [], isLoading: loading } = useJyotirlingaPlansQuery();

    // Subscription Modal State
    const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
    const [selectedPlanForSubscription, setSelectedPlanForSubscription] = useState<SubscribablePlan | null>(null);
    const [warningModalOpen, setWarningModalOpen] = useState(false);
    const [warningType, setWarningType] = useState<"one" | "two">("one");
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [pendingPlan, setPendingPlan] = useState<SubscribablePlan | null>(null);
    const [infoPlan, setInfoPlan] = useState<JyotirlingaPlan | null>(null);
    const plansBoxRef = useRef<HTMLDivElement>(null);


    // Calculate total base price from selected Jyotirlinga
    const totalBasePrice = selectedJyotirlinga.reduce(
        (sum, item) => sum + (item.price || 0),
        0
    );

    return (
        <>
            <Modal
                open={open && !subscriptionModalOpen}
                onClose={onClose}
                aria-labelledby="mobile-plans-modal"
                aria-describedby="mobile-subscription-plans"
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(3px)",
                }}
            >
                <Box
                    ref={plansBoxRef}
                    sx={{
                        width: "90%",
                        maxWidth: 400,
                        maxHeight: "85vh",
                        bgcolor: "#1a120b",
                        border: "1px solid #c89b3c",
                        marginTop: "60px",
                        borderRadius: 4,
                        boxShadow: 24,
                        p: 3,
                        overflowY: "auto",
                        position: "relative",
                        "&::-webkit-scrollbar": {
                            display: "none"
                        },
                        msOverflowStyle: "none",
                        scrollbarWidth: "none",
                    }}
                >
                    <IconButton
                        onClick={onClose}
                        sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            color: "#c89b3c",
                        }}
                    >
                        <CloseIcon />
                    </IconButton>

                    <Typography variant="h5" component="h2" sx={{ color: "#f5d78e", fontFamily: "Cinzel, serif", mb: 2, textAlign: "center" }}>
                        Choose Your Plan
                    </Typography>

                    {/* Billing Mode Toggle — hidden until autopay is implemented */}
                    {/* <div className="flex justify-center mb-6"> ... </div> */}



                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center text-[#d6c2a3] py-8">Loading Plans...</div>
                        ) : (
                            plans.map((plan) => {
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

                                return (
                                    <div
                                        key={plan.id}
                                        data-plan-id={plan.planId}
                                        className="relative rounded-2xl p-6 transition-all duration-300 backdrop-blur-sm flex flex-col"
                                        style={{
                                            border: plan.popular
                                                ? "1px solid #c89b3c"
                                                : plan.premium
                                                    ? "1px solid rgba(180,60,40,0.6)"
                                                    : "1px solid rgba(200,155,60,0.3)",
                                            background: "rgba(255,255,255,0.03)",
                                            boxShadow: plan.popular ? "0 0 20px rgba(200,155,60,0.2)" : "none",
                                        }}
                                    >
                                        {/* Badge */}
                                        {plan.badge && (
                                            <div
                                                className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1"
                                                style={{
                                                    background: plan.popular
                                                        ? "linear-gradient(135deg, #f5d78e, #c89b3c)"
                                                        : "linear-gradient(135deg, #7a1d1d, #b33a3a)",
                                                    color: plan.popular ? "#000" : "#fff",
                                                }}
                                            >
                                                {plan.popular ? (
                                                    <StarIcon sx={{ fontSize: 12 }} />
                                                ) : (
                                                    <WorkspacePremiumIcon sx={{ fontSize: 12 }} />
                                                )}
                                                {plan.badge}
                                            </div>
                                        )}

                                        {/* Info Icon with Know More tooltip */}
                                        <div className="absolute top-3 right-3 flex flex-col items-center z-10">
                                            <div
                                                className="relative mb-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium pointer-events-none select-none"
                                                style={{
                                                    background: "rgba(18,12,6,0.85)",
                                                    border: "1px solid rgba(200,155,60,0.55)",
                                                    color: "#f5d78e",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                Know more
                                                <span
                                                    className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 block w-2.5 h-2.5 rotate-45"
                                                    style={{
                                                        background: "rgba(18,12,6,0.85)",
                                                        borderRight: "1px solid rgba(200,155,60,0.55)",
                                                        borderBottom: "1px solid rgba(200,155,60,0.55)",
                                                    }}
                                                />
                                            </div>
                                            <motion.button
                                                animate={{ scale: [1, 1.25, 1] }}
                                                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                                onClick={() => setInfoPlan(plan)}
                                                className="w-6 h-6 flex items-center justify-center rounded-full"
                                                style={{ color: "#c89b3c" }}
                                                title="Know more about this plan"
                                            >
                                                <InfoOutlinedIcon sx={{ fontSize: 22 }} />
                                            </motion.button>
                                        </div>

                                        <div className="text-center mb-4 pt-2">
                                            <h3 className="text-lg font-semibold text-[#f5d78e]">{plan.name}</h3>
                                            <p className="text-xs text-[#e7b56d]">{plan.nameHindi}</p>

                                            {selectedJyotirlinga.length > 0 ? (
                                                <div className="mt-2">
                                                    <span className="text-2xl font-bold text-[#f5d78e]">
                                                        ₹{displayPrice.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs text-[#cfc2b0]">/{perUnit}</span>
                                                </div>
                                            ) : (
                                                <div className="mt-2">
                                                    <span className="text-xs text-[#cfc2b0]">
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

                                        <ul className="space-y-2 mb-4 text-xs text-[#d6c2a3]">
                                            {plan.features.slice(0, 3).map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-2">
                                                    <CheckIcon sx={{ fontSize: 14, color: "#c89b3c", marginTop: "2px" }} />
                                                    {feature}
                                                </li>
                                            ))}

                                            {/* Includes Section */}
                                            {plan.includes && plan.includes.length > 0 && (
                                                <>
                                                    <li className="pt-2 border-t border-[#c89b3c]/30 mt-2 mb-1 text-[#f5d78e] font-medium text-[10px]">
                                                        Prasad Box Includes:
                                                    </li>
                                                    {plan.includes.map((includeItem, idx) => (
                                                        <li
                                                            key={`inc-${idx}`}
                                                            className="flex items-start gap-2 text-[10px] text-[#d6c2a3]"
                                                        >
                                                            <div className="w-1 h-1 rounded-full bg-[#c89b3c] mt-1.5 flex-shrink-0" />
                                                            {includeItem}
                                                        </li>
                                                    ))}
                                                </>
                                            )}
                                        </ul>

                                        <button
                                            onClick={() => {
                                                if (selectedJyotirlinga.length === 0) {
                                                    onClose();
                                                    setTimeout(() => {
                                                        document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                                    }, 300);
                                                    return;
                                                }
                                                if (billingMode === "autopay" && selectedJyotirlinga.length < 2) {
                                                    setWarningType("two");
                                                    setWarningModalOpen(true);
                                                    return;
                                                }

                                                // Check if user is logged in
                                                const userDetails = localStorage.getItem("userDetails");
                                                if (!userDetails) {
                                                    setPendingPlan(plan);
                                                    onClose();
                                                    setLoginModalOpen(true);
                                                    return;
                                                }

                                                setSelectedPlanForSubscription(plan);
                                                setSubscriptionModalOpen(true);
                                                onStepChange?.(3); // Advance to Fill Details step
                                            }}
                                            className="w-full py-2 rounded-lg text-sm font-semibold transition-all mt-auto"
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
                                            }}
                                        >
                                            {plan.premium
                                                ? "Start My Ananta Experience →"
                                                : plan.popular
                                                    ? "Protect My Family with Sankalp →"
                                                    : "Begin My Bhakti Journey →"}
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </Box>
            </Modal>

            {/* Subscription Modal (Sibling) */}
            <PlanSubscriptionModal
                open={subscriptionModalOpen}
                onClose={() => setSubscriptionModalOpen(false)}
                plan={selectedPlanForSubscription}
                selectedJyotirlinga={selectedJyotirlinga}
                onPaymentSuccess={() => onStepChange?.(4)}
                initialBillingMode={billingMode} allJyotirlinga={allJyotirlinga} />

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
                        width: "85%",
                        maxWidth: 350,
                        bgcolor: "#1a120b",
                        border: "1px solid #c0392b",
                        borderRadius: 4,
                        boxShadow: "0 0 30px rgba(192, 57, 43, 0.5)",
                        p: 3,
                        textAlign: "center",
                        position: "relative",
                        outline: "none",
                        overflow: "hidden",
                        "&::before": {
                            content: '""',
                            display: "block",
                            height: "4px",
                            background: "linear-gradient(90deg, #c0392b, #e74c3c, #c0392b)",
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                        }
                    }}
                >
                    {/* Warning Icon */}
                    <div className="flex items-center justify-center mb-3">
                        <div
                            className="flex items-center justify-center rounded-full"
                            style={{
                                width: 52,
                                height: 52,
                                background: "rgba(192, 57, 43, 0.15)",
                                border: "2px solid #c0392b",
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#e74c3c"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: 28, height: 28 }}
                            >
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                    </div>

                    <h3 className="text-lg font-display font-bold mb-1" style={{ color: "#e74c3c" }}>
                        Selection Required
                    </h3>
                    <p className="text-[#d6c2a3] text-sm mb-1 font-semibold">
                        Har Har Mahadev!
                    </p>
                    <p className="text-[#a89880] text-xs mb-5">
                        {warningType === "one"
                            ? "Please select at least 1 Jyotirlinga to start your divine journey."
                            : "Please select at least 2 Jyotirlinga to activate Monthly Autopay."}
                    </p>

                    <div className="flex gap-2 justify-center">
                        <button
                            onClick={() => setWarningModalOpen(false)}
                            className="px-5 py-2 rounded-full text-xs font-semibold transition-all"
                            style={{
                                background: "transparent",
                                border: "1px solid #5a4030",
                                color: "#a89880",
                            }}
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={() => {
                                setWarningModalOpen(false);
                                onClose();
                                const calendarSection = document.getElementById("calendar");
                                if (calendarSection) {
                                    calendarSection.scrollIntoView({ behavior: "smooth" });
                                }
                            }}
                            className="px-6 py-2 rounded-full text-xs font-semibold transition-all"
                            style={{
                                background: "linear-gradient(135deg, #f5d78e, #c89b3c)",
                                color: "#000",
                            }}
                        >
                            Select Jyotirlinga
                        </button>
                    </div>
                </Box>
            </Modal>

            {/* Know More Info Modal */}
            <AnimatePresence>
                {infoPlan && (
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
                        onClick={() => setInfoPlan(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-sm w-full rounded-2xl overflow-hidden"
                            style={{
                                background: "#1a120b",
                                border: "1px solid #c89b3c",
                                boxShadow: "0 0 50px rgba(200,155,60,0.3)",
                            }}
                        >
                            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#f5d78e] to-transparent" />
                            <div className="p-6">
                                <button
                                    onClick={() => setInfoPlan(null)}
                                    className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full"
                                    style={{ background: "rgba(255,255,255,0.06)", color: "#c89b3c" }}
                                >
                                    <CloseIcon sx={{ fontSize: 16 }} />
                                </button>

                                <div className="flex items-center gap-3 mb-1">
                                    <InfoOutlinedIcon sx={{ fontSize: 20, color: "#c89b3c" }} />
                                    <h3 className="text-lg font-display text-[#f5d78e]">{infoPlan.name}</h3>
                                </div>
                                <p className="text-[#c89b3c] text-xs mb-5 ml-8">{infoPlan.nameHindi}</p>

                                <div className="flex items-center gap-3 mb-5">
                                    <div className="flex-1 h-px bg-gradient-to-r from-[#c89b3c]/40 to-transparent" />
                                    <span className="text-[#f5d78e] text-xs">𑁍</span>
                                    <div className="flex-1 h-px bg-gradient-to-l from-[#c89b3c]/40 to-transparent" />
                                </div>

                                {/* Info Highlights */}
                                {infoPlan.infoHighlights && infoPlan.infoHighlights.length > 0 ? (
                                    <ul className="space-y-3">
                                        {infoPlan.infoHighlights.map((highlight, idx) => (
                                            <li key={idx} className="flex items-center gap-3">
                                                <img loading="lazy" 
                                                    src={highlight.icon}
                                                    alt=""
                                                    className="w-9 h-9 object-contain flex-shrink-0 rounded-md"
                                                    style={{ background: "rgba(200,155,60,0.08)", padding: "4px" }}
                                                 />
                                                <span className="text-sm text-[#d6c2a3] leading-snug">{highlight.description}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div
                                        className="rounded-xl p-4 text-center"
                                        style={{ background: "rgba(200,155,60,0.07)", border: "1px dashed rgba(200,155,60,0.3)" }}
                                    >
                                        <InfoOutlinedIcon sx={{ fontSize: 28, color: "#c89b3c", opacity: 0.5, marginBottom: "6px" }} />
                                        <p className="text-[#d6c2a3] text-sm leading-relaxed italic">
                                            Know more about this plan
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={() => setInfoPlan(null)}
                                    className="w-full mt-5 py-2.5 rounded-xl font-semibold text-sm"
                                    style={{ background: "linear-gradient(135deg, #f5d78e, #c89b3c)", color: "#000" }}
                                >
                                    Got it 🙏
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Login Model */}
            <LoginModel
                modalOpen={loginModalOpen}
                setModalOpen={setLoginModalOpen}
                onLoginSuccess={() => {
                    setLoginModalOpen(false);
                    if (pendingPlan) {
                        setSelectedPlanForSubscription(pendingPlan);
                        setSubscriptionModalOpen(true);
                        onStepChange?.(3);
                        setPendingPlan(null);
                    }
                }}
            />
        </>
    );
};

export default MobilePlansModal;
