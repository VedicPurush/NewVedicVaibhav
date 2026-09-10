"use client";

import { motion } from "framer-motion";
import "../GauSeva.css";

const FinalCtaSection = ({ onBookNow }: { onBookNow: () => void }) => {
  return (
    <section
      className="px-4 py-16 text-center relative overflow-hidden shadow-inner"
    >
      <img
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/hero_gau_mata.png.webp"
        alt="Gau Seva Final CTA"
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      <div 
        className="absolute inset-0 z-0" 
        style={{ backgroundImage: 'linear-gradient(rgba(247,147,30,0.85), rgba(255,107,53,0.95))' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-md mx-auto relative z-10"
      >
        <h2 className="text-white font-extrabold text-2xl mb-2" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
          Start Your Gau Seva Today
        </h2>
        <p className="text-white/85 text-sm mb-6 gs-devanagari">
          गौ माता की सेवा से मिलती है असीम कृपा
        </p>
        <button
          onClick={onBookNow}
          className="gs-pulse inline-flex items-center gap-2 bg-white font-bold rounded-full px-10 py-4 shadow-lg text-base"
          style={{ color: "#ff6b35" }}
        >
           Book Gau Seva 
        </button>
        <p className="text-white/70 text-xs mt-4">Photo &amp; certificate every Wednesday · No hidden charges</p>
      </motion.div>
    </section>
  );
};

export default FinalCtaSection;
