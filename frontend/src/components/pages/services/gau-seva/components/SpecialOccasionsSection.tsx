"use client";

import { motion } from "framer-motion";
import { useMoney } from "@/lib/currency";
import { SPECIAL_OCCASIONS } from "../data/gauSevaData";
import "../GauSeva.css";

const SpecialOccasionsSection = ({
  onScrollToPackages,
}: {
  onScrollToPackages?: () => void;
}) => {
  /** Prices display in the devotee's own currency; the India list price is
   *  the input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  return (
    <section className="px-4 py-10" style={{ background: "#fff8f0" }}>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <h2 className="gs-section-title">Special Occasions</h2>
          <p className="text-sm text-gray-500 mt-2">
            Add a special occasion to any package for extra blessings
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {SPECIAL_OCCASIONS.map((occ, i) => (
            <motion.div
              key={occ.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl p-4 text-center shadow-sm border border-orange-100"
            >
              <div className="mb-3 w-full aspect-[4/3] rounded-xl overflow-hidden bg-orange-50 shadow-inner">
                <img loading="lazy"  src={occ.image} alt={occ.name} className="w-full h-full object-cover"  />
              </div>
              <p className="font-semibold text-sm text-gray-800 mb-0.5">{occ.name}</p>
              <p className="gs-devanagari text-xs text-gray-400 mb-1">{occ.nameHindi}</p>
              <p className="text-xs text-gray-500 mb-1">{occ.description}</p>
              <p className="font-bold text-sm" style={{ color: "#ff6b35" }}>
                + {money(occ.premium)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">add-on with any package</p>
            </motion.div>
          ))}
        </div>

        {onScrollToPackages && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onScrollToPackages}
            className="mt-5 w-full py-3 rounded-2xl font-bold text-white text-sm"
            style={{ background: "linear-gradient(135deg,#ff6b35,#e65c00)" }}
          >
            Choose a Package →
          </motion.button>
        )}
      </div>
    </section>
  );
};

export default SpecialOccasionsSection;
