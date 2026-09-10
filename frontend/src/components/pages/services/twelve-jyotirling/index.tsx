"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useJyotirlingaListQuery } from "@/hooks/queries/useJyotirlingaQueries";
import "./index.css";
import Navbar from "./Components/Navbar";
import HeroSection from "./Components/Hero";
import { captureVvUtm } from "@/lib/utm";
import { gtag } from "@/lib/gtag";
import CalendarSection from "./Components/CalenderSection";
import FAQSection from "./Components/FAQSection";
import Footer from "./Components/Footer";
import HowItWorks from "./Components/HowItWorks";
import PlanCards from "./Components/PlanCards";
import RashiQuiz from "./Components/RashiQuiz";
import TestimonialsSection from "./Components/TestimonialsSection";
import WhyThisWorks from "./Components/WhyThisWorks";
import BookingLookupModal from "./Components/BookingLookupModal";
import StartpageJyotirling from "./MobileView/StartpageJyotirling";

export interface IJyotirlinga {
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
  infoDescription?: string;
  infoImage?: string;
  miniatureImages?: string[];
  startDate?: string;
  endDate?: string;
  pujaDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Advance past puja dates to next year(s) and sort by nearest upcoming ──
function advanceAndSortJyotirlingas(list: IJyotirlinga[]): IJyotirlinga[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const advanced = list.map((j) => {
    if (!j.pujaDate) return j;
    let d = new Date(j.pujaDate);
    // Roll forward year-by-year until the date is today or in the future
    while (d < today) {
      d = new Date(d);
      d.setFullYear(d.getFullYear() + 1);
    }
    // Only mutate if the date actually changed
    const iso = d.toISOString();
    return iso === j.pujaDate ? j : { ...j, pujaDate: iso };
  });

  // Sort: nearest upcoming first; items without a date go last
  return advanced.sort((a, b) => {
    const aMs = a.pujaDate ? new Date(a.pujaDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bMs = b.pujaDate ? new Date(b.pujaDate).getTime() : Number.MAX_SAFE_INTEGER;
    return aMs - bMs;
  });
}

const Index = () => {
  // SSR-safe: null until the viewport is measured on the client
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    handler();
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ViewContent — fire for desktop only (mobile view fires its own in StartpageJyotirling)
  useEffect(() => {
    if (isMobile !== false) return;
    const fbq = (window as any).fbq;
    if (typeof fbq === "function") {
      try {
        fbq("track", "ViewContent", {
          content_ids: ["12-jyotirlinga"],
          content_name: "12 Jyotirlinga Subscription",
          content_category: "12 Jyotirlinga Subscription",
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
        item_id: "12-jyotirlinga",
        item_name: "12 Jyotirlinga Subscription",
        item_category: "12 Jyotirlinga Subscription",
      }],
    });
  }, [isMobile]);

  const { data: jyotirlingas = [], isLoading: loading, isError } = useJyotirlingaListQuery();
  const error = isError ? "Failed to load Jyotirlinga data." : null;

  // Advance past dates → next year, sort nearest-first
  const processedJyotirlingas = useMemo(
    () => advanceAndSortJyotirlingas(jyotirlingas),
    [jyotirlingas]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState(1);
  const [lookupModalOpen, setLookupModalOpen] = useState(false);

  useEffect(() => {
    captureVvUtm();
  }, []);

  // Auto-scroll to the packages section on landing so the user can pick a plan immediately
  const didAutoScrollRef = useRef(false);
  useEffect(() => {
    if (isMobile !== false) return;  // mobile view handles its own scroll
    if (loading) return;             // wait until data (and the section) can render
    if (didAutoScrollRef.current) return;
    didAutoScrollRef.current = true;

    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById("plans");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (attempts++ < 20) {
        setTimeout(tryScroll, 150); // section is lazy-loaded; retry until mounted
      }
    };
    const t = setTimeout(tryScroll, 300);
    return () => clearTimeout(t);
  }, [isMobile, loading]);

  // Auto-select the Jyotirlinga whose next puja is coming up (already nearest-first after processing)
  const autoSelectedId = useMemo(() => {
    return processedJyotirlingas[0]?._id ?? null;
  }, [processedJyotirlingas]);

  useEffect(() => {
    if (autoSelectedId && selectedIds.length === 0) {
      setSelectedIds([autoSelectedId]);
    }
  }, [autoSelectedId]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === processedJyotirlingas.length) {
      setSelectedIds([]);
    } else {
      const allIds = processedJyotirlingas.map((j) => j._id);
      setSelectedIds(allIds);
    }
  };

  const handleAutoSelect = (name: string) => {
    const jyotirlinga = processedJyotirlingas.find((j) => j.nameEnglish === name);
    if (jyotirlinga) {
      setSelectedIds([jyotirlinga._id]);
      setTimeout(() => {
        document.getElementById(`jyotirlinga-${jyotirlinga._id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  };

  const selectedJyotirlingas = processedJyotirlingas.filter(j => selectedIds.includes(j._id));

  // Wait for the client viewport measurement before choosing desktop vs mobile view
  if (isMobile === null) {
    return null;
  }

  // Show mobile view on small screens
  if (isMobile) {
    return <StartpageJyotirling jyotirlingas={processedJyotirlingas} />;
  }

  return (
    /* `isolate` is load-bearing, not decoration.

       The two layers below sit at -z-20 and -z-10 so they stay behind the
       page's content. Without a stacking context here they resolve against the
       ROOT one — and globals.css paints the site-wide background artwork on
       `body::before` at z-index -1, which is opaque (#fef8f3 plus a cover
       image). Negative layers paint in order, so -20 and -10 both went under
       -1 and the artwork covered the video and the black wash completely: the
       page rendered cream on desktop instead of black.

       isolation: isolate makes this div its own stacking context, so the video
       and the wash are trapped inside it and the whole context paints above
       body::before. This page is the only one in the app using negative
       z-index, which is why it was the only one that broke. */
    <div className="relative isolate min-h-screen overflow-x-hidden">
      {/* 🎥 Global Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover -z-20 bg-black"
      >
        <source src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Mahadev%20(1).mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-black/75 -z-10" />

      {/* Navbar — outside blur wrapper so it's never affected by activeStep === 4 blur */}
      <div className="relative z-50">
        <Navbar />
      </div>

      {/* Scrollable Content (blurred when success overlay is active) */}
      <div className="relative z-10 transition-all duration-500" style={{ filter: activeStep === 4 ? "blur(10px) brightness(0.5)" : "none" }}>

        <div style={{ height: "0px" }} /> {/* spacer so content doesn't go under navbar */}
        <HeroSection />
        <CalendarSection
          jyotirlingas={processedJyotirlingas}
          loading={loading}
          error={error}
          selectedIds={selectedIds}
          toggleSelection={toggleSelection}
          handleSelectAll={handleSelectAll}
          onStepChange={setActiveStep}
          activeStep={activeStep}
        />
        <PlanCards selectedJyotirlinga={selectedJyotirlingas} allJyotirlinga={processedJyotirlingas} onStepChange={setActiveStep} />
        <WhyThisWorks />
        <HowItWorks />
        <RashiQuiz onSelectJyotirlinga={handleAutoSelect} />
        <TestimonialsSection />
        <div id="faq">
          <FAQSection />
        </div>
        <Footer variant="dark" />
      </div>

      {/* 🎊 Success Overlay 🎊 */}
      <AnimatePresence>
        {activeStep === 4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#1a120b] border border-[#c89b3c] rounded-3xl max-w-2xl w-full text-center shadow-[0_0_60px_rgba(200,155,60,0.4)] relative overflow-hidden"
            >
              {/* Top gold shimmer line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#f5d78e] to-transparent" />

              {/* Scrollable inner content */}
              <div className="p-8 md:p-10 max-h-[90vh] overflow-y-auto">

                {/* Check icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, delay: 0.2 }}
                  className="w-20 h-20 bg-gradient-to-br from-[#f5d78e] to-[#c89b3c] rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg"
                >
                  <CheckCircleOutlineIcon sx={{ fontSize: 48, color: "black" }} />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-4xl font-display text-[#f5d78e] mb-2"
                >
                  🕉 Har Har Mahadev! 🕉
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-[#d6c2a3] text-base mb-1 leading-relaxed italic"
                >
                  "Om Namah Shivaya — The Lord has accepted your devotion."
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-[#cfc2b0] text-sm mb-6 leading-relaxed"
                >
                  Your sacred subscription to {selectedJyotirlingas.length === 1 ? "this divine Jyotirlinga" : `these ${selectedJyotirlingas.length} sacred Jyotirlingas`} has been confirmed.<br />
                  May Bholenath shower His infinite blessings upon you and your family. 🙏
                </motion.p>

                {/* Divider with trishul */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#c89b3c]/50" />
                  <span className="text-[#f5d78e] text-lg">𑁍</span>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#c89b3c]/50" />
                </div>

                {/* Booked Jyotirlinga Cards */}
                <p className="text-[#f5d78e] text-xs font-bold tracking-widest uppercase mb-4">
                  Your Sacred Bookings
                </p>

                <div className={`grid gap-3 mb-6 ${selectedJyotirlingas.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {selectedJyotirlingas.map((j, i) => (
                    <motion.div
                      key={j._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 + i * 0.1 }}
                      className="relative rounded-2xl overflow-hidden border border-[#c89b3c]/40 bg-[#120c06] group"
                    >
                      {/* Temple image */}
                      <div className="relative h-28 overflow-hidden">
                        <img
                          src={j.image}
                          alt={j.nameEnglish}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#120c06] via-[#120c06]/30 to-transparent" />
                      </div>

                      {/* Card info */}
                      <div className="px-3 pb-3 pt-1 text-left">
                        <p className="text-[#f5d78e] font-bold text-sm leading-tight">{j.nameEnglish}</p>
                        <p className="text-[#c89b3c] text-xs">{j.nameHindi}</p>
                        <p className="text-[#a09070] text-xs mt-1 truncate">📍 {j.location}</p>
                        <p className="text-[#8a7255] text-xs mt-1 truncate">🌙 {j.month}</p>
                      </div>

                      {/* Gold tick badge */}
                      <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-br from-[#f5d78e] to-[#c89b3c] rounded-full flex items-center justify-center shadow">
                        <CheckCircleOutlineIcon sx={{ fontSize: 14, color: "#000" }} />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#c89b3c]/50" />
                  <span className="text-[#f5d78e] text-lg">𑁍</span>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#c89b3c]/50" />
                </div>

                {/* Blessing quote */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-[#c89b3c] text-sm italic mb-6 leading-relaxed"
                >
                  "Mrityunjaya Mahadev, trano mrityoh muksheeya mamritat —<br />
                  May the Lord of Immortality free you from all fears."
                </motion.p>

                {/* CTA Button */}
                <button
                  onClick={() => {
                    setActiveStep(1);
                    setSelectedIds([]);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="w-full py-4 rounded-xl font-bold tracking-widest transition-all hover:scale-[1.02] relative group overflow-hidden shadow-[0_0_20px_rgba(200,155,60,0.4)]"
                  style={{
                    background: "linear-gradient(135deg, #f5d78e, #c89b3c)",
                    color: "#000",
                  }}
                >
                  <span className="relative z-10">🕉 CONTINUE DIVINE JOURNEY</span>
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                </button>

                <p className="mt-5 text-[#cfc2b0]/40 text-xs">
                  A confirmation has been saved to your account. Jai Bholenath! 🙏
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BookingLookupModal
        open={lookupModalOpen}
        onClose={() => setLookupModalOpen(false)}
      />

    </div>
  );
};


export default Index;
