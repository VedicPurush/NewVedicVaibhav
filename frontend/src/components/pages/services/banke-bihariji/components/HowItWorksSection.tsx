"use client";

import { motion } from "framer-motion";
import { FiPackage, FiUser, FiStar, FiVideo, FiGift } from "react-icons/fi";

const STEPS_DATA = [
  { icon: <FiPackage />, color: "bg-[#3b5998]", title: "Choose Package", description: "Select your preferred darshan package" },
  { icon: <FiUser />, color: "bg-[#a62c5f]", title: "Enter Name & Gotra", description: "Provide your details for personalized puja" },
  { icon: <FiStar />, color: "bg-[#245e43]", title: "Pandit Ji Performs Puja", description: "Expert pandits conduct rituals on your behalf" },
  { icon: <FiVideo />, color: "bg-[#d28a2a]", title: "Get Video Darshan", description: "Receive HD video of your puja ceremony" },
  { icon: <FiGift />, color: "bg-[#c32828]", title: "Receive Prasad", description: "Sacred prasad delivered to your home" },
];

const HowItWorksSection = () => {
  return (
    <section className="bg-[#ae744a] py-8 md:py-12 px-4 md:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-48 h-48 border-[30px] border-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 border-[40px] border-white/5 rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-[#ffeeb5] rounded-2xl md:rounded-[2.5rem] p-5 md:p-10 lg:p-12 shadow-[inset_0_0_60px_rgba(0,0,0,0.04)] border border-[#b08b5c]/10"
        >
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-14">

            {/* Left: Steps */}
            <div className="flex-1 w-full">
              <h2 className="text-xl md:text-3xl lg:text-4xl font-serif font-black text-[#1a1a1a] mb-5 md:mb-8 tracking-tight">
                How Your Devotion Reaches Him
              </h2>

              <div className="flex flex-col gap-3 md:gap-6">
                {STEPS_DATA.map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08 }}
                    className="flex items-start gap-3 md:gap-4 group"
                  >
                    <div className={`${step.color} w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center text-white text-sm md:text-lg shadow-md flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-[#644a2c] text-sm md:text-base font-bold leading-tight">
                        {step.title}
                      </h3>
                      <p className="text-[#1a1a1a] text-xs md:text-sm opacity-70 font-medium mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: Image */}
            <div className="flex-1 w-full relative">
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 z-20 hidden lg:block">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: i * 0.8, ease: "easeInOut" }}
                    className="w-20 h-20 border-2 border-[#f59e0b] absolute shadow-md"
                    style={{ left: `${i * 14}px`, top: `${i * 14}px`, zIndex: 30 - i }}
                  />
                ))}
              </div>
              <motion.div initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative z-10">
                <div className="rounded-2xl md:rounded-[2rem] overflow-hidden shadow-xl border-2 border-[#b08b5c]/20">
                  <img loading="lazy" 
                    src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/shribankebihariji/vrindavan-optimized.webp"
                    alt="Vrindavan Temple"
                    className="w-full h-auto object-cover md:min-h-[300px]"
                   />
                </div>
              </motion.div>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
