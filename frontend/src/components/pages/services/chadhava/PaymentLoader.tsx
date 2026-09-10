"use client";

import React, { useState, useEffect } from "react";

const LoaderAnimationStyle = () => (
  <style>
    {`
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(5deg); }
      }
      @keyframes ripple {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
      @keyframes blob {
        0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
      }
      @keyframes mandala-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pulse-glow {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
      }
      @keyframes lotus-bloom {
        0%, 100% { transform: scale(0.95); opacity: 0.8; }
        50% { transform: scale(1.05); opacity: 1; }
      }
      .animate-float {
        animation: float 3s ease-in-out infinite;
      }
      .animate-float-delayed {
        animation: float 3s ease-in-out infinite;
        animation-delay: 1s;
      }
      .animate-float-delayed-2 {
        animation: float 3s ease-in-out infinite;
        animation-delay: 2s;
      }
      .animate-ripple {
        animation: ripple 2s ease-out infinite;
      }
      .animate-ripple-delayed {
        animation: ripple 2s ease-out infinite;
        animation-delay: 0.5s;
      }
      .animate-ripple-delayed-2 {
        animation: ripple 2s ease-out infinite;
        animation-delay: 1s;
      }
      .animate-shimmer {
        animation: shimmer 3s linear infinite;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        background-size: 1000px 100%;
      }
      .animate-blob {
        animation: blob 8s ease-in-out infinite;
      }
      .animate-mandala-spin {
        animation: mandala-spin 20s linear infinite;
      }
      .animate-pulse-glow {
        animation: pulse-glow 3s ease-in-out infinite;
      }
      .animate-lotus-bloom {
        animation: lotus-bloom 4s ease-in-out infinite;
      }
    `}
  </style>
);

const spiritualFacts = [
  " The Om symbol represents the sound of the universe and divine energy",
  " The lotus flower symbolizes spiritual awakening and purity rising from mud",
  " Namaste means 'the divine in me honors the divine in you'",
  " The Dharma wheel represents the path to enlightenment and eternal truth",
  " In many traditions, the number 108 is considered sacred and auspicious",
  " Your breath connects your body to your soul - breathe deeply",
  " Every soul is on its own unique journey toward higher consciousness",
  " Positive energy you send out returns to you multiplied",
  " Meditation creates space between thoughts, where peace resides",
];

const PaymentLoader: React.FC = () => {
  const [currentFact, setCurrentFact] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % spiritualFacts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <LoaderAnimationStyle />
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center
bg-gradient-to-br from-orange-50 via-amber-50 to-red-50
overflow-hidden backdrop-blur"
      >
        {/* Floating orbs background - representing divine light */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-64 h-64 bg-orange-300/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-32 right-32 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-red-300/20 rounded-full blur-3xl animate-float-delayed-2"></div>
        </div>

        {/* Mandala background pattern */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <div className="w-96 h-96 animate-mandala-spin">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-orange-600"
              />
              <circle
                cx="100"
                cy="100"
                r="60"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-amber-600"
              />
              <circle
                cx="100"
                cy="100"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-red-600"
              />
              {[...Array(8)].map((_, i) => (
                <line
                  key={i}
                  x1="100"
                  y1="100"
                  x2={100 + 80 * Math.cos((i * Math.PI) / 4)}
                  y2={100 + 80 * Math.sin((i * Math.PI) / 4)}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-orange-600"
                />
              ))}
            </svg>
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center w-full max-w-md px-8">
          {/* Sacred geometry - representing universal connection */}
          <div className="relative mb-12">
            {/* Ripple effects - energy waves */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-orange-400/40 rounded-full animate-ripple"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-amber-400/40 rounded-full animate-ripple-delayed"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-red-400/40 rounded-full animate-ripple-delayed-2"></div>
            </div>

            {/* Center sacred symbol */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-orange-400 via-amber-400 to-red-400 animate-blob shadow-2xl flex items-center justify-center">
              <div className="absolute inset-0 animate-shimmer"></div>
            </div>
          </div>

          {/* Spiritual message */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 bg-clip-text text-transparent">
              Verifying your payment...
            </h2>
            <p className="text-lg text-gray-700 font-light"></p>
          </div>

          {/* Spiritual wisdom section */}
          <div className="mt-8 p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-orange-200/30 min-h-[80px] flex items-center">
            <p className="text-sm text-gray-700 text-center font-medium transition-opacity duration-500">
              {spiritualFacts[currentFact]}
            </p>
          </div>

          {/* Mantra text */}
          <p className="mt-4 text-xs text-gray-500 italic">
            &quot;Be still and know the divine within&quot;
          </p>
        </div>
      </div>
    </>
  );
};

export default PaymentLoader;
