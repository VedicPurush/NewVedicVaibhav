"use client";

import React, { useState } from "react";
import Container from '@mui/material/Container';
import { motion, AnimatePresence } from "framer-motion";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { faqItems } from "../data/plans";

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      className="py-24 relative overflow-hidden"
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
            Frequently Asked Questions
          </h2>

          <p className="text-lg text-[#d6c2a3] italic">
            अक्सर पूछे जाने वाले प्रश्न
          </p>

          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#c89b3c] to-transparent mx-auto mt-6"></div>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqItems.map((item, i) => {
            const isOpen = openIndex === i;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl backdrop-blur-md overflow-hidden"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(40,25,15,0.6), rgba(20,12,8,0.6))",
                  border: "1px solid rgba(200,155,60,0.4)",
                }}
              >
                {/* Question */}
                <button
                  onClick={() => toggleItem(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-all"
                >
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: isOpen ? "#f5d78e" : "#d6c2a3",
                    }}
                  >
                    {item.q}
                  </span>

                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ExpandMoreIcon
                      sx={{
                        color: "#f5d78e",
                        fontSize: 22,
                      }}
                    />
                  </motion.div>
                </button>

                {/* Answer */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="px-5 pb-4"
                    >
                      <p className="text-sm text-[#cfc2b0] leading-relaxed">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

export default FAQSection;
