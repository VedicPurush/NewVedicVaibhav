"use client";

import { useCallback, useEffect, useState } from "react";
import { useMoney } from "@/lib/currency";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "./components/HeroSection";
import PackagesSection from "./components/PackagesSection";
import { PACKAGES, type GauSevaPackage } from "./data/gauSevaData";
import "./GauSeva.css";
import { saveNavState } from "@/lib/nav-state";
import MissionBanners from "./components/MissionBanners";
import HowItWorksSection from "./components/HowItWorksSection";
import TrustStatsSection from "./components/TrustStatsSection";
import SpecialOccasionsSection from "./components/SpecialOccasionsSection";
import TestimonialsSection from "./components/TestimonialsSection";
import FaqSection from "./components/FaqSection";
import FinalCtaSection from "./components/FinalCtaSection";

const GauSeva = () => {
  /** Prices display in the devotee's own currency; the India list price is
   *  the input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const router = useRouter();
  const [activePackage, setActivePackage] = useState<GauSevaPackage>(PACKAGES[0]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const updateActive = () => {
      const cutoff = window.innerHeight * 0.6;
      let closestPkg = PACKAGES[0];
      let minDistance = Infinity;

      for (const pkg of PACKAGES) {
        const el = document.getElementById(`package-${pkg.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const distance = Math.abs(rect.top - cutoff);
          if (distance < minDistance) {
            minDistance = distance;
            closestPkg = pkg;
          }
        }
      }
      setActivePackage(closestPkg);
    };

    const handleScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        updateActive();
        timeoutId = undefined as any;
      }, 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    // Initial check
    setTimeout(updateActive, 200);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleScrollToPackages = useCallback(() => {
    document.getElementById("packages")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const openBooking = useCallback(
    (pkg: GauSevaPackage) => {
      saveNavState("gau-seva-payment", { pkg, quantity: 1 });
      router.push("/services/gau-seva/payment");
    },
    [router]
  );

  return (
    /* Mobile-first wrapper: centers & caps at 480px on desktop */
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        className="gs-page gs-bottom-pad"
        style={{
          width: "100%",
          maxWidth: 480,
          background: "linear-gradient(180deg, #fff8f0 0%, #fff3e0 100%)",
          position: "relative",
        }}
      >
        <Navbar activeIndex="services" />

        <div className="pt-16">
          <HeroSection onBookNow={handleScrollToPackages} />

          <MissionBanners />
          <HowItWorksSection />

          <PackagesSection onSelectPackage={openBooking} />

          <TrustStatsSection />
          <SpecialOccasionsSection onScrollToPackages={handleScrollToPackages} />
          <TestimonialsSection />
          <FaqSection />
          <FinalCtaSection onBookNow={handleScrollToPackages} />
        </div>

        <Footer />

        {/* Sticky bottom CTA */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 480,
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(12px)",
            padding: "10px 16px max(14px, env(safe-area-inset-bottom))",
            boxShadow: "0 -2px 20px rgba(0,0,0,0.1)",
            zIndex: 90,
            boxSizing: "border-box",
          }}
        >
          <button
            onClick={() => openBooking(activePackage)}
            className="gs-pulse"
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #ff6b35, #f7931e)",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "14px 0",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              letterSpacing: "-0.01em",
              display: "flex",
              justifyContent: "center",
              gap: 8,
              alignItems: "center"
            }}
          >

            <span>{activePackage.name} — {money(activePackage.price)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GauSeva;
