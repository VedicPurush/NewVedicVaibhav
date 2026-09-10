"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const faqItems = [
  {
    q: "How does the Virtual Yatra work?",
    a: "Our expert pandits perform sacred rituals at each Dham on your behalf. You will receive HD video recordings of the ceremonies and sacred Prasad at your doorstep.",
  },
  {
    q: "When will I receive the Prasad?",
    a: "Prasad is dispatched after the completion of all rituals and typically reaches your home within 7-10 working days after the Yatra completion.",
  },
  {
    q: "Can I include my family members?",
    a: "Yes, you can add up to 5 family members (depending on the package) during the checkout process to include their names and gotras in the sacred Sankalp.",
  },
  {
    q: "Are the videos shared privately?",
    a: "Yes, your personalized puja videos are shared privately with you via WhatsApp or Email as per your preference.",
  },
  {
    q: "Which temples are covered in the 4 Dham Yatra?",
    a: "The Yatra covers all four sacred shrines of Uttarakhand: Kedarnath, Badrinath, Gangotri, and Yamunotri.",
  },
];

const YatraFAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="faq-section px-4 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-2"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          Frequently Asked <span className="text-[#FFC107]">Questions</span>
        </h2>
        <p className="text-gray-400 text-sm italic">अक्सर पूछे जाने वाले प्रश्न</p>
        <div className="w-20 h-1 bg-gradient-to-r from-transparent via-[#FFC107] to-transparent mx-auto mt-4" />
      </motion.div>

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
              className="rounded-2xl overflow-hidden border border-[#FFC107]/20 bg-black/40 backdrop-blur-sm"
              style={{
                boxShadow: isOpen ? "0 4px 20px rgba(255, 193, 7, 0.1)" : "none",
              }}
            >
              <button
                onClick={() => toggleItem(i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left transition-all hover:bg-white/5"
              >
                <span
                  className={`text-base font-semibold transition-colors ${
                    isOpen ? "text-[#FFC107]" : "text-gray-200"
                  }`}
                >
                  {item.q}
                </span>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ExpandMoreIcon className="text-[#FFC107]" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-5">
                      <div className="w-full h-px bg-[#FFC107]/10 mb-4" />
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default YatraFAQ;
