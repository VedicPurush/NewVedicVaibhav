"use client";

import { motion } from 'framer-motion';
import React from 'react';

const HeroContent = () => {
  const handleScroll = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Because the Layout component renders the content twice (desktop/mobile slots),
    // there are two 'services' IDs in the DOM. We need the one that is actually visible.
    const elements = document.querySelectorAll('#services');
    let targetElement: Element | null = null;
    
    elements.forEach(el => {
      // Check if the element or its likely responsive parent is visible
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && el.getClientRects().length > 0) {
        targetElement = el;
      }
    });

    // Fallback if visibility check is inconclusive
    if (!targetElement && elements.length > 0) {
      targetElement = elements[elements.length - 1]; // On mobile, the second one is usually the active one
    }

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const absoluteTop = rect.top + window.pageYOffset;
      window.scrollTo({
        top: absoluteTop - 20,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="sy-hero-section">
      <div className="sy-container">
        {/* Badge */}
        <motion.div
           initial={{ opacity: 0, y: 16 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="sy-hero-badge">
            <span className="sy-dot" />
            Launching Soon
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
           initial={{ opacity: 0, y: 24 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
        >
          <h1 className="sy-hero-title">
            <span className="sy-text-gradient-orange">Sanatan</span>
            <br />
            Yatra
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.div
           initial={{ opacity: 0, y: 18 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.7, delay: 0.22, ease: 'easeOut' }}
        >
          <p className="sy-hero-tagline">
            Soulful pilgrimages across the sacred land of Bharat.
          </p>

          <button onClick={handleScroll} className="sy-hero-cta" style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', border: 'none' }}>
            Explore Packages
            <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 1L8 15M8 15L14 9M8 15L2 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>
        </motion.div>

        <div className="sy-hero-divider" />
      </div>
    </section>
  );
};

export default HeroContent;
