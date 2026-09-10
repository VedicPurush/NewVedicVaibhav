"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const YatraPaymentFailed = () => {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d0f1a] relative overflow-hidden text-white pt-20 pb-20">
      {/* Floating background elements */}
      <motion.div
        className="absolute top-20 left-10 w-32 h-32 bg-red-500 rounded-full opacity-10 blur-3xl"
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-40 h-40 bg-orange-500 rounded-full opacity-10 blur-3xl"
        animate={{
          y: [0, 20, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="text-center px-4 md:px-0 w-full md:w-1/3 relative z-10">
        {/* Animated Crossmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
          className="relative w-24 h-24 mx-auto mb-6"
        >
          <motion.div
            className="absolute inset-0 border-4 border-red-500 rounded-full"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
          <motion.div
            className="flex items-center justify-center w-full h-full bg-gradient-to-br from-red-500 to-red-700 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="3"
              stroke="white"
              className="w-12 h-12"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Transaction Failed Message */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-2xl font-bold text-red-500 mb-2"
        >
          Payment Failed
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-2 text-gray-300 text-md px-4"
        >
          We were unable to verify your payment. Your booking has not been confirmed. If money was deducted, it will be refunded automatically by your bank within 3-5 business days.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-8 flex flex-col items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full max-w-xs px-8 py-3 text-white font-bold bg-gradient-to-r from-red-500 to-orange-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all duration-300"
            onClick={() => router.push("/4-dham-yatra")}
          >
            🔄 Try Again
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-sm text-gray-400 hover:text-white transition-colors"
            onClick={() => router.push("/")}
          >
            Return to Home
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default YatraPaymentFailed;
