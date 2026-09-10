"use client";

import { motion } from "framer-motion";

const EmotionalSection = () => {
  return (
    <section className="py-10 md:py-16 relative overflow-hidden bg-[#f1a11e]">
      <div className="absolute inset-0 opacity-90" style={{ background: "linear-gradient(135deg, #f2a81e 0%, #e69f1d 50%, #d48c12 100%)" }} />
      <div className="absolute top-[-10%] left-[-8%] w-[35%] aspect-square rounded-full bg-white/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[5%] left-[-5%] w-[25%] aspect-square rounded-full bg-white/10 blur-[60px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[40%] aspect-square rounded-full bg-black/5 blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-3xl mx-auto"
        >
          <div className="text-white/80 text-3xl md:text-5xl font-serif mb-3 md:mb-5 leading-none italic">"</div>

          <div className="space-y-2 md:space-y-4">
            <h2 className="text-lg md:text-3xl lg:text-4xl text-white font-medium leading-tight font-heading">
              जब आप वृंदावन नहीं जा पाते,
            </h2>
            <h2 className="text-lg md:text-3xl lg:text-4xl text-white font-medium leading-tight font-heading">
              तब भी आपकी भक्ति वहाँ पहुँचती है
            </h2>
            <p className="text-sm md:text-base lg:text-xl text-white/90 font-light mt-4 md:mt-6 max-w-xl mx-auto leading-relaxed">
              हम आपकी ओर से सेवा, संकल्प और श्रद्धा का यह पावन सेतु बनाते हैं
            </p>
          </div>

          <div className="text-white/80 text-3xl md:text-5xl font-serif mt-3 md:mt-5 leading-none italic">"</div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 0.9, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-6 md:mt-8 flex justify-center"
          >
            <img loading="lazy" 
              src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/feather-flut-removebg-preview.png"
              alt="Peacock Feather and Flute"
              className="h-10 md:h-16 w-auto object-contain drop-shadow-lg"
             />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default EmotionalSection;
