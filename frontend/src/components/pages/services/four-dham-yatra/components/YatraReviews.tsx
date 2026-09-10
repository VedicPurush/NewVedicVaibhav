"use client";

import React from "react";
import { motion } from "framer-motion";
import StarIcon from "@mui/icons-material/Star";

const reviews = [
  {
    name: "Rahul S.",
    location: "New Delhi",
    quote: "The virtual darshan was so clear, it felt like I was actually there. Thank you for this divine service.",
    rating: 5,
    avatar: "R",
  },
  {
    name: "Meena Kumar",
    location: "Mumbai",
    quote: "Highly impressed with the professionalism and the timely delivery of Prasad. A must-visit service for every devotee.",
    rating: 5,
    avatar: "M",
  },
  {
    name: "Vikram singh.",
    location: "Lucknow",
    quote: "Performed the 4 Dham puja for my elderly parents. They were extremely happy to see the rituals on video.",
    rating: 5,
    avatar: "V",
  },
  {
    name: "Amit Pawar",
    location: "Bangalore",
    quote: "A truly transparent process. Received WhatsApp updates throughout the rituals. Very satisfied.",
    rating: 5,
    avatar: "A",
  },
];

const YatraReviews: React.FC = () => {
  return (
    <section className="yatra-reviews pb-6 px-4 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-4"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          Devotees <span className="text-[#FFC107]">Experiences</span>
        </h2>
        <p className="text-gray-400 text-sm italic">भक्तों के अनुभव</p>
        <div className="w-20 h-1 bg-gradient-to-r from-transparent via-[#FFC107] to-transparent mx-auto mt-4" />
      </motion.div>

      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto sm:overflow-x-visible pb-8 sm:pb-0 px-2 sm:px-0 snap-x snap-mandatory scrollbar-hide">
        {reviews.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex-shrink-0 w-[85%] sm:w-auto snap-center rounded-2xl p-6 border border-[#FFC107]/20 bg-black/40 backdrop-blur-sm shadow-lg hover:shadow-[0_0_30px_rgba(255,193,7,0.1)] transition-all duration-300"
          >
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, j) => (
                <StarIcon key={j} className="text-[#FFC107]" style={{ fontSize: 16 }} />
              ))}
            </div>

            <p className="text-sm text-gray-200 italic leading-relaxed mb-6">
              “{r.quote}”
            </p>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#b45309] flex items-center justify-center text-sm font-bold text-black border border-white/20">
                {r.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{r.name}</p>
                <p className="text-xs text-gray-400">{r.location}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default YatraReviews;
