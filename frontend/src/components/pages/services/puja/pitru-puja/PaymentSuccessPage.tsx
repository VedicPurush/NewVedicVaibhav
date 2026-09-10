"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

interface SuccessState {
  orderId?: string;
  packageTitle?: string;
  price?: string;
  kartaName?: string;
  whatsappNumber?: string;
  dateLabel?: string;
  mandirName?: string;
  mandirPlace?: string;
  paymentId?: string;
}

const PaymentSuccessPage: React.FC = () => {
  const router = useRouter();
  const [state, setState] = useState<SuccessState | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pitruPujaSuccessState");
      if (raw) setState(JSON.parse(raw));
    } catch {
      // ignore — falls back to generic confirmation copy below
    }
  }, []);

  return (
    <>
      <Navbar activeIndex="puja" />

      <div className="min-h-screen bg-[#FFF8F0] pt-[6vh] pb-16">
        <div className="max-w-md mx-auto px-4 pt-10 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mx-auto">
            <CheckCircleIcon style={{ fontSize: 36, color: "#059669" }} />
          </div>

          <h1 className="font-display text-[22px] font-bold text-[#5C1D1D] mt-4">Booking Confirmed!</h1>
          <p className="text-[13px] text-stone-500 mt-1">
            Your Pitru Puja has been booked successfully. We'll reach out on WhatsApp with further details.
          </p>

          <div className="bg-white border border-[#F4E4CC] rounded-2xl p-4 mt-6 text-left space-y-2">
            {state?.packageTitle && (
              <div className="flex justify-between text-[13px]">
                <span className="text-stone-500">Package</span>
                <span className="font-semibold text-stone-800">{state.packageTitle}</span>
              </div>
            )}
            {state?.price && (
              <div className="flex justify-between text-[13px]">
                <span className="text-stone-500">Amount Paid</span>
                <span className="font-semibold text-[#5C1D1D]">₹{state.price}/-</span>
              </div>
            )}
            {state?.kartaName && (
              <div className="flex justify-between text-[13px]">
                <span className="text-stone-500">Karta</span>
                <span className="font-semibold text-stone-800">{state.kartaName}</span>
              </div>
            )}
            {state?.dateLabel && (
              <div className="flex justify-between text-[13px]">
                <span className="text-stone-500">Puja Date</span>
                <span className="font-semibold text-stone-800">{state.dateLabel}</span>
              </div>
            )}
            {(state?.mandirName || state?.mandirPlace) && (
              <div className="flex justify-between text-[13px]">
                <span className="text-stone-500">Location</span>
                <span className="font-semibold text-stone-800 text-right">
                  {[state?.mandirName, state?.mandirPlace].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            {state?.orderId && (
              <div className="flex justify-between text-[13px] pt-2 border-t border-dashed border-stone-200">
                <span className="text-stone-500">Order ID</span>
                <span className="font-mono text-stone-600">{state.orderId}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full rounded-full bg-[#EA6A12] hover:bg-[#d55e0a] text-white font-semibold text-[14px] py-3 mt-6 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default PaymentSuccessPage;
