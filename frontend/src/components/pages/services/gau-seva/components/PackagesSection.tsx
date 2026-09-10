"use client";

import { PACKAGES, type GauSevaPackage } from "../data/gauSevaData";
import { useMoney } from "@/lib/currency";

// Badge config per package
const BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  "Most Popular": { bg: "linear-gradient(135deg,#ff6b35,#e04e1b)", color: "#fff" },
  "Premium":      { bg: "linear-gradient(135deg,#f5a623,#d48806)", color: "#fff" },
  "Save ₹58":     { bg: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff" },
  "Best Value":   { bg: "linear-gradient(135deg,#b45309,#92400e)", color: "#fff" },
  "Max Punya":    { bg: "linear-gradient(135deg,#0f766e,#0d9488)", color: "#fff" },
};

// Card accent colors per index
const CARD_ACCENT = [
  { border: "#ff6b35", bg: "linear-gradient(160deg,#fff8f0,#ffecd2)", label: "#9a3412", check: "#c2410c" },
  { border: "#f5a623", bg: "linear-gradient(160deg,#fffdf5,#fff3d0)", label: "#92400e", check: "#b45309" },
  { border: "#22c55e", bg: "linear-gradient(160deg,#f0fff4,#d4f5e2)", label: "#166534", check: "#15803d" },
  { border: "#f5a623", bg: "linear-gradient(160deg,#fff9f0,#fff0d0)", label: "#7c4a00", check: "#b45309" },
  { border: "#0f766e", bg: "linear-gradient(160deg,#f0fdf9,#ccf2e7)", label: "#134e4a", check: "#0f766e" },
];

const PackageCard = ({
  pkg,
  index,
  onSelect,
}: {
  pkg: GauSevaPackage;
  index: number;
  onSelect: (pkg: GauSevaPackage) => void;
}) => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const accent = CARD_ACCENT[index] ?? CARD_ACCENT[0];
  const badgeStyle = pkg.badge ? BADGE_STYLE[pkg.badge] ?? { bg: "#ff6b35", color: "#fff" } : null;


  return (
    <div
      id={`package-${pkg.id}`}
      style={{
        position: "relative",
        borderRadius: 24,
        background: accent.bg,
        border: `2px solid ${pkg.highlighted ? accent.border : "rgba(0,0,0,0.07)"}`,
        boxShadow: pkg.highlighted
          ? `0 8px 32px ${accent.border}40, 0 2px 8px rgba(0,0,0,0.08)`
          : "0 2px 12px rgba(0,0,0,0.07)",
        overflow: "hidden",
        transform: pkg.highlighted ? "translateY(-2px)" : "none",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
    >
      {/* Corner ribbon badge */}
      {badgeStyle && pkg.badge && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 96,
            height: 96,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 130,
              top: 20,
              right: -34,
              transform: "rotate(45deg)",
              padding: "5px 0",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textAlign: "center",
              color: badgeStyle.color,
              background: badgeStyle.bg,
            }}
          >
            {pkg.badge}
          </div>
        </div>
      )}

      {/* ── Package Image ── */}
      <div style={{ width: "100%", height: 200, position: "relative", overflow: "hidden" }}>
        <img 
          src={pkg.image} 
          alt={pkg.name} 
          loading="lazy" 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
        />
        {/* Soft gradient from bottom of image to blend with card */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: `linear-gradient(to top, ${accent.bg.split(",")[1].trim().replace(")", "")}, transparent)`
        }} />
      </div>

      {/* ── Header ── */}
      <div style={{ padding: "12px 18px 0", position: "relative", zIndex: 2 }}>
        {/* Name row */}
        <div style={{ paddingRight: 60, marginBottom: 4 }}>
          <p
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: accent.label,
              letterSpacing: "-0.01em",
            }}
          >
            {pkg.name}
          </p>
          <p
            className="gs-devanagari"
            style={{ margin: "2px 0 0", fontSize: 14, color: accent.label, opacity: 0.75 }}
          >
            {pkg.nameHindi}
          </p>
        </div>

        {/* Price row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: "#1c1917",
              lineHeight: 1,
              letterSpacing: "-0.03em",
            }}
          >
            {money(pkg.price)}
          </span>
          {pkg.originalPrice && (
            <span
              style={{
                fontSize: 14,
                color: "#9ca3af",
                textDecoration: "line-through",
                marginBottom: 2,
              }}
            >
              {money(pkg.originalPrice)}
            </span>
          )}
        </div>

      </div>

      {/* ── Divider ── */}
      <div
        style={{
          margin: "14px 18px 12px",
          height: 1,
          background: "rgba(0,0,0,0.08)",
        }}
      />

      {/* ── Features ── */}
      <div style={{ padding: "0 18px 12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pkg.features.map((feat, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: accent.check,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                ✓
              </span>
              <span style={{ fontSize: 15, color: "#374151", lineHeight: 1.45 }}>
                {feat}
              </span>
            </div>
          ))}
        </div>

        {/* Deliverables pills */}
        <div
          style={{
            marginTop: 14,
            background: "rgba(255,255,255,0.65)",
            borderRadius: 14,
            padding: "10px 12px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 700,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            What you'll receive
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pkg.deliverables.map((d, i) => (
              <span
                key={i}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#fff",
                  borderRadius: 999,
                  padding: "3px 10px",
                  color: "#374151",
                  border: "1px solid #e5e7eb",
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ padding: "4px 18px 22px" }}>
        <button
          onClick={() => onSelect(pkg)}
          style={{
            width: "100%",
            background: pkg.highlighted
              ? `linear-gradient(135deg, ${accent.border}, ${accent.check})`
              : `linear-gradient(135deg, #ff6b35, #f7931e)`,
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "16px 0",
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: "-0.01em",
            boxShadow: pkg.highlighted ? `0 4px 20px ${accent.border}55` : "0 4px 16px rgba(255,107,53,0.35)",
            transition: "transform 0.1s",
          }}
          onPointerDown={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)")}
          onPointerUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
        >
          {pkg.highlighted ? "✦ Book This Seva" : "Book Seva"}
        </button>
      </div>
    </div>
  );
};

const PackagesSection = ({
  onSelectPackage,
}: {
  onSelectPackage: (pkg: GauSevaPackage) => void;
}) => {

  return (
    <section
      id="packages"
      style={{
        background: "#fef6e4",
        padding: "28px 16px 40px",
        boxSizing: "border-box",
      }}
    >
      {/* Section heading */}
      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            margin: "0 0 4px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "#ff6b35",
            textTransform: "uppercase",
          }}
        >
          Seva Packages
        </p>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 24,
            fontWeight: 900,
            color: "#7c2d12",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          Choose Your Gau Seva
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "#9a3412",
            lineHeight: 1.5,
          }}
        >
          गाय की सेवा करें, पुण्य पाएं
        </p>
      </div>

      {/* Upsell nudge */}
      <div
        style={{
          marginBottom: 20,
          borderRadius: 16,
          background: "#f0fff4",
          border: "1.5px solid #86efac",
          padding: "11px 14px",
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#166534" }}>
          🐄 <strong>Feeding happens every Wednesday.</strong> Photo &amp; certificate sent to your WhatsApp the same day.
        </p>
      </div>

      {/* Cards — vertical stack */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {PACKAGES.map((pkg, i) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            index={i}
            onSelect={onSelectPackage}
          />
        ))}
      </div>
    </section>
  );
};

export default PackagesSection;
