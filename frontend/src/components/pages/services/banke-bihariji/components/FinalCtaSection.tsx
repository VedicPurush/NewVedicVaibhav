"use client";

import { motion } from "framer-motion";

const peacockHero = "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/peacock-her-removebg-preview.png";

const FinalCtaSection = ({ onBeginSeva }: { onBeginSeva: () => void }) => {
  const whatsappUrl = "https://wa.me/919056955311?text=Jai%20Shri%20Krishna!%20I%20want%20to%20know%20about%20Banke%20Bihari%20Ji%20Daily%20Seva.";

  return (
    <section className="py-14 relative overflow-hidden">
      <div className="absolute inset-0 gradient-peacock opacity-95" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, hsl(185 80% 48% / 0.06) 0%, transparent 50%)' }}
      />
      
      {/* Peacock feather watermark */}
      <div className="absolute bottom-0 right-0 w-48 opacity-10 pointer-events-none">
        <img loading="lazy"  src={peacockHero} alt="" className="w-full"  />
      </div>

      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <span style={{ color: 'hsl(185 80% 55%)' }}>🪶</span>
            <span style={{ color: 'hsl(185 80% 55%)' }}>🪈</span>
            <span style={{ color: 'hsl(185 80% 55%)' }}>🪶</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-3" style={{ color: 'hsl(200 20% 92%)' }}>
            जहाँ भी हों — सेवा वहाँ पहुँचती है
          </h2>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: 'hsl(185 40% 75%)' }}>
            आज ही अपनी नित्य सेवा शुरू करें और ठाकुर जी से अपना आध्यात्मिक जुड़ाव बनाए रखें
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <button
              onClick={onBeginSeva}
              className="gradient-cta font-bold text-base py-3.5 px-8 rounded-xl shadow-seva hover:shadow-seva-glow transition-all duration-300 active:scale-[0.97] text-primary-foreground"
            >
              अपनी सेवा शुरू करें 🌸
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-base py-3.5 px-8 rounded-xl border transition-all duration-300 inline-flex items-center justify-center gap-2"
              style={{ color: 'hsl(200 20% 92%)', borderColor: 'hsl(185 80% 48% / 0.4)' }}
            >
              📱 WhatsApp Support
            </a>
          </div>
{/* 
          <p className="text-xs italic" style={{ color: 'hsl(185 30% 60%)' }}>
            Crafted for devotees who want daily connection with Banke Bihari Ji
          </p> */}
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
