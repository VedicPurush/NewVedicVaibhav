"use client";

import React from "react";
import Container from '@mui/material/Container';
import { motion } from "framer-motion";
import StarIcon from "@mui/icons-material/Star";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { testimonials } from "../data/plans";

const TestimonialsSection: React.FC = () => {
  return (
    <section
      id="testimonials"
      className="py-4 relative overflow-hidden"
    //   style={{
    //     background:
    //       "radial-gradient(circle at top, #2a1a0f 0%, #1a120b 45%, #0f0a07 100%)",
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
            Devotees Experience
          </h2>

          <p className="text-lg text-[#d6c2a3] italic">
            भक्तों के अनुभव
          </p>

          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#c89b3c] to-transparent mx-auto mt-6"></div>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_30px_rgba(200,155,60,0.25)]"
              style={{
                // background:
                //   "linear-gradient(145deg, rgba(40,25,15,0.6), rgba(20,12,8,0.6))",
                border: "1px solid rgba(200,155,60,0.4)",
              }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <StarIcon
                    key={j}
                    sx={{
                      fontSize: 16,
                      color: "#f5d78e",
                    }}
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-[#d6c2a3] italic leading-relaxed mb-6">
                “{t.quote}”
              </p>

              {/* Plan Badge */}
              <div className="mb-4">
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={
                    t.planType === "premium"
                      ? { background: "linear-gradient(135deg, #7a1d1d, #b33a3a)", color: "#fff" }
                      : t.planType === "popular"
                      ? { background: "linear-gradient(135deg, #f5d78e, #c89b3c)", color: "#000" }
                      : { background: "rgba(200,155,60,0.15)", color: "#f5d78e", border: "1px solid rgba(200,155,60,0.4)" }
                  }
                >
                  {t.planType === "premium" && <WorkspacePremiumIcon sx={{ fontSize: 12 }} />}
                  {t.plan}
                  <span className="opacity-70 font-normal">· {t.planHindi}</span>
                </span>
              </div>

              {/* User */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{
                    background:
                      "linear-gradient(135deg, #f5d78e, #c89b3c)",
                    color: "#000",
                  }}
                >
                  {t.avatar}
                </div>

                <div>
                  <p className="text-sm font-medium text-[#f5d78e]">
                    {t.name}
                  </p>
                  <p className="text-xs text-[#cfc2b0]">
                    {t.location}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default TestimonialsSection;
