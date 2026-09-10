"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CloseCircleFilled, WarningFilled } from "@ant-design/icons";
import { Button } from "antd";

const BankeBihariPaymentFailure = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100"
      >
        <div className="bg-gradient-to-r from-red-500 to-rose-600 p-8 text-center text-white">
          <CloseCircleFilled className="text-6xl mb-4" />
          <h1 className="text-2xl font-bold">Payment Unsuccessful</h1>
          <p className="text-red-50 mt-2">Something went wrong with your transaction.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 items-start">
            <WarningFilled className="text-red-500 mt-1" />
            <div className="text-sm text-red-900 font-medium">
              If your amount was debited, it will be refunded within 5-7 business days. Please don't worry.
            </div>
          </div>

          <div className="space-y-4">
            <Button 
              type="primary" 
              size="large" 
              block
              onClick={() => router.push("/services/banke-bihariji")}
              className="bg-red-600 hover:bg-red-700 h-12 rounded-xl font-bold border-none"
            >
              Retry Booking
            </Button>
            <Button 
              size="large" 
              block
              onClick={() => router.push("/")}
              className="h-12 rounded-xl font-bold border-gray-200 text-gray-600"
            >
              Return Home
            </Button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Need help? Contact our support at info@vedicvaibhav.com
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default BankeBihariPaymentFailure;
