"use client";

import React from 'react';

const HeroBanner: React.FC = () => {
  return (
    <div className="w-full pt-16  flex flex-col items-center relative bg-[#fffaf0]">
      {/* Optimized Image for Mobile/Desktop */}
      <img loading="lazy" 
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/map%201-optimized.webp"
        alt="Mahadev"
        className="w-full h-auto object-contain"
        fetchPriority="high"
       />
      
      {/* Mask to hide text */}
      {/* <div 
        className="absolute bottom-0 left-0 right-0 h-[25%] pointer-events-none"
        style={{
            background: "linear-gradient(to top, #fffaf0 0%, rgba(255,250,240,0) 100%)",
        }}
      /> */}
    </div>
  );
};

export default HeroBanner;
