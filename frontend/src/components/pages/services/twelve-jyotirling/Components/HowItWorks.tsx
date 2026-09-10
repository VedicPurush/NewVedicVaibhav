"use client";

import React from "react";
import Container from '@mui/material/Container';
import { motion } from "framer-motion";

interface Step {
  title: string;
  titleHi: string;
  desc: string;
}

const steps: Step[] = [
  {
    title: "Choose Your Plan",
    titleHi: "अपना प्लान चुनें",
    desc: "Select from Bhakti, Sankalp, or Ananta plan. Add family members if you wish.",
  },
  {
    title: "We Perform Sankalp",
    titleHi: "हम संकल्प करते हैं",
    desc: "Each month, sacred chadhava is offered at the designated Jyotirlinga in your name & gotra. You'll receive WhatsApp proof.",
  },
  {
    title: "Receive Prasad at Home",
    titleHi: "घर पर प्रसाद प्राप्त करें",
    desc: "Blessed prasad from the temple is carefully packed and shipped to your doorstep with tracking.",
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section
      className="py-16 relative overflow-hidden"
    //   style={{
    //     background:
    //       "radial-gradient(circle at center, #2a1a0f 0%, #1a120b 45%, #0f0a07 100%)",
    //   }}
    >
      <Container maxWidth="lg">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
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
            How It Works
          </h2>

          <p className="text-lg md:text-xl text-[#d6c2a3] italic">
            3 Simple Steps to Divine Blessings
          </p>

          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#c89b3c] to-transparent mx-auto mt-6"></div>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto relative">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center relative"
            >
              {/* Step Number Circle */}
              <div
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-gold flex items-center justify-center shadow-lg"
                style={{
                  boxShadow: "0 0 30px rgba(200,155,60,0.4)",
                }}
              >
                <span className="text-2xl font-bold text-black">
                  {i + 1}
                </span>
              </div>

              {/* Connector Line (Desktop only) */}
              {i < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[1px]"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(200,155,60,0.6), transparent)",
                  }}
                />
              )}

              {/* Title */}
              <h3 className="text-lg font-display text-[#f5d78e] mb-2">
                {s.title}
              </h3>

              {/* Hindi Title */}
              <p className="text-sm text-[#e7b56d] mb-3">
                {s.titleHi}
              </p>

              {/* Description */}
              <p className="text-sm text-[#cfc2b0] leading-relaxed">
                {s.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default HowItWorks;
