"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { saveNavState } from "@/lib/nav-state";
import type { IJyotirlinga } from "../../index";
import { useJyotirlingaPlansQuery } from "@/hooks/queries/useJyotirlingaPlansQuery";
import type { JyotirlingaPlan } from "@/lib/api/jyotirlingaPlans.api";

interface StickyBarProps {
  activePlanIndex: number;
  jyotirlingas: IJyotirlinga[];
  selectedJyotirlingas: IJyotirlinga[];
}

// Index-based pricing — mirrors ThirdComponent exactly, not relying on planId string matching
const PLAN_INFO: { monthly: number; label: string }[] = [
  { monthly: 1100, label: "Bhakti Plan" },
  { monthly: 2100, label: "Sankalp Plan" },
  { monthly: 3100, label: "Anant Plan" },
];

const StickyBar: React.FC<StickyBarProps> = ({
  activePlanIndex,
  jyotirlingas,
  selectedJyotirlingas,
}) => {
  const { data: plans = [] } = useJyotirlingaPlansQuery();
  const router = useRouter();

  // Clamp index to available plans
  const safeIndex = Math.min(activePlanIndex, plans.length - 1, PLAN_INFO.length - 1);
  const activePlan: JyotirlingaPlan | null = plans[safeIndex] ?? null;
  const priceInfo = PLAN_INFO[safeIndex] ?? PLAN_INFO[0];

  const handleClick = () => {
    if (!activePlan) return;
    saveNavState("12-jyotirlinga-payment", {
      plan: activePlan,
      selectedJyotirlinga: selectedJyotirlingas,
      allJyotirlinga: jyotirlingas,
      initialBillingMode: "upfront",
    });
    router.push("/services/12-jyotirlinga/payment");
  };

  // Always visible from page open
  if (!activePlan) return null;

  return (
    <>
      {/* Sticky bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: "linear-gradient(to right, #fff7ed, #fef3c7)",
          borderTop: "1px solid rgba(234,88,12,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
          fontFamily: "inherit",
        }}
      >
        {/* Left: price + plan name */}
        <div className="flex flex-row" translate="no">
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "#c2410c",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            <span key={`price-${safeIndex}`}>₹{priceInfo.monthly.toLocaleString("en-IN")}.0</span>
          </div>
          <span className="text-[#c2410c]">/</span>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#9a3412",
              marginTop: 6,
            }}
          >
            <span key={`label-${safeIndex}`}>{priceInfo.label}</span>
          </div>
        </div>

        {/* Right: CTA button */}
        <button
          onClick={handleClick}
          style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "13px 22px",
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 3,
            boxShadow: "0 4px 16px rgba(234,88,12,0.45)",
            letterSpacing: "-0.01em",
            transition: "transform 0.1s",
          }}
          onPointerDown={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)")
          }
          onPointerUp={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")
          }
        >
          <span></span>
          <span>Book Seva</span>
        </button>
      </div>
    </>
  );
};

export default StickyBar;
