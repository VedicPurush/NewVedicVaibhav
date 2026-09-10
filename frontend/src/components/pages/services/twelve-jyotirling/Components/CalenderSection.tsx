"use client";

import React, { useState, useRef, useEffect } from "react";
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import { motion, AnimatePresence } from "framer-motion";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import MobilePlansModal from "./MobilePlansModal";
import ChadhavaInfoModal from "./ChadhavaInfoModal";
import JyotirlingaInfoModal from "./JyotirlingaInfoModal";
import BookingSteps from "./BookingSteps";
import { IJyotirlinga } from "../index";

interface CalendarSectionProps {
  jyotirlingas: IJyotirlinga[];
  loading: boolean;
  error: string | null;
  selectedIds: string[];
  toggleSelection: (id: string) => void;
  handleSelectAll: () => void;
  onStepChange: (step: number) => void;
  activeStep: number;
}

const CalendarSection: React.FC<CalendarSectionProps> = ({
  jyotirlingas,
  loading,
  error,
  selectedIds,
  toggleSelection,
  handleSelectAll,
  onStepChange,
  activeStep,
}) => {
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isStuck, setIsStuck] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setPastHero(window.scrollY > window.innerHeight * 0.9);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const sentinel = sentinelRef.current;
      if (!sentinel) return;
      setIsStuck(sentinel.getBoundingClientRect().top < 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run on mount to set correct initial state
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile Modal State
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoJyotirlinga, setInfoJyotirlinga] = useState<IJyotirlinga | null>(null);

  // Wrapper for handleSelectAll to show toast
  const onSelectAll = () => {
    handleSelectAll();
    if (selectedIds.length === jyotirlingas.length) {
      setToastMessage("All selections cleared");
    } else {
      setToastMessage("All 12 Jyotirlinga selected");
    }
    setToastOpen(true);
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getMonthBadgeText = (month: string, startDate?: string, endDate?: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Extract Hindu month name from backend string (e.g. "Chaitra (चैत्र) • Mar–Apr" → "Chaitra (चैत्र)")
    const hinduPart = month.split("•")[0].trim();

    // Derive Gregorian range from actual dates
    let gregorianPart = "";
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startMon = MONTH_NAMES[start.getMonth()];
      const endMon = MONTH_NAMES[end.getMonth()];
      gregorianPart = startMon === endMon ? startMon : `${startMon}-${endMon}`;
    }

    return gregorianPart
      ? `${hinduPart} • ${gregorianPart}`
      : hinduPart;
  };

  const isNextMonth = (jyotirlinga: IJyotirlinga, index: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = jyotirlinga.endDate || jyotirlinga.pujaDate;
    if (!endDate) return false;
    const end = new Date(endDate);
    // Show on the second item in the list (the one after the initially selected/upcoming one)
    return index === 1 && end >= today;
  };

  const handleProceed = () => {
    if (window.innerWidth > 768) {
      // Desktop: Scroll to Plans (step 2 will be tracked by PlanCards)
      onStepChange(2);
      const plansSection = document.getElementById("plans");
      if (plansSection) {
        plansSection.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Mobile: Scroll to Sankalp plan
      onStepChange(2);
      const sankalpCard = document.getElementById("plan-sankalp");
      const target = sankalpCard ?? document.getElementById("plans");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <CircularProgress style={{ color: "#c89b3c" }} />
      </div>
    );
  }

  if (error) {
    return (
      <Container className="py-24">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <section id="calendar" className="pt-6 pb-4 relative">

      {/* Heading */}
      <Container maxWidth="xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
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
            The Sacred 12-Month Journey
          </h2>

          <p className="text-lg md:text-xl text-[#d6c2a3] italic">
            पवित्र 12 महीने की यात्रा — Fixed calendar, one Jyotirlinga per
            month
          </p>

          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#c89b3c] to-transparent mx-auto mt-6"></div>
        </motion.div>
      </Container>

      {/* Sentinel — zero-height marker; when it leaves the viewport the bar goes fixed */}
      <div ref={sentinelRef} />

      {/* Spacer so content doesn't jump when bar becomes fixed */}
      {isStuck && <div style={{ height: stepsRef.current?.offsetHeight ?? 72 }} />}

      {/* Booking Steps — fixed to top the moment sentinel scrolls off screen */}
      <div
        ref={stepsRef}
        className="w-full z-50"
        style={isStuck ? {
          position: "fixed",
          top: 55,
          left: 0,
          width: "100%",
          backdropFilter: "blur(12px)",
          background: "rgba(12,8,4,0.88)",
          borderBottom: "1px solid rgba(200,155,60,0.2)",
        } : {
          // backdropFilter: "blur(12px)",
          // background: "rgba(12,8,4,0.82)",
          // borderBottom: "1px solid rgba(200,155,60,0.2)",
        }}
      >
        <BookingSteps activeStep={activeStep} />
      </div>

      <Container maxWidth="xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 mt-6"
        >
          {/* Action Bar */}
          <div className="flex items-center justify-center gap-4 mt-8">
            {selectedIds.length === jyotirlingas.length ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSelectAll}
                className="px-6 py-2 rounded-full border border-[#c89b3c] text-[#f5d78e] hover:bg-[#c89b3c] hover:text-black transition-colors duration-300 font-medium"
              >
                Unselect All
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onSelectAll}
                animate={{
                  scale: [1, 1.04, 1, 1.04, 1],
                  boxShadow: [
                    "0 0 0px 0px rgba(200, 155, 60, 0)",
                    "0 0 14px 5px rgba(200, 155, 60, 0.85)",
                    "0 0 24px 10px rgba(245, 215, 142, 0.6)",
                    "0 0 14px 5px rgba(200, 155, 60, 0.85)",
                    "0 0 0px 0px rgba(200, 155, 60, 0)",
                  ],
                  textShadow: [
                    "0 0 0px rgba(245, 215, 142, 0)",
                    "0 0 8px rgba(245, 215, 142, 0.9)",
                    "0 0 16px rgba(245, 215, 142, 1)",
                    "0 0 8px rgba(245, 215, 142, 0.9)",
                    "0 0 0px rgba(245, 215, 142, 0)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="px-6 py-2 rounded-full border border-[#c89b3c] text-[#f5d78e] hover:bg-[#c89b3c] hover:text-black transition-colors duration-300 font-medium"
              >
                Select All Jyotirlinga
              </motion.button>
            )}

            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <IconButton
                onClick={() => setInfoModalOpen(true)}
                sx={{
                  color: "#f5d78e",
                  border: "1px solid rgba(200, 155, 60, 0.3)",
                  "&:hover": {
                    bgcolor: "rgba(200, 155, 60, 0.1)",
                    borderColor: "#c89b3c"
                  }
                }}
              >
                <InfoOutlinedIcon />
              </IconButton>
            </motion.div>
          </div>
        </motion.div >

        {/* Calendar Grid */}
        < div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-20" >
          {
            [...jyotirlingas]
              .sort((a, b) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const aEnd = a.endDate ? new Date(a.endDate) : (a.pujaDate ? new Date(a.pujaDate) : null);
                const bEnd = b.endDate ? new Date(b.endDate) : (b.pujaDate ? new Date(b.pujaDate) : null);
                const aStart = a.startDate ? new Date(a.startDate) : (a.pujaDate ? new Date(a.pujaDate) : null);
                const bStart = b.startDate ? new Date(b.startDate) : (b.pujaDate ? new Date(b.pujaDate) : null);

                // Passed pujas go to bottom (next year), upcoming/ongoing stay on top
                const aPassed = aEnd ? aEnd < today : false;
                const bPassed = bEnd ? bEnd < today : false;

                if (aPassed !== bPassed) return aPassed ? 1 : -1;

                // Within same group, sort by startDate ascending
                if (aStart && bStart) return aStart.getTime() - bStart.getTime();
                if (aStart) return -1;
                if (bStart) return 1;
                return 0;
              })
              .map((data, i) => (
              <motion.div
                key={data._id}
                id={`jyotirlinga-${data._id}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                animate={{
                  scale: isSelected(data._id) ? 1.02 : 1,
                  borderColor: isSelected(data._id) ? "#FFD700" : "rgba(200,155,60,0.4)",
                }}
                onClick={() => toggleSelection(data._id)}
                className="relative rounded-xl p-6 bg-card/5 backdrop-blur-sm hover:shadow-gold transition-all duration-300 hover:shadow-[0_0_25px_rgba(200,155,60,0.25)] group overflow-hidden cursor-pointer"
                style={{
                  borderWidth: "1px",
                  borderStyle: "solid",
                }}
              >
                {/* Info Icon — Top Right */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={e => { e.stopPropagation(); setInfoJyotirlinga(data); }}
                  className="absolute top-0 right-0 z-40 flex items-center gap-1 px-2.5 py-1 rounded-bl-xl"
                  style={{
                    background: "rgba(200,155,60,0.12)",
                    border: "1px solid rgba(200,155,60,0.3)",
                    borderTop: "none",
                    borderRight: "none",
                  }}
                  title="More Info"
                >
                  <InfoOutlinedIcon sx={{ fontSize: 15, color: "#c89b3c" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "#c89b3c" }}>Info</span>
                </motion.button>

                {/* Selection Button Indicator - Corner Tab Style */}
                <div className="absolute bottom-0 right-0 z-40">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={!isSelected(data._id) ? {
                      borderTopColor: ["#000", "#FFD700", "#000"],
                      borderLeftColor: ["#000", "#FFD700", "#000"],
                      textShadow: [
                        "0 0 0px rgba(247,203,102,0)",
                        "0 0 10px rgba(247,203,102,0.9), 0 0 20px rgba(200,155,60,0.5)",
                        "0 0 0px rgba(247,203,102,0)",
                      ],
                    } : {}}
                    transition={!isSelected(data._id) ? {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.2,
                    } : {}}
                    className="px-2 pr-4  py-1.5 rounded-tl-3xl flex items-center gap-1 font-bold text-sm"
                    style={{
                      background: isSelected(data._id)
                        ? "linear-gradient(135deg, #f5d78e, #c89b3c)"
                        : "#0c0800",
                      color: isSelected(data._id) ? "#000" : "#f5d78e",
                      borderTop: isSelected(data._id) ? "none" : "2px solid #000",
                      borderLeft: isSelected(data._id) ? "none" : "2px solid #000",
                      boxShadow: isSelected(data._id) ? "0 -2px 15px rgba(200, 155, 60, 0.3)" : "none",
                    }}
                  >
                    {isSelected(data._id) ? (
                      <>
                        <CheckIcon sx={{ fontSize: 20 }} />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <AddIcon sx={{ fontSize: 20 }} />
                        <span>Tap to add</span>
                      </>
                    )}
                  </motion.div>
                </div>

                {/* Check Overlay */}
                <AnimatePresence>
                  {isSelected(data._id) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-30 pointer-events-none"
                      style={{
                        backgroundColor: "rgba(200, 155, 60, 0.08)",
                      }}
                    >
                      {/* Suble side glow when selected */}
                      <div className="absolute inset-y-0 left-0 w-1 bg-[#c89b3c]" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Month Badge */}
                <div
                  className="absolute top-0 left-0 text-xs font-bold px-3 py-1 rounded-br-xl z-20"
                  style={{
                    background: "linear-gradient(135deg, #f5d78e, #c89b3c)",
                    color: "#000",
                  }}
                >
                  {getMonthBadgeText(data.month, data.startDate, data.endDate)}
                </div>

                {/* Next Month Badge */}
                {isNextMonth(data, i) && (
                  <div
                    className="absolute bottom-0 left-0 text-[10px] font-bold px-2 py-1 rounded-tr-xl z-50"
                    style={{
                      background: "linear-gradient(135deg, #4ade80, #16a34a)",
                      color: "#fff",
                    }}
                  >
                    Next Month
                  </div>
                )}

                <div className="flex items-start w-full pr-32">
                  <div className="flex-1 pr-2 pt-2">
                    {/* Titles */}
                    <h3 className="text-[18px] font-display text-[#f5d78e] leading-tight pt-2">
                      {data.nameEnglish}
                    </h3>

                    <p className="text-[18px] text-[#e7b56d]">{data.nameHindi}</p>

                    {/* Details */}
                    <div className="mt-3 space-y-1">
                      <div className="text-[14px] text-[#f5d78e] flex items-center">
                        <div className="inline-block mr-1" style={{ transform: "translateY(2px)" }}>
                          <svg width="20px" height="20px" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" className="iconify iconify--twemoji" preserveAspectRatio="xMidYMid meet"><path fill="#FF8044" d="M25 2.875L18 2v5.25l7-.875l-2.8-1.75z"></path><path fill="#C7521E" d="M0 36h36l-2-2H2z"></path><path fill="#662113" d="M17.5 3c0-2 1-2 1 0c0 5 1 9 1 9h-3s1-4 1-9z"></path><path fill="#C7521E" d="M28 29v-2l-4-1.938V21l-2-2h-.123s.732-3.967-1.377-5.449V12l-1-1h-3l-1 1v1.551C13.391 15.033 14.123 19 14.123 19H14l-2 2v4.062L8 27v2l-4 2v4l28 .037V31l-4-2z"></path><path fill="#662113" d="M19.846 19h-3.692s-.615-5 .615-5h2.462c1.231 0 .615 5 .615 5z"></path><path fill="#C7521E" d="M11.784 23.477v-.521l-.292-.292h-.063a12.441 12.441 0 0 1-.229-2.337c0-.584-.292-.584-.292 0c0 1.023-.143 1.902-.229 2.337h-.063l-.292.292v.521c-.465.474-.293 1.523-.293 1.523h2.045s.172-1.049-.292-1.523zm13.906 0v-.521l-.292-.292h-.063a12.441 12.441 0 0 1-.229-2.337c0-.584-.292-.584-.292 0c0 1.023-.143 1.902-.229 2.337h-.063l-.292.292v.521c-.465.474-.292 1.523-.292 1.523h2.045c-.001 0 .171-1.049-.293-1.523zm4 4v-.521l-.292-.292h-.063a12.441 12.441 0 0 1-.229-2.337c0-.584-.292-.584-.292 0c0 1.023-.143 1.902-.229 2.337h-.063l-.292.292v.521c-.465.474-.292 1.523-.292 1.523h2.045c-.001 0 .171-1.049-.293-1.523zm4 5v-.521l-.292-.292h-.063a12.441 12.441 0 0 1-.229-2.337c0-.584-.292-.584-.292 0c0 1.023-.143 1.902-.229 2.337h-.063l-.292.292v.521c-.465.474-.292 1.523-.292 1.523h2.045c-.001 0 .171-1.049-.293-1.523zm-25.906-5v-.521l-.292-.292h-.063a12.461 12.461 0 0 1-.229-2.337c0-.584-.292-.584-.292 0c0 1.023-.143 1.902-.229 2.337h-.064l-.292.292v.521C5.859 27.951 6.031 29 6.031 29h2.045s.172-1.049-.292-1.523zm-4 5v-.521l-.292-.292h-.063a12.461 12.461 0 0 1-.229-2.337c0-.584-.292-.584-.292 0c0 1.023-.143 1.902-.229 2.337h-.064l-.292.292v.521C1.859 32.951 2.031 34 2.031 34h2.045s.172-1.049-.292-1.523z"></path><path fill="#FF8044" d="M15.5 12l1-1h3l1 1zM12 21l2-2h8l2 2zm-4 6l2-2h16l2 2zm-4 4l2-2h24l2 2zm-4 5l2-2h32l2 2z"></path><path fill="#662113" d="M21 25h-6s0-4 1.5-4h3c1.5 0 1.5 4 1.5 4zm1 4h-8s0-2 2-2h4c2 0 2 2 2 2z"></path><path fill="#292F33" d="M24 34H12s0-3 3-3h6c3 0 3 3 3 3z"></path><path fill="#FFA06C" d="M21 27h-6a1 1 0 0 1 0-2h6a1 1 0 0 1 0 2zm1 4h-8a1 1 0 0 1 0-2h8a1 1 0 0 1 0 2zm2 5H12a1 1 0 0 1 0-2h12a1 1 0 0 1 0 2z"></path><path fill="#FF8044" d="M21 31h1v3h-1zm-7 0h1v3h-1z"></path></svg>
                        </div>
                         {data.location}
                      </div>

                      {data.pujaDate && (
                        <div className="text-[12px] mt-1.5 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="20" height="20" style={{ flexShrink: 0 }}><path fill="#ff8044" d="M0 464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V192H0v272zm320-196c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zm0 128c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zM192 268c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zm0 128c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zM64 268c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H76c-6.6 0-12-5.4-12-12v-40zm0 128c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H76c-6.6 0-12-5.4-12-12v-40zM400 64h-48V16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v48H160V16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v48H48C21.5 64 0 85.5 0 112v48h448v-48c0-26.5-21.5-48-48-48z"/></svg>
                          <p className="text-[12px] text-[#f5d78e]" >Puja Date :</p>
                          <span className="font-semibold text-[#f5d78e]">
                            {new Date(data.pujaDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image (Top Right Absolute) */}
                  <div className="absolute top-12 right-0 h-28 w-40 overflow-hidden rounded-md">
                    <img
                      src={data.image}
                      alt={data.nameEnglish}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Benefits Chips */}
                <div className="flex flex-wrap gap-2 my-3 pr-20">
                  {data.benefits.map((b: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-[14px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(200,155,60,0.1)",
                        color: "#f5d78e",
                        border: "1px solid rgba(200,155,60,0.3)",
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))
          }
        </div >

        {/* Floating Counter
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="fixed top-24 right-8 z-50 bg-[#1a1a1a] border border-[#c89b3c] rounded-lg shadow-lg px-6 py-3 flex items-center gap-3 backdrop-blur-md"
            >
              <div className="text-[#f5d78e] font-medium">
                Selected: <span className="text-white text-lg font-bold ml-1">{selectedIds.length}</span> / {jyotirlingas.length}
              </div>
            </motion.div>
          )}
        </AnimatePresence> */}

        {/* Proceed Button */}
        <AnimatePresence>
          {pastHero && selectedIds.length > 0 && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-2 left-0 w-full z-40 flex justify-center pointer-events-none"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleProceed}
                className="w-[90%] md:w-auto px-8 md:py-4 py-2 rounded-full text-lg font-semibold shadow-gold relative overflow-hidden group pointer-events-auto mx-auto block"
                style={{
                  background: "linear-gradient(135deg, #f5d78e, #c89b3c)",
                  color: "#000",
                  boxShadow: "0 0 20px rgba(200,155,60,0.5)"
                }}
              >
                <span className="relative z-10">Proceed to Blessings ({selectedIds.length} / {jyotirlingas.length})</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast */}
        <Snackbar
          open={toastOpen}
          autoHideDuration={3000}
          onClose={() => setToastOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled" onClose={() => setToastOpen(false)} sx={{ bgcolor: '#4caf50', color: 'white' }}>
            {toastMessage}
          </Alert>
        </Snackbar>

        <MobilePlansModal
          open={mobileModalOpen}
          onClose={() => {
            setMobileModalOpen(false);
            onStepChange(1);
          }}
          selectedJyotirlinga={jyotirlingas.filter(j => selectedIds.includes(j._id))}
          allJyotirlinga={jyotirlingas}
          onStepChange={onStepChange}
        />
        <ChadhavaInfoModal
          open={infoModalOpen}
          onClose={() => setInfoModalOpen(false)}
        />
        <JyotirlingaInfoModal
          jyotirlinga={infoJyotirlinga}
          onClose={() => setInfoJyotirlinga(null)}
        />
      </Container>
    </section>
  );
};

export default CalendarSection;