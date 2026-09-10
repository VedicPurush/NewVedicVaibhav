"use client";

import React from 'react';

const CampaignIntro: React.FC = () => {
    return (
        <div className="mt-0  rounded-b-[2rem] overflow-hidden shadow-2xl relative z-20 ">
            {/* Top Dark Section */}
            <div className="bg-[#111111] border border-yellow-500 border-t-0 rounded-br-3xl rounded-bl-3xl relative pb-3  px-4 text-center flex flex-col items-center">
                {/* Subtle golden top gradient glow */}
                <div className="absolute inset-0 top-0 h-[60%] bg-gradient-to-b from-[#eab308]/20 to-transparent pointer-events-none" />
                
                <div className="relative z-10 w-full flex flex-col items-center">
                    {/* Main Titles */}
                    <h2 
                        className="text-[26px] sm:text-[28px] font-bold mb-0.5 tracking-wide" 
                        style={{ 
                            color: "transparent",
                            WebkitTextStroke: "1px #fbbf24", // strong golden outline
                            textShadow: "1px 1px 0px #fbbf24, 0 4px 15px rgba(251, 191, 36, 0.4)",
                            fontFamily: "Georgia, serif"
                        }}
                    >
                        12 Jyotirlinga
                    </h2>
                    
                    <h3 
                        className="text-[20px] font-bold text-white mb-2 tracking-tight" 
                        style={{ 
                            textShadow: "0 0 20px rgba(255, 255, 255, 0.4)",
                            fontFamily: "Georgia, serif" 
                        }}
                    >
                        12 Months of Divine Seva
                    </h3>

                    {/* Hindi Subtitle */}
                    <p className="text-white/95 text-[12px] mb-2 font-medium tracking-wide">
                        बारह ज्योतिर्लिंग • बारह महीने की पवित्र यात्रा
                    </p>

                    {/* Description Text — always exactly 2 lines */}
                    <p className="text-[#fbbf24] text-[11.5px] italic mb-4 font-serif w-full text-center leading-[1.5] px-2">
                        Sacred chadhava at all 12 Jyotirlinga temples, in your name &amp; gotra —<br />
                        with monthly prasad delivered to your home.
                    </p>
                    
                    {/* Call to Action Button */}
                    <button 
                        className="w-[60%] py-2.5 rounded-full font-bold text-[15px] text-white shadow-[0_4px_15px_rgba(245,158,11,0.4)] transition-transform active:scale-95" 
                        style={{ background: "linear-gradient(to right, #f59e0b, #f97316)", fontFamily: "Georgia, serif"  }}
                        onClick={() => document.getElementById("packages-section")?.scrollIntoView({ behavior: "smooth" })}
                    >
                       <span className='me-1'>🙏</span>      Start My Sacred Journey
                    </button>
                </div>
            </div>
            
            {/* Bottom Cream Stats Section */}
          <div className="bg-[#fff4e0] px-1 py-3 grid grid-cols-4 divide-x-[1.5px] divide-[#c7a474]/50">
  <div className="text-center px-0.5 flex flex-col justify-center">
    <div className="font-bold text-[14px] text-[#1a1a1a] font-serif">5000+</div>
    <div className="text-[9px] text-[#333] leading-[1.1] mt-0.5 font-medium whitespace-nowrap">
      Devotees Served
    </div>
  </div>

  <div className="text-center px-0.5 flex flex-col justify-center">
    <div className="font-bold text-[14px] text-[#1a1a1a] font-serif">4.9 ⭐</div>
    <div className="text-[9px] text-[#333] leading-[1.1] mt-0.5 font-medium whitespace-nowrap">
      Average Rating
    </div>
  </div>

  <div className="text-center px-0.5 flex flex-col justify-center">
    <div className="font-bold text-[14px] text-[#1a1a1a] font-serif">200+</div>
    <div className="text-[9px] text-[#333] leading-[1.1] mt-0.5 font-medium whitespace-nowrap">
      News Portals
    </div>
  </div>

  <div className="text-center px-0.5 flex flex-col justify-center">
    <div className="font-bold text-[14px] text-[#1a1a1a] font-serif">12</div>
    <div className="text-[9px] text-[#333] leading-[1.1] mt-0.5 font-medium whitespace-nowrap">
      Holy Temples
    </div>
  </div>
</div>
        </div>
    );
};

export default CampaignIntro;
