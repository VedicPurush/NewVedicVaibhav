"use client";

import { motion } from "framer-motion";

const videos = [
  { id: "vid1", title: "श्री बांके बिहारी जी सेवा", subtext: "मुख्य पुजारी श्री बांके बिहारी जी", youtubeId: "mPyXbDxu73Q" },
  { id: "vid2", title: "श्री बांके बिहारी जी सेवा", subtext: "मुख्य पुजारी श्री बांके बिहारी जी", youtubeId: "1JgsoRGi_t4" },
];

const PujaVideosSection = () => {
  return (
    <section className="py-7 md:py-10 bg-[#b25b30] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[500px] h-[500px] rounded-full border-[16px] border-white flex items-center justify-center">
          <div className="w-[350px] h-[350px] rounded-full border-[8px] border-white flex items-center justify-center">
            <div className="w-[200px] h-[200px] rounded-full border-[4px] border-white" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 md:gap-6 mb-5 md:mb-7">
          <motion.img
            initial={{ opacity: 0, x: -15, rotate: -30 }}
            whileInView={{ opacity: 1, x: 0, rotate: -25 }}
            viewport={{ once: true }}
            src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/shribankebihariji/phank-optimized.webp"
            className="h-10 md:h-20 w-auto rotate object-contain transform -scale-x-1"
            alt="Mourpank"
          />
          <h2 className="text-base md:text-3xl lg:text-4xl text-white font-bold text-center leading-tight [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] font-heading">
            श्री बांके बिहारी जी मुख्य मंदिर में अर्पण
          </h2>
          <motion.img
            initial={{ opacity: 0, x: 15, rotate: 30 }}
            whileInView={{ opacity: 1, x: 0, rotate: 25 }}
            viewport={{ once: true }}
            src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/shribankebihariji/phank-optimized.webp"
            className="h-10 md:h-20 w-auto object-contain"
            alt="Mourpank"
          />
        </div>

        {/* Mobile: horizontal snap scroll — Desktop: auto-fill grid */}
        <style>{`
          .videos-scroll::-webkit-scrollbar { display: none; }
          .videos-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        {/* Scroll hint arrows — mobile only */}
        <div className="flex items-center gap-1 justify-end mb-2 md:hidden">
          <span className="text-white/60 text-xs">swipe</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white/60">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Mobile scroll wrapper */}
        <div className="md:hidden relative">
          {/* Fade-out right edge to hint at more content */}
          {/* <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#b25b30] to-transparent z-10 pointer-events-none rounded-r-2xl" /> */}
          <div className="videos-scroll flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.35 }}
                className="snap-center flex-shrink-0 w-[52vw] max-w-[200px] bg-[#7a1b1b] rounded-2xl overflow-hidden shadow-lg flex flex-col"
              >
                <div className="aspect-[9/16] bg-black">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${video.youtubeId}?modestbranding=1&rel=0`}
                    title={video.title}
                    style={{ border: "none" }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="px-2 py-2 text-center bg-gradient-to-b from-[#7a1b1b] to-[#5a1414]">
                  <h3 className="text-[10px] text-white font-bold mb-0.5 font-heading tracking-wide leading-tight">{video.title}</h3>
                  <p className="text-[#e69f1d] text-[9px] font-medium opacity-90 leading-tight">{video.subtext}</p>
                </div>
              </motion.div>
            ))}
            {/* Spacer so last card isn't hidden under fade */}
            <div className="flex-shrink-0 w-4" />
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-2">
            {videos.map((_, i) => (
              <div key={i} className={`rounded-full bg-white/40 ${i === 0 ? "w-4 h-1.5 bg-white/80" : "w-1.5 h-1.5"} transition-all`} />
            ))}
          </div>
        </div>

        {/* Desktop: auto-fill grid — portrait columns for Shorts */}
        <div
          className="hidden md:grid gap-4 mx-auto"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(180px, 1fr))`,
            maxWidth: `${Math.min(videos.length * 210, 750)}px`,
          }}
        >
          {videos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="bg-[#7a1b1b] rounded-2xl overflow-hidden border-2 border-[#7a1b1b] shadow-lg flex flex-col"
            >
              <div className="aspect-[9/16] bg-black">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${video.youtubeId}?modestbranding=1&rel=0`}
                  title={video.title}
                  style={{ border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="px-3 py-2.5 text-center bg-gradient-to-b from-[#7a1b1b] to-[#5a1414]">
                <h3 className="text-xs text-white font-bold mb-0.5 font-heading tracking-wide leading-tight">{video.title}</h3>
                <p className="text-[#e69f1d] text-[10px] font-medium opacity-90 leading-tight">{video.subtext}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-white/50 text-xs md:text-sm italic max-w-xl mx-auto font-light">
            * The videos shown are from our previous offerings for devotees who booked through Vedic Vaibhav.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PujaVideosSection;
