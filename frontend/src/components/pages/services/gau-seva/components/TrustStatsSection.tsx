"use client";

import { motion } from "framer-motion";
import { TRUST_STATS, BENEFITS } from "../data/gauSevaData";
import "../GauSeva.css";

const TrustStatsSection = () => {
  return (
    <section 
      className="py-12 px-4 relative overflow-hidden"
    >
      <img
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/banner_mission.png.webp"
        alt="Mission Background"
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      <div className="absolute inset-0 bg-black/60 z-0" />
      <div className="max-w-2xl mx-auto relative z-10">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl shadow-md p-6 mb-8"
        >
          <h2 className="text-3xl font-black text-center mb-6 text-gray-800">Trusted by Thousands</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TRUST_STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <p className="font-black text-2xl" style={{ color: "#ff6b35" }}>{stat.number}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Benefits grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-black text-center mb-6 text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>What You Get</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BENEFITS.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-3.5 shadow-sm border border-orange-100"
              >
                <div className="w-8 h-8 rounded-full mb-3 flex items-center justify-center bg-orange-100 text-orange-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                </div>
                <p className="font-bold text-sm text-gray-800 mb-0.5">{benefit.title}</p>
                <p className="text-xs text-gray-500">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustStatsSection;
