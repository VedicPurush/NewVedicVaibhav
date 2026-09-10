"use client";

import React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const container: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", staggerChildren: 0.06 } },
};
const item: Variants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

const MandalaBG = () => (
  <svg
    className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
    aria-hidden
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <radialGradient id="g" cx="50%" cy="30%">
        <stop offset="0%" stopColor="rgba(251,146,60,0.35)" />
        <stop offset="60%" stopColor="rgba(251,146,60,0.08)" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
      <pattern id="p" width="180" height="180" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <circle cx="90" cy="90" r="1" fill="rgba(251,146,60,0.25)" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)" />
    <rect width="100%" height="100%" fill="url(#p)" />
  </svg>
);

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-300/90 to-amber-300/90 px-3 py-1 text-xs font-semibold text-orange-900 shadow-sm ring-1 ring-orange-200/60">
    {children}
  </span>
);

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <motion.section
    variants={item}
    className="relative overflow-hidden rounded-2xl bg-white/70 p-6 shadow-[0_10px_25px_-12px_rgba(0,0,0,0.15)] ring-1 ring-orange-200/70 backdrop-blur"
  >
    <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-amber-200/60 to-orange-100/40 blur-2xl" />
    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-orange-900">{title}</h3>
    <div className="prose prose-sm max-w-none text-orange-900/80">{children}</div>
  </motion.section>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <motion.div
    variants={item}
    className="rounded-2xl bg-white/70 p-5 ring-1 ring-orange-200/70 backdrop-blur"
  >
    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-orange-700/80">{label}</p>
    <p className="text-xl font-semibold text-orange-900">{value}</p>
  </motion.div>
);

const EcomShippingPolicy: React.FC = () => {
  return (
    <>
    <Navbar/>
    <div className="relative min-h-screen mt-[5vh] w-full overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 px-6 py-14">
      <MandalaBG />
      <motion.div variants={container} initial="hidden" animate="show" className="relative mx-auto max-w-5xl">
        <motion.header variants={item} className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-3 py-1 ring-1 ring-orange-200/80">
            <span className="text-xs font-semibold tracking-wide text-orange-700">Shipping Policy</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-orange-950 md:text-4xl">
            Vedic Vaibhav — Shipping Policy
          </h1>
          <p className="mt-2 max-w-3xl text-orange-900/80">
            Vedic Vaibhav offers nationwide and international shipping of <em>prasad</em> and spiritual
            products. All items are shipped with care and devotion from our associated temples and fulfillment centers.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip>Light Saffron Theme</Chip>
            <Chip>Worldwide Delivery</Chip>
            <Chip>Modern • Sanātan</Chip>
          </div>
        </motion.header>

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Processing Time" value="2–4 business days" />
          <Stat label="Delivery (India)" value="5–7 business days" />
          <Stat label="Delivery (International)" value="10–15 business days" />
        </div>

        <div className="space-y-6">
          <Card title="Processing & Delivery">
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Processing:</strong> Orders are typically processed within 2–4 business days.</li>
              <li><strong>India:</strong> 5–7 business days.</li>
              <li><strong>International:</strong> 10–15 business days.</li>
            </ul>
          </Card>

          <Card title="Shipping Partners & Tracking">
            <p className="mb-2">
              We use trusted courier services to ensure timely and secure delivery. You will receive tracking
              details once your order is dispatched.
            </p>
            <ul className="grid grid-cols-1 gap-3 pl-0 sm:grid-cols-2">
              <li className="rounded-xl bg-orange-100/70 p-4 text-orange-900 ring-1 ring-orange-200">End-to-end tracking</li>
              <li className="rounded-xl bg-orange-100/70 p-4 text-orange-900 ring-1 ring-orange-200">Secure prasad packaging</li>
            </ul>
          </Card>

          <Card title="Support & Special Requests">
            <p>
              For any issues or special requests, kindly reach out to{" "}
              <a className="font-medium underline decoration-orange-400/60 underline-offset-4 hover:decoration-orange-500" href="mailto:support@vedicvaibhav.com">
                support@vedicvaibhav.com
              </a>.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="mailto:support@vedicvaibhav.com?subject=Order%20Tracking%20Inquiry&body=Hello%2C%20my%20order%20number%20is%3A%20%5BID%5D"
                className="relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-400 to-amber-500 px-4 py-2 font-medium text-white shadow hover:from-orange-500 hover:to-amber-600"
              >
                Email Support
              </a>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="rounded-full bg-white/70 px-4 py-2 font-medium text-orange-900 ring-1 ring-orange-200 hover:bg-white"
              >
                View Policy Top
              </button>
            </div>
          </Card>
        </div>

        <motion.p variants={item} className="mt-10 text-xs text-orange-900/70">
          Note: Delivery timelines may vary due to customs, regional holidays, or unforeseen courier delays.
        </motion.p>
      </motion.div>
    </div>
   <Footer/>
    </>
  );
};

export default EcomShippingPolicy;
