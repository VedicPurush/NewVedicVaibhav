"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { saveNavState } from "@/lib/nav-state";
import { IJyotirlinga } from "../../index";
import { useJyotirlingaPlansQuery } from "@/hooks/queries/useJyotirlingaPlansQuery";
import type { JyotirlingaPlan } from "@/lib/api/jyotirlingaPlans.api";
import GppGood from '@mui/icons-material/GppGood';

interface ThirdComponentProps {
  jyotirlingas: IJyotirlinga[];
  selectedJyotirlingas: IJyotirlinga[];
  onActivePlanChange?: (planIndex: number) => void;
}

// ─── Nearest upcoming Jyotirlinga helper ─────────────────────────────────────
const getNearestUpcoming = (jyotirlingas: IJyotirlinga[]): IJyotirlinga | null => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = jyotirlingas
    .filter((j) => j.pujaDate && new Date(j.pujaDate) >= today)
    .sort((a, b) => new Date(a.pujaDate!).getTime() - new Date(b.pujaDate!).getTime());
  return upcoming[0] ?? jyotirlingas[0] ?? null;
};

// ─── Plan badge config ───────────────────────────────────────────────────────
const BADGE_CONFIG: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  premium: { label: "Premium", bg: "#1a1150", color: "#fff" },
  popular: { label: "Most Popular", bg: "#22863a", color: "#fff" },
  basic: { label: "Basic", bg: "#6d4c08", color: "#fff" },
};

