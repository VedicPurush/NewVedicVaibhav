"use client";

import React, { useState } from "react";
import Container from '@mui/material/Container';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { motion, AnimatePresence } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import { rashiMapping } from "../data/plans";

interface RashiQuizProps {
  onSelectJyotirlinga?: (name: string) => void;
}

const RashiQuiz: React.FC<RashiQuizProps> = ({ onSelectJyotirlinga }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const match = rashiMapping.find((r) => r.rashi === selected);

  const handleClose = () => setSelected(null);

  return (
    <section
      id="rashi"
      className="py-10 relative overflow-hidden"
    //   style={{
    //     background:
    //       "radial-gradient(circle at top, #2a1a0f 0%, #1a120b 45%, #0f0a07 100%)",
    //   }}
    >
      <Container maxWidth="md">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
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
            Find Your Jyotirlinga
          </h2>

          <p className="text-lg text-[#d6c2a3] italic">
            Select your Rashi to see your recommended Jyotirlinga
          </p>

          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#c89b3c] to-transparent mx-auto mt-6"></div>
        </motion.div>

        {/* Rashi Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-10">
          {rashiMapping.map((r) => {
            const isActive = selected === r.rashi;

            return (
              <button
                key={r.rashi}
                onClick={() => setSelected(r.rashi)}
                className="rounded-xl p-4 text-center transition-all duration-300 backdrop-blur-md"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(40,25,15,0.6), rgba(20,12,8,0.6))",
                  border: isActive
                    ? "1px solid #c89b3c"
                    : "1px solid rgba(200,155,60,0.3)",
                  boxShadow: isActive
                    ? "0 0 20px rgba(200,155,60,0.4)"
                    : "none",
                }}
              >
                <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center overflow-hidden rounded-full ">
                  {r.image ? (
                    <img loading="lazy" 
                      src={r.image}
                      alt={r.rashi}
                      className="w-full h-full object-cover"
                     />
                  ) : (
                    <span className="text-2xl">{r.element}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-[#f5d78e] block">
                  {r.rashi}
                </span>
                <span className="text-[11px] text-[#9f8a6a] block">
                  {r.rashiHindi}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile Modal */}
        {isMobile && (
          <Modal
            open={!!match}
            onClose={handleClose}
            disableScrollLock
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
            }}
          >
            <Box
              sx={{
                width: "100%",
                maxWidth: 400,
                position: "relative",
                background: "linear-gradient(145deg, #1a120b, #0f0a07)",
                border: "1px solid #c89b3c",
                borderRadius: "20px",
                p: 4,
                outline: "none",
                boxShadow: "0 0 30px rgba(200,155,60,0.2)",
              }}
            >
              <IconButton
                onClick={handleClose}
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  color: "#c89b3c",
                  "&:hover": { color: "#f5d78e" },
                }}
              >
                <CloseIcon />
              </IconButton>

              <div className="text-center">
                <p className="text-sm text-[#cfc2b0] mb-2">
                  Your Recommended Jyotirlinga
                </p>

                <h3
                  className="text-2xl font-semibold mb-3"
                  style={{
                    background: "linear-gradient(90deg, #f5d78e, #c89b3c)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {match?.jyotirlinga}
                </h3>

                <p className="text-sm text-[#d6c2a3] mb-8">
                  Based on your Rashi:{" "}
                  <span className="text-[#f5d78e] font-medium">
                    {match?.rashi}
                  </span>{" "}
                  ({match?.rashiHindi})
                </p>

                <div className="flex justify-center mb-8">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onSelectJyotirlinga?.(match?.jyotirlinga || "");
                      handleClose();
                    }}
                    className="px-8 py-3 rounded-full font-semibold transition-all shadow-gold relative group overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #f5d78e, #c89b3c)",
                      color: "#000",
                    }}
                  >
                    <span className="relative z-10 text-sm">
                      Invoke {match?.jyotirlinga}’s Grace
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                  </motion.button>
                </div>

                <div className="border-t border-[rgba(200,155,60,0.3)] pt-4">
                  <p className="text-[10px] text-[#9f8a6a] italic leading-relaxed">
                    ⚠️ Lord Shiva is universal and blesses all equally regardless of Rashi.
                  </p>
                </div>
              </div>
            </Box>
          </Modal>
        )}

        {/* Result Box (Desktop) */}
        {!isMobile && (
          <AnimatePresence mode="wait">
            {match && (
              <motion.div
                key={match.rashi}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl p-8 text-center backdrop-blur-md"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(40,25,15,0.7), rgba(20,12,8,0.7))",
                  border: "1px solid rgba(200,155,60,0.5)",
                  boxShadow: "0 0 30px rgba(200,155,60,0.15)",
                }}
              >
                <p className="text-sm text-[#cfc2b0] mb-2">
                  Your Recommended Jyotirlinga
                </p>

                <h3
                  className="text-2xl font-semibold mb-3"
                  style={{
                    background:
                      "linear-gradient(90deg, #f5d78e, #c89b3c)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {match.jyotirlinga}
                </h3>

                <p className="text-sm text-[#d6c2a3] mb-8">
                  Based on your Rashi:{" "}
                  <span className="text-[#f5d78e] font-medium">
                    {match.rashi}
                  </span>{" "}
                  ({match.rashiHindi})
                </p>

                <div className="flex justify-center mb-8">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelectJyotirlinga?.(match.jyotirlinga)}
                    className="px-8 py-3 rounded-full font-semibold transition-all shadow-gold relative group overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #f5d78e, #c89b3c)",
                      color: "#000",
                    }}
                  >
                    <span className="relative z-10 text-sm md:text-base">
                      Invoke {match.jyotirlinga}’s Grace
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                  </motion.button>
                </div>

                <div className="border-t border-[rgba(200,155,60,0.3)] pt-4">
                  <p className="text-xs text-[#9f8a6a] italic">
                    ⚠️ Disclaimer: This recommendation is symbolic for personalization only.
                    Lord Shiva is universal and blesses all equally regardless of Rashi.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </Container>
    </section>
  );
};

export default RashiQuiz;
