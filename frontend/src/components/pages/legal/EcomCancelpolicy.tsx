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

const MandalaRibbon = () => (
  <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[130%] -translate-x-1/2 rounded-[40px] bg-gradient-to-r from-amber-200/70 via-orange-100/70 to-amber-200/70 blur-3xl" />
);

const Pill: React.FC<{ children: React.ReactNode; tone?: "ok" | "warn" | "info" }> = ({
  children,
  tone = "info",
}) => {
  const grad =
    tone === "ok"
      ? "from-emerald-400 to-teal-400"
      : tone === "warn"
      ? "from-orange-400 to-amber-500"
      : "from-amber-300 to-orange-300";
  return (
    <span className={`inline-flex items-center rounded-full bg-gradient-to-r ${grad} px-3 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-white/40`}>
      {children}
    </span>
  );
};

const Step: React.FC<{ index: number; title: string; children: React.ReactNode }> = ({
  index,
  title,
  children,
}) => (
  <motion.li variants={item} className="relative pl-8">
    <span className="absolute left-0 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-xs font-bold text-white shadow ring-1 ring-white/50">
      {index}
    </span>
    <h4 className="mb-1 text-sm font-semibold text-orange-900">{title}</h4>
    <p className="text-sm text-orange-900/80">{children}</p>
  </motion.li>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <motion.section
    variants={item}
    className="rounded-2xl bg-white/70 p-6 ring-1 ring-orange-200/70 backdrop-blur"
  >
    <h3 className="mb-3 text-lg font-semibold text-orange-950">{title}</h3>
    <div className="prose prose-sm max-w-none text-orange-900/80">{children}</div>
  </motion.section>
);

const EcomCancelPolicy: React.FC = () => {
  return (
    <>
    <Navbar/>
    <div className="relative min-h-screen mt-[5vh] w-full overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 px-6 py-14">
      <MandalaRibbon />
      <motion.div variants={container} initial="hidden" animate="show" className="relative mx-auto max-w-4xl">
        <motion.header variants={item} className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-3 py-1 ring-1 ring-orange-200/80">
            <span className="text-xs font-semibold tracking-wide text-orange-700">Cancellation Policy</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-orange-950 md:text-4xl">
            Vedic Vaibhav — Cancellation Policy
          </h1>
          <p className="mt-2 max-w-2xl text-orange-900/80">
            You may cancel your order within <strong>24 hours</strong> of booking for a full refund. Cancellations
            made after this window may not be eligible for a refund, especially if the <em>pooja</em> or <em>prasad</em> preparation has already begun.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill tone="warn">24-hour window</Pill>
            <Pill tone="ok">Full refund if eligible</Pill>
            <Pill>Warm • Futuristic</Pill>
          </div>
        </motion.header>

        <div className="space-y-6">
          <Section title="How to Cancel">
            <ol className="space-y-4">
              <Step index={1} title="Email us your request">
                Send an email to{" "}
                <a
                  className="font-medium underline decoration-orange-400/60 underline-offset-4 hover:decoration-orange-500"
                  href="mailto:support@vedicvaibhav.com?subject=Order%20Cancellation%20Request&body=Hello%2C%20please%20cancel%20my%20order.%20Order%20ID%3A%20%5Badd%20ID%5D"
                >
                  support@vedicvaibhav.com
                </a>
                .
              </Step>
              <Step index={2} title="Call customer care (optional)">
                You may also call our customer care number with your order details.
              </Step>
              <Step index={3} title="Receive confirmation">
                Our team will verify eligibility and confirm the status of your cancellation and refund.
              </Step>
            </ol>
          </Section>

          <Section title="Refunds">
            <ul className="list-disc space-y-2 pl-5">
              <li>Full refund if cancellation is within 24 hours of booking.</li>
              <li>After 24 hours, refunds may not be possible if ritual/preparation has started.</li>
            </ul>
          </Section>

          <motion.section
            variants={item}
            className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-orange-200/70 to-amber-200/70 p-6 ring-1 ring-orange-200 backdrop-blur md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h3 className="text-lg font-semibold text-orange-950">Need help right now?</h3>
              <p className="text-sm text-orange-900/80">
                Write to{" "}
                <a
                  className="font-medium underline decoration-orange-500/60 underline-offset-4 hover:decoration-orange-600"
                  href="mailto:support@vedicvaibhav.com"
                >
                  support@vedicvaibhav.com
                </a>{" "}
                with your order ID.
              </p>
            </div>
            <a
              href="mailto:support@vedicvaibhav.com?subject=Order%20Cancellation%20Request&body=Hello%2C%20please%20cancel%20my%20order.%20Order%20ID%3A%20%5Badd%20ID%5D"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-400 to-amber-500 px-4 py-2 font-medium text-white shadow hover:from-orange-500 hover:to-amber-600"
            >
              Request Cancellation
            </a>
          </motion.section>
        </div>

        <motion.p variants={item} className="mt-10 text-xs text-orange-900/70">
          To cancel your order, please email us at support@vedicvaibhav.com or call our customer care number with your order details.
        </motion.p>
      </motion.div>
    </div>
    <Footer/>
    </>
  );
};

export default EcomCancelPolicy;
