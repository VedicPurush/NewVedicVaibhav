"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";

const PersonalizedPujaFailure = () => {
  const router = useRouter();
  const [reason, setReason] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("personalizedPujaFailureReason");
      if (stored) setReason(stored);
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg,#fff5f5 0%,#fff 60%)" }}>
      <Navbar activeIndex="mandir" />

      <div className="pt-20 px-4 pb-14 max-w-md mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 18 }}
          className="flex flex-col items-center"
        >
          <div className="text-7xl mt-6 mb-4">😔</div>

          <h1 className="font-extrabold text-2xl text-gray-900 mb-2">Payment Unsuccessful</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Don&apos;t worry — no amount has been deducted from your account.
            Please try again to complete your puja booking.
          </p>

          {reason && (
            <div className="w-full rounded-2xl px-4 py-3 mb-5 text-sm text-left" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <p className="text-red-700 font-semibold">Reason: {reason}</p>
            </div>
          )}

          <div className="w-full rounded-2xl px-4 py-3 mb-6 text-sm text-left" style={{ background: "#fff3e0", border: "1px solid #fed7aa" }}>
            <p className="text-orange-700 font-semibold mb-1">Need help?</p>
            <p className="text-orange-600">
              Contact us at{" "}
              <a href="mailto:support@vedicvaibhav.com" className="font-bold underline">
                support@vedicvaibhav.com
              </a>
            </p>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => router.back()}
              className="w-full py-3.5 rounded-2xl font-bold text-white"
              style={{ background: "linear-gradient(135deg,#f97316,#d97706)" }}
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 rounded-2xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
            >
              ← Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PersonalizedPujaFailure;