// ─── Starting date helper (first puja date across selected) ──────────────────
const FORMAT_DATE = (dateStr?: string) => {
  if (!dateStr) return "25 April, 2026";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// ─── PlanCard ────────────────────────────────────────────────────────────────
interface PlanCardProps {
  plan: JyotirlingaPlan;
  allJyotirlingas: IJyotirlinga[];
  selectedJyotirlingas: IJyotirlinga[];
  onChoose: (plan: JyotirlingaPlan) => void;
}

const PlanCard = React.memo(
  ({ plan, allJyotirlingas, selectedJyotirlingas, onChoose }: PlanCardProps) => {
    const selectedCount = selectedJyotirlingas.length;

    /* price logic */
    const packagePrice =
      plan.planId === "Basic"
        ? 1100
        : plan.planId === "Intermediate"
        ? 2100
        : 3100;

    const originalPrice =
      plan.planId === "Basic"
        ? 1600
        : plan.planId === "Intermediate"
        ? 2600
        : 3600;

    const savings = originalPrice - packagePrice;

    /* total charge = per-month price × 12 months */
    const totalCharge = packagePrice * 12;

    /* nearest upcoming Jyotirlinga (from all, not just selected) */
    const nearestJyo = React.useMemo(
      () => getNearestUpcoming(allJyotirlingas),
      [allJyotirlingas]
    );
    const nearestDate = nearestJyo?.pujaDate;

    /* badge */
    const badgeCfg = plan.premium
      ? BADGE_CONFIG.premium
      : plan.popular
      ? BADGE_CONFIG.popular
      : BADGE_CONFIG.basic;

    /* CTA label */
    const ctaLabel = plan.premium
      ? " Start My Ananta Experience →"
      : plan.popular
      ? "Protect My Family →"
      : " Begin My Bhakti Journey →";

    /* card border accent */
    const cardBorderColor = plan.premium
      ? "#b8a040"
      : plan.popular
      ? "#e05c2a"
      : "#d4a04a";

    const ctaGradient = "linear-gradient(135deg, #fb923c, #ea580c)";

    return (
      <>
        <style>{`
          @keyframes jyo_badge_pulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(34,134,58,0.35); }
            60%      { box-shadow: 0 0 0 6px rgba(34,134,58,0); }
          }
          @keyframes jyo_premium_pulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(26,17,80,0.35); }
            60%      { box-shadow: 0 0 0 6px rgba(26,17,80,0); }
          }
          .jyo-plan-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
          .jyo-plan-card:active { transform: scale(0.985); }
          .jyo-cta-btn { transition: filter 0.15s ease, transform 0.15s ease; }
          .jyo-cta-btn:active { filter: brightness(0.9); transform: scale(0.98); }
        `}</style>

        <div
          className="jyo-plan-card"
          style={{
            margin: "0 16px",
            borderRadius: 22,
            background:
              "radial-gradient(circle at 30% 10%, #fffdf5 0%, #fef6e0 60%, #fdebc8 100%)",
            border: `1.5px solid ${cardBorderColor}`,
            boxShadow: plan.popular
              ? "0 6px 28px rgba(224,92,42,0.22), 0 2px 8px rgba(0,0,0,0.08)"
              : "0 4px 20px rgba(180,140,40,0.18), 0 2px 6px rgba(0,0,0,0.06)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* ── Badge ── */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              background: badgeCfg.bg,
              color: badgeCfg.color,
              fontSize: 12,
              fontWeight: 700,
              padding: "7px 16px 7px 20px",
              borderRadius: "0 22px 0 18px",
              letterSpacing: "0.02em",
              animation: plan.premium
                ? "jyo_premium_pulse 2.4s ease-in-out infinite"
                : plan.popular
                ? "jyo_badge_pulse 2.4s ease-in-out infinite"
                : "none",
              zIndex: 5,
            }}
          >
            {badgeCfg.label}
          </div>

          {/* ── Card body ── */}
          <div style={{ padding: "22px 20px 24px" }}>
            {/* Plan name */}
            <h3
              style={{
                margin: "0 0 4px",
                fontSize: 26,
                fontWeight: 900,
                color: plan.popular ? "#8b1a1a" : "#7c5800",
                fontFamily: 'Georgia, "Times New Roman", Times, serif',
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                paddingRight: 80,
              }}
            >
              {plan.name}
            </h3>

            {/* Price row — per month */}
            <div style={{ marginBottom: 6 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 34,
                    fontWeight: 900,
                    color: plan.popular ? "#c0392b" : "#b8890a",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                  }}
                >
                  ₹{packagePrice.toLocaleString()}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#888",
                    lineHeight: 1,
                  }}
                >
                  / month
                </span>
                {savings > 0 && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#aaa",
                      textDecoration: "line-through",
                      lineHeight: 1,
                      marginLeft: 2,
                    }}
                  >
                    ₹{originalPrice.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Combo pill */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  marginTop: 7,
                  padding: "5px 14px",
                  borderRadius: 999,
                  border: "1.5px solid rgba(180,140,40,0.4)",
                  background: "rgba(253,186,116,0.15)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#7c5800",
                }}
              >
                {selectedCount > 0 ? selectedCount : 12} Jyotirlinga combo · best value
              </div>

              {/* Total charge line */}
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "#555",
                  fontWeight: 400,
                }}
              >
                Total charge: ₹{totalCharge.toLocaleString()} for 12 months
              </div>

              {/* Save badge */}
              {savings > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    marginTop: 7,
                    background: "#22863a",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 999,
                    letterSpacing: "0.01em",
                  }}
                >
                  🏷 You save Rs. {savings}
                </span>
              )}
            </div>

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: "rgba(180,140,40,0.25)",
                margin: "10px 0",
              }}
            />

            {/* Starting from date + nearest Jyotirlinga */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 14,
              }}
            >
              {/* Date icon */}
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                🗓️
              </span>
              <div style={{ lineHeight: 1.35 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#444",
                  }}
                >
                  Starting from date:{" "}
                  <span style={{ color: "#f97316", fontWeight: 700 }}>
                    {FORMAT_DATE(nearestDate)}
                  </span>
                </div>
                {/* Starting Jyotirlinga mini card */}
                {nearestJyo && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginTop: 7,
                      background: "rgba(253,186,116,0.18)",
                      border: "1px solid rgba(180,140,40,0.3)",
                      borderRadius: 10,
                      padding: "6px 10px",
                    }}
                  >
                    <img
                      src={nearestJyo.image}
                      alt={nearestJyo.nameEnglish}
                      loading="lazy"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        objectFit: "contain",
                        background: "#fffaf0",
                        border: "1px solid rgba(234,88,12,0.25)",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#7c2d12",
                          lineHeight: 1.2,
                        }}
                      >
                        {nearestJyo.nameEnglish}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#ea580c",
                          fontWeight: 500,
                          lineHeight: 1.2,
                        }}
                      >
                        {nearestJyo.nameHindi} · {nearestJyo.location}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: "rgba(180,140,40,0.18)",
                marginBottom: 14,
              }}
            />

            {/* What is included */}
            {plan.features.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#222",
                    letterSpacing: "-0.01em",
                  }}
                >
                  What is included ?
                </p>
                <ul
                  style={{ listStyle: "none", padding: 0, margin: 0 }}
                >
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: 7,
                        fontSize: 14,
                        color: "#333",
                        lineHeight: 1.45,
                      }}
                    >
                      <span
                        style={{
                          color: "#22863a",
                          fontWeight: 900,
                          fontSize: 16,
                          lineHeight: 1.2,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prasad box */}
            {plan.includes.length > 0 && (
              <div
                style={{
                  background: "rgba(253,186,116,0.22)",
                  border: "1px solid rgba(180,140,40,0.3)",
                  borderRadius: 14,
                  padding: "12px 14px",
                  marginBottom: 20,
                }}
              >
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#7c5800",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  PRASAD BOX INCLUDE
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  {plan.includes.map((item, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "5px 13px",
                        borderRadius: 999,
                        border: "1.5px solid #ccc",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#333",
                        background: "#fff",
                        wordBreak: "break-word",
                        textAlign: "center",
                        lineHeight: 1.4,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}



            {/* CTA button */}
            <button
              className="jyo-cta-btn"
              onClick={() => onChoose(plan)}
              style={{
                width: "100%",
                height: 56,
                border: "none",
                outline: "none",
                borderRadius: 999,
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 800,
                color: "#fff",
                background: ctaGradient,
                boxShadow: plan.popular
                  ? "0 6px 20px rgba(192,57,43,0.4)"
                  : "0 6px 20px rgba(184,137,10,0.35)",
                letterSpacing: "0.01em",
              }}
            >
              {ctaLabel}
            </button>

            {/* Trust badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                marginTop: 12,
                fontSize: 12,
                fontWeight: 600,
                color: "#22863a",
              }}
            >
              <GppGood/>
              Trusted by 5000+ Devotees
            </div>
          </div>
        </div>
      </>
    );
  }
);

// ─── ThirdComponent ───────────────────────────────────────────────────────────
const ThirdComponent: React.FC<ThirdComponentProps> = ({
  jyotirlingas,
  selectedJyotirlingas,
  onActivePlanChange,
}) => {
  const { data: plans = [], isLoading: loadingPlans } =
    useJyotirlingaPlansQuery();

  const router = useRouter();

  const handleChoose = (plan: JyotirlingaPlan) => {
    saveNavState("12-jyotirlinga-payment", {
      plan,
      selectedJyotirlinga: selectedJyotirlingas,
      allJyotirlinga: jyotirlingas,
      initialBillingMode: "upfront",
    });
    router.push("/services/12-jyotirlinga/payment");
  };

  /* Notify parent which plan card is visible.
     Uses a window scroll listener + getBoundingClientRect so it is immune
     to Google Translate DOM mutations (which break IntersectionObserver by
     wrapping text nodes and replacing element references). */
  React.useEffect(() => {
    if (!onActivePlanChange || plans.length === 0) return;

    let lastIndex = -1;

    const onScroll = () => {
      const mid = window.innerHeight / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      [0, 1, 2].forEach((i) => {
        const el = document.getElementById(`jyo-plan-${i}`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cardMid = rect.top + rect.height / 2;
        const dist = Math.abs(cardMid - mid);
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      });
      if (bestIdx !== lastIndex) {
        lastIndex = bestIdx;
        onActivePlanChange(bestIdx);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Fire once immediately so the bar shows the right plan on mount
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onActivePlanChange, plans.length]);

  return (
    <>
      <div
        id="packages-section"
        style={{
          width: "100%",
          background: "#fef6e4",
          paddingTop: 28,
          paddingBottom: 40,
          boxSizing: "border-box",
        }}
      >
        {/* ── Section heading ── */}
        <div
          style={{
            textAlign: "center",
            padding: "0 24px",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: "#f97316",
              textTransform: "uppercase",
            }}
          >
            Choose Your Seva
          </p>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 900,
              color: "#7c2d12",
              fontFamily: 'Georgia, "Times New Roman", Times, serif',
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            {selectedJyotirlingas.length === jyotirlingas.length
              ? "Complete 12 Jyotirlinga Yatra"
              : `${selectedJyotirlingas.length} Jyotirlinga Seva Selected`}
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              color: "#9a3412",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            अपना आशीर्वाद प्लान चुनें
          </p>
        </div>

        {/* ── Selected strip ── */}
        {/* {selectedJyotirlingas.length > 0 && (
          <div
            style={{
              margin: "0 16px 24px",
              borderRadius: 16,
              background:
                "linear-gradient(135deg,rgba(253,186,116,0.85) 0%,rgba(234,88,12,0.75) 100%)",
              padding: 2,
            }}
          >
            <div
              style={{
                borderRadius: 14,
                background:
                  "radial-gradient(circle at 50% 0%,#fff7ed 0%,#ffedd5 60%,#fed7aa 100%)",
                padding: "14px 14px 10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#9a3412",
                  }}
                >
                  {selectedJyotirlingas.length === jyotirlingas.length
                    ? "🕉 All 12 Jyotirlinga Selected"
                    : `${selectedJyotirlingas.length} Jyotirlinga Selected`}
                </p>
                <span
                  style={{
                    background: "linear-gradient(135deg,#fdba74,#ea580c)",
                    borderRadius: 999,
                    padding: "3px 11px",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  {selectedJyotirlingas.length} / {jyotirlingas.length}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  paddingBottom: 4,
                  scrollbarWidth: "none",
                }}
              >
                {selectedJyotirlingas.map((j) => (
                  <div
                    key={j._id}
                    style={{
                      flexShrink: 0,
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      border: "1px solid rgba(234,88,12,0.4)",
                      overflow: "hidden",
                      background: "#fffaf0",
                    }}
                  >
                    <img
                      src={j.image}
                      alt={j.nameEnglish}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )} */}

        {/* ── Plan Cards ── */}
        {loadingPlans ? (
          <p
            style={{
              textAlign: "center",
              color: "#c2410c",
              fontSize: 14,
              padding: "20px 0",
            }}
          >
            Loading plans...
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {plans.map((plan, idx) => (
              <div key={plan.id} id={`jyo-plan-${idx}`}>
                <PlanCard
                  plan={plan}
                  allJyotirlingas={jyotirlingas}
                  selectedJyotirlingas={selectedJyotirlingas}
                  onChoose={handleChoose}
                />
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  );
};

export default ThirdComponent;
