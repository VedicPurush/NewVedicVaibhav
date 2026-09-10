"use client";

import "../BankeBihariji.css";

const HeroSection = () => {
  return (
    <section className="relative z-30 -mt-5 h-auto sm:h-screen flex items-center justify-center overflow-hidden bg-white">
      {/* Mobile View Image - Show fully without cutting */}
      <img loading="lazy"  
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/shribankebihariji/shri%20Banke%20Bihari%20ji%20image%20final-optimized.webp"
        className="w-full h-auto sm:hidden block relative z-10"
        alt="Banke Bihari Ji Mobile"
       />

      {/* Desktop Background Image with optimized scaling */}
      <div className="absolute inset-0 bg-white sm:bg-transparent hidden sm:block" />
      <div className="absolute inset-0 hero-bg shadow-[inset_0_0_100px_rgba(0,0,0,0.1)] hidden sm:block" />

      {/* Bottom fade — blends hero into the golden packages section below */}
      <div className="absolute bottom-0 left-0 right-0 h-10 sm:h-16 z-20 pointer-events-none"
           style={{ background: "linear-gradient(to bottom, transparent 0%, #fbaa1c 100%)" }} />

      {/* Desktop heading overlay — centered on hero image */}
      <div className="absolute inset-0 z-30 hidden sm:flex flex-col items-center justify-center pointer-events-none">
        <h1
          className="font-cormorant text-center"
          style={{
            fontSize: "clamp(1.4rem, 2.6vw, 2.8rem)",
            color: "#3b1200",
            background: "rgba(255, 248, 235, 0.92)",
            borderRadius: "999px",
            padding: "0.45em 1.6em",
            fontWeight: 600,
            letterSpacing: "0.04em",
            boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          }}>
          श्री बांके बिहारी जी, वृंदावन
        </h1>
      </div>

      {/* SEO H1 — visually hidden but crawlable */}
      <h1 className="sr-only">
        Shri Banke Bihari Ji Online Pooja &amp; Prasad from Vrindavan Mandir — Book Seva on Vedic Vaibhav
      </h1>
    </section>
  );
};

export default HeroSection;