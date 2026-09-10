"use client";

import { useEffect, useState } from "react";
import { useMoney } from "@/lib/currency";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import type { GauSevaPackage } from "./data/gauSevaData";
import "./GauSeva.css";
import { readNavState, saveNavState } from "@/lib/nav-state";

const GauSevaPaymentFailure = () => {
  /** Nothing was actually charged, so this shows the package's LIST price in
   *  the devotee's own currency for display — never paidMoney(), which is for
   *  amounts that were genuinely billed. */
  const { money } = useMoney();
  const router = useRouter();
  // react-router carried this via location.state; in Next it comes from sessionStorage.
  const [pkg, setPkg] = useState<GauSevaPackage | undefined>(undefined);

  useEffect(() => {
    setPkg(readNavState<{ pkg?: GauSevaPackage }>("gau-seva-failure")?.pkg);
  }, []);

  return (
    <div className="gs-page min-h-screen">
      <Navbar activeIndex="services" />

      <div className="pt-20 px-4 pb-10 max-w-md mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-7xl mb-4">😔</div>

          <h1 className="font-extrabold text-2xl text-gray-900 mb-2">Payment Unsuccessful</h1>
          <p className="text-gray-500 text-sm mb-6">
            Don't worry — no amount was deducted. Please try again to complete your Gau Seva.
          </p>

          {pkg && (
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 text-left text-sm">
              <p className="text-gray-500 mb-1">
                Package: <span className="font-semibold text-gray-800">{pkg.name}</span>
              </p>
              <p className="text-gray-500">
                Amount: <span className="font-semibold" style={{ color: "#ff6b35" }}>{money(pkg.price)}</span>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => {
                saveNavState("gau-seva-payment", { pkg, quantity: 1 });
                router.push("/services/gau-seva/payment");
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-white gs-gradient-saffron shadow-md"
            >
              🔄 Retry Payment
            </button>
            <button
              onClick={() => router.push("/services/gau-seva")}
              className="w-full py-3.5 rounded-2xl font-bold text-gray-700 bg-gray-100"
            >
              ← Back to Gau Seva
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GauSevaPaymentFailure;
