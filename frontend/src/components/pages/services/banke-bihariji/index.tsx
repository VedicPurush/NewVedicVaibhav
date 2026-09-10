"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { type SevaPackage } from "./data/sevaData";
import HeroSection from "./components/HeroSection";
import PackagesSection from "./components/PackagesSection";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { captureVvUtm } from "@/lib/utm";
import { gtag } from "@/lib/gtag";
import { saveNavState } from "@/lib/nav-state";
import EmotionalSection from "./components/EmotionalSection";
import HowItWorksSection from "./components/HowItWorksSection";
import ModernFaqSection from "./components/ModernFaqSection";
import PujaVideosSection from "./components/PujaVideosSection";
import VoicesOfDevotees from "./components/VoicesOfDevotees";
import FinalCtaSection from "./components/FinalCtaSection";

const Index = () => {
  const router = useRouter();

  useEffect(() => {
    captureVvUtm();
    // Fire ViewContent on landing page load
    const fbq = (window as any).fbq;
    if (typeof fbq === "function") {
      try {
        fbq("track", "ViewContent", {
          content_ids: ["banke-bihariji"],
          content_name: "Shri Banke Bihari Ji Seva",
          content_category: "Banke Bihariji Seva",
          content_type: "product",
          currency: "INR",
        });
      } catch (e) {
        console.warn("fbq ViewContent failed", e);
      }
    }
    gtag("event", "view_item", {
      currency: "INR",
      items: [{
        item_id: "banke-bihariji",
        item_name: "Shri Banke Bihari Ji Seva",
        item_category: "Banke Bihariji Seva",
      }],
    });
  }, []);

  const handleSelectPackage = useCallback((pkg: SevaPackage) => {
    saveNavState("banke-bihariji-payment", { pkg });
    router.push("/services/banke-bihariji/payment");
  }, [router]);

  const handleBeginSeva = useCallback(() => {
    document.getElementById("packages")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar activeIndex="banke-bihariji" />

      {/* Clearance for the fixed header, deliberately left unpainted.
          The header shell is transparent by design (.vv-header in Navbar.css),
          so whatever sits behind it is what the navigation reads against — and
          the page's #fbaa1c used to be on the wrapper, which put a solid yellow
          band behind the logo and menu on every screen. Keeping the fill off
          this strip lets the site background artwork show through the nav, the
          same as every other page. */}
      <div className="pt-20" />

      {/* The page's golden field starts below the header, not behind it.
          HeroSection's -mt-5 collapses through this element exactly as it did
          through the old wrapper, so the hero sits where it always did. */}
      <div style={{ background: "#fbaa1c" }}>
        <HeroSection />
        <div style={{ marginTop: "-160px", position: "relative", zIndex: 10 }}>
          <PackagesSection onSelectPackage={handleSelectPackage} />
        </div>
        <HowItWorksSection />
        <EmotionalSection />
        <PujaVideosSection />
        <VoicesOfDevotees />
        <ModernFaqSection />
        <FinalCtaSection onBeginSeva={handleBeginSeva} />
      </div>

      <Footer />
    </div>
  );
};

export default Index;
