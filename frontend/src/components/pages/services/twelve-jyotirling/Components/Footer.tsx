"use client";

import React from "react";
import Container from '@mui/material/Container';
import { motion } from "framer-motion";

interface FooterProps {
  variant?: "light" | "dark";
}

const Footer: React.FC<FooterProps> = ({ variant = "light" }) => {
  const isDark = variant === "dark";

  return (
    <footer
      className="pt-20 pb-12 relative overflow-hidden backdrop-blur-md"
    >
      <Container maxWidth="lg">
        {/* Top Decorative Divider */}
        <div className="w-32 h-[2px] bg-gradient-to-r from-transparent via-[#ea580c] to-transparent mx-auto mb-12" />

        {/* Main Grid */}
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Brand (Left) */}
            <a
              href="#"
              className="flex flex-col group mb-6"
              style={{
                fontFamily: "'Cinzel', 'Trajan Pro', serif",
              }}
            >
              <span
                className="tracking-[0.2em] text-lg font-bold uppercase transition-colors duration-300 font-display"
                style={{ color: isDark ? "#f5d78e" : "#c2410c" }}
              >
                12 Jyotirlinga
              </span>
              <span
                className="text-[10px] uppercase tracking-[0.35em] ml-0.5 mt-0.5 transition-colors duration-300"
                style={{ color: isDark ? "#c89b3c" : "#7c2d12", opacity: 0.9 }}
              >
                by Vedic Vaibhav
              </span>
            </a>

            <p className="text-sm leading-relaxed" style={{ color: isDark ? "#cfc2b0" : "#431407" }}>
              A devotional initiative by Vedic Vaibhav. Bringing the blessings
              of all 12 Jyotirlinga to your home through sacred monthly seva.
            </p>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="text-sm font-bold mb-4" style={{ color: isDark ? "#ea580c" : "#c2410c" }}>
              Contact
            </h4>

            <p className="text-sm leading-relaxed" style={{ color: isDark ? "#cfc2b0" : "#431407" }}>
              WhatsApp: +91-9872788769
              <br />
              Email: support@vedicvaibhav.com
              <br />
            </p>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#ea580c]/50 to-transparent mb-8" />

        {/* Legal Section */}
        <div className="text-center max-w-4xl mx-auto space-y-4 text-xs leading-relaxed" style={{ color: isDark ? "#cfc2b0" : "#431407" }}>
          <p>
            <span className="font-semibold" style={{ color: "#ea580c" }}>Disclaimer:</span>{" "}
            12 Jyotirlinga is a devotional service. We do not guarantee
            any specific material, spiritual, or health outcomes. All seva is
            performed as a devotional act of faith. Results may vary based on
            individual karma and divine will.
          </p>

          <p>
            The Rashi-based temple recommendations are symbolic and intended
            for personalization purposes only. Lord Shiva is universal and
            transcends all astrological categorizations. All devotees receive
            equal blessings regardless of their Rashi.
          </p>

          <p>
            Prices include prasad packaging and standard shipping within India.
            International shipping charges may apply separately. All prices are
            in INR (₹).
          </p>

          <p className="pt-3 font-semibold" style={{ color: isDark ? "#8a7255" : "#7c2d12" }}>
            © {new Date().getFullYear()} Vedic Vaibhav. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
