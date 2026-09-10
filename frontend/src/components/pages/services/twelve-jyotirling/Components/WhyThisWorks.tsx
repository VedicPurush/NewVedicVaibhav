"use client";

import React from "react";
import Container from '@mui/material/Container';
import { motion } from "framer-motion";

// Material UI Icons
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";

interface Benefit {
  icon: React.ElementType;
  title: string;
  titleHi: string;
  desc: string;
}

const benefits: Benefit[] = [
  {
    icon: ShieldOutlinedIcon,
    title: "Remove Obstacles",
    titleHi: "बाधाओं को दूर करें",
    desc: "Each Jyotirlinga carries unique energy to dissolve specific karmic blocks and obstacles from your life path.",
  },
  {
    icon: FavoriteBorderOutlinedIcon,
    title: "Health & Well-being",
    titleHi: "स्वास्थ्य और कल्याण",
    desc: "Ancient Vedic rituals performed with your sankalp channel healing vibrations for physical and mental wellness.",
  },
  {
    icon: GroupsOutlinedIcon,
    title: "Family Harmony",
    titleHi: "पारिवारिक सामंजस्य",
    desc: "Blessings from sacred temples strengthen family bonds, bring peace to relationships, and protect loved ones.",
  },
  {
    icon: AutoAwesomeOutlinedIcon,
    title: "Spiritual Growth",
    titleHi: "आध्यात्मिक विकास",
    desc: "A complete 12-month cycle of devotion across all Jyotirlinga accelerates your spiritual journey like nothing else.",
  },
];

const WhyThisWorks: React.FC = () => {
  return (
    <section
      className="py-4 relative overflow-hidden "
      // style={{
      //   background:
      //     "radial-gradient(circle at top, #2a1a0f 0%, #1a120b 40%, #0f0a07 100%)",
      // }}
    >
      <Container maxWidth="xl">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl md:text-4xl  tracking-wide mb-4 font-display"
            style={{
              background: "linear-gradient(90deg, #f5d78e, #c89b3c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              paddingTop: "0.2em",
              lineHeight: 1.4,
            }}
          >
            Why This Works
          </h2>

          <p className="text-lg md:text-xl text-[#d6c2a3] italic">
            शिव कृपा से सब संभव है — With Shiva's grace, Everything is possible
          </p>

          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#c89b3c] to-transparent mx-auto mt-6"></div>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-7 max-w-7xl mx-auto">
          {benefits.map((b, i) => {
            const IconComponent = b.icon;

            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="border-ornate group rounded-xl px-6 py-6 text-center backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_30px_rgba(200,155,60,0.25)]"
                style={{
                  // background:
                  //   "linear-gradient(145deg, rgba(40,25,15,0.6), rgba(20,12,8,0.6))",
                  border: "1px solid rgba(200,155,60,0.4)",
                }}
              >
                {/* Icon Circle */}
                <div
                  className="w-16 h-16 mx-auto mb-6 bg-gradient-gold rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                >
                  <IconComponent
                    sx={{
                      fontSize: 28,
                      color: "#000",
                    }}
                  />
                </div>

                {/* English Title */}
                <h3 className="text-lg font-display font-semibold text-[#f5d78e] mb-2" >
                  {b.title}
                </h3>

                {/* Hindi Title */}
                <p className="text-sm text-[#e7b56d] mb-3">
                  {b.titleHi}
                </p>

                {/* Description */}
                <p className="text-sm text-[#cfc2b0] leading-relaxed">
                  {b.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

export default WhyThisWorks;
