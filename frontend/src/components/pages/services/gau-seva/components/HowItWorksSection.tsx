"use client";

import { motion } from "framer-motion";
import { HOW_IT_WORKS_STEPS } from "../data/gauSevaData";
import "../GauSeva.css";

const HowItWorksSection = () => {
  return (
    <section className="px-4 py-10" style={{ background: "#fff8f0" }}>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <h2 className="gs-section-title">How It Works</h2>
          <p className="text-sm text-gray-500 mt-2">Simple, transparent, and spiritually fulfilling</p>
        </motion.div>

        <div className="relative">
          {/* Connecting line on desktop */}
          <div className="hidden sm:block absolute top-8 left-[calc(16.6%+28px)] right-[calc(16.6%+28px)] h-0.5 bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200 z-0" />

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-0 sm:justify-between relative z-10">
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                className="flex sm:flex-col items-center sm:items-center gap-4 sm:gap-2 sm:flex-1 sm:text-center"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div
                  className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center shadow-md overflow-hidden bg-white"
                  style={{ border: "1px solid rgba(255, 107, 53, 0.3)" }}
                >
                  <img loading="lazy"  src={step.image} alt={step.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}  />
                </div>
                <div className="sm:px-2">
                  <div className="flex items-center gap-2 sm:justify-center mb-1">
                    <span
                      className="text-xs font-bold text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0"
                      style={{ background: "#ff6b35" }}
                    >
                      {step.step}
                    </span>
                    <p className="font-bold text-sm text-gray-800">{step.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 sm:text-center leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
