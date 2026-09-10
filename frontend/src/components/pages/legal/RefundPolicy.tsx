"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Layout from "@/components/layout/Layout";

/** Page Wrapper */
const RefundPolicy = () => {
  return <Layout content={<RefundPolicyContent />} />;
};

export default RefundPolicy;

/** Content */
const RefundPolicyContent = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const listStagger: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  return (
    <div className="w-full bg-white text-stone-900">
      {/* HERO */}
      <section className="relative grid min-h-[50px] place-items-center">
        <img
          src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/terms.png"
          alt="Vedic Vaibhav — Policies"
          className="h-[200px] w-full object-cover saturate-100 contrast-[1.05]"
          loading="eager"
        />
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-white/90 via-white/70 to-white/40 px-4 pt-5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="mb-1 font-semibold tracking-[0.06em] text-[#0f5132]">
              धर्मो रक्षति रक्षितः
            </p>
            <h1 className="text-3xl font-extrabold text-[#ff7a1a] md:text-4xl">
              Return & Refund Policy
            </h1>
            <p className="mx-auto mt-2 max-w-[60ch] text-stone-700">
              Transparent and dhārmic — designed for your peace of mind.
            </p>
          </motion.div>
        </div>

        {/* saffron aura */}
        <div className="pointer-events-none absolute -bottom-12 h-24 w-full bg-gradient-to-b from-transparent to-[#ffedd5]" />
      </section>

      {/* SHELL */}
      <div className="mx-auto mb-16 mt-14 max-w-5xl px-4">
        {/* QUICK FACTS */}
        <motion.section
          variants={listStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-4 md:grid-cols-3"
        >
          <motion.div variants={fadeUp}>
            <FactCard
              icon={<SandalIcon />}
              title="7-Day Returns"
              text="Return/exchange requests accepted within 7 days of delivery."
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <FactCard
              icon={<KalashIcon />}
              title="Refund Timing"
              text="Approved refunds initiated within 10 business days."
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <FactCard
              icon={<LotusIcon />}
              title="Support"
              text={
                <>
                  <span>Email: </span>
                  <a
                    href="mailto:support@vedicvaibhav.com"
                    className="font-medium text-emerald-800 underline-offset-2 hover:underline"
                  >
                    support@vedicvaibhav.com
                  </a>
                  <br />
                  <span>Hours: 9:30 AM – 6:30 PM IST (Mon–Sat)</span>
                </>
              }
            />
          </motion.div>
        </motion.section>

        {/* INTRO */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="relative mt-6 rounded-2xl border border-[#ffb46a]/30 bg-white p-5 shadow-[0_10px_30px_rgba(255,122,26,0.08)]"
        >
          <CornerMotif />
          <h2 className="mb-2 text-xl font-extrabold text-[#cc5f10]">Welcome to Vedic Vaibhav</h2>
          <p>
            By using{" "}
            <a
              className="font-medium text-emerald-800 underline-offset-2 hover:underline"
              href="https://vedicvaibhav.com"
            >
              vedicvaibhav.com
            </a>{" "}
            and our services, you agree to the policy below. We uphold{" "}
            <em>satya</em> (truth) and <em>seva</em> (service) in every interaction.
          </p>
        </motion.section>

        {/* GRID: ELIGIBILITY + NON-REFUNDABLE */}
        <section className="mt-4 grid gap-4  md:grid-cols-2">
          <CardAnimate className="mt-0">
            <SectionCard title="1) Return & Refund Eligibility">
              <ul className="ml-5 mt-1 list-disc space-y-2">
                <li>
                  <b>Physical items / prasad:</b> Return or exchange requests eligible within{" "}
                  <b>7 days</b> of delivery if unused, in original condition with tags/invoice.
                </li>
                <li>
                  <b>Pūjā/Seva bookings:</b> Full refund if cancelled <b>≥ 48 hours</b> before start
                  time. Within 48 hours, a <b>service fee (up to 25%)</b> may apply.
                </li>
                <li>
                  <b>No-show / after start:</b> Not eligible for refund. We can still dispatch{" "}
                  <em>prasad</em> where applicable.
                </li>
                <li>
                  <b>One free reschedule:</b> Request ≥ 24 hours in advance, subject to availability.
                </li>
              </ul>
            </SectionCard>
          </CardAnimate>

          <CardAnimate className="mt-0">
            <SectionCard title="2) Non-Refundable Items & Services">
              <ul className="ml-5 mt-1 list-disc space-y-2">
                <li>
                  <b>Customized sankalpa offerings</b> already performed.
                </li>
                <li>
                  <b>Perishable prasad</b> and <b>special-order samagri</b> procured on request.
                </li>
                <li>
                  <b>Payment gateway/FX fees</b> where applicable (non-refundable).
                </li>
                <li>
                  <b>Digital deliverables</b> shared (photos/videos) unless defective or not delivered.
                </li>
              </ul>
            </SectionCard>
          </CardAnimate>
        </section>

        {/* HOW TO REQUEST */}
        <CardAnimate className="mt-6">
          <SectionCard title="3) How to Request a Return/Refund or Reschedule">
            <ol className="ml-5 mt-1 list-decimal space-y-2">
              <li>
                Email{" "}
                <a
                  href="mailto:support@vedicvaibhav.com"
                  className="font-medium text-emerald-800 underline-offset-2 hover:underline"
                >
                  support@vedicvaibhav.com
                </a>{" "}
                from your registered email.
              </li>
              <li>
                Include: <b>Order/Booking ID</b>, <b>Full Name</b>, <b>Service/Item</b>,{" "}
                <b>Scheduled Date & Time (IST)</b> or <b>Delivery Date</b>, and the <b>reason</b>.
              </li>
              <li>
                Attach <b>proofs</b> (unboxing photos/videos for damaged items, screenshots for failed delivery, etc.).
              </li>
            </ol>
            <p className="mt-3 rounded-md border-l-4 border-[#ffb86b] bg-[#fff2e6] p-3 text-stone-800">
              We&rsquo;ll acknowledge your request and guide you through the next steps.
            </p>
          </SectionCard>
        </CardAnimate>

        {/* PROCESSING */}
        <CardAnimate className="mt-6">
          <SectionCard title="4) Refund Timing & Method">
            <p>
              Once approved, refunds are initiated within <b>10 business days</b> to the{" "}
              <b>original payment method</b>. Posting times depend on your bank/issuer.
            </p>
            <ul className="ml-5 mt-1 list-disc space-y-2">
              <li>
                <b>UPI/Wallet/Net-Banking:</b> Usually 2–5 business days after initiation.
              </li>
              <li>
                <b>Credit/Debit Cards:</b> 5–10 business days (issuer dependent).
              </li>
              <li>
                <b>International payments:</b> 7–14 business days (FX timelines may apply).
              </li>
            </ul>
          </SectionCard>
        </CardAnimate>

        {/* DAMAGE / NOT AS DESCRIBED */}
        <CardAnimate className="mt-6">
          <SectionCard title="5) Damaged, Defective, or Not-as-Described">
            <ul className="ml-5 mt-1 list-disc space-y-2">
              <li>
                Report within <b>48 hours of delivery</b> with unboxing photos/videos.
              </li>
              <li>
                If verified, we&rsquo;ll arrange a <b>replacement</b> or <b>refund</b> as per availability.
              </li>
              <li>Retain packaging until the claim is resolved.</li>
            </ul>
          </SectionCard>
        </CardAnimate>

        {/* SHIPPING / PRASAD */}
        <CardAnimate className="mt-6">
          <SectionCard title="6) Shipping, Prasad & Returns">
            <ul className="ml-5 mt-1 list-disc space-y-2">
              <li>
                <b>Prasad dispatch:</b> Depends on temple schedule & courier. Perishable prasad
                can&rsquo;t be returned.
              </li>
              <li>
                <b>Return shipping (if requested):</b> Item must be unused and in original condition
                with all tags and invoice. Return transit risk remains with the sender until we
                receive it.
              </li>
            </ul>
          </SectionCard>
        </CardAnimate>

        {/* PARTIAL REFUNDS */}
        <CardAnimate className="mt-6">
          <SectionCard title="7) Partial Refunds & Fees">
            <p>
              If a service is partially performed (materials prepared, sankalpa taken, temple slot
              booked), a <b>pro-rata refund</b> may apply after deducting actual costs.
            </p>
          </SectionCard>
        </CardAnimate>

        {/* EXCEPTIONS */}
        <CardAnimate className="mt-6">
          <SectionCard title="8) Exceptions & Force Majeure">
            <p>
              If there&rsquo;s a <em>devālayam</em> closure, priest unavailability, natural calamity, or
              government restriction, we&rsquo;ll offer a <b>free reschedule</b> or <b>full refund</b> as
              applicable.
            </p>
          </SectionCard>
        </CardAnimate>

        {/* CHARGEBACKS */}
        <CardAnimate className="mt-6">
          <SectionCard title="9) Chargebacks">
            <p>
              If you initiate a chargeback while a refund is in progress, we&rsquo;ll respond to the
              payment gateway with order and communication logs. For fastest resolution, please
              contact us first.
            </p>
          </SectionCard>
        </CardAnimate>

        {/* CHANGES */}
        <CardAnimate className="mt-6">
          <SectionCard title="10) Policy Changes">
            <p>
              We may update this policy to reflect operational or legal needs. The version on our
              website governs. Material changes will be communicated on the site.
            </p>
          </SectionCard>
        </CardAnimate>

        {/* CONTACT + TIMELINE + FAQ */}
        <CardAnimate className="mt-6">
          <SectionCard title="Need Help?">
            <p>
              Write to{" "}
              <a
                href="mailto:support@vedicvaibhav.com"
                className="font-semibold text-emerald-800 underline-offset-2 hover:underline"
              >
                support@vedicvaibhav.com
              </a>
              . We&rsquo;re here to help.
            </p>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <TimelineTick label="Day 0" value="Request Received" />
              <TimelineTick label="Day 1–3" value="Verification & Approval" />
              <TimelineTick label="Up to Day 10" value="Refund Initiated → Reflected" />
            </div>
          </SectionCard>
        </CardAnimate>

        {/* FAQ */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="relative mt-4 rounded-2xl border border-[#ffb46a]/30 bg-white p-5 shadow-[0_10px_30px_rgba(255,122,26,0.08)]"
        >
          <CornerMotif />
          <h3 className="mb-2 text-xl font-extrabold text-[#cc5f10]">FAQs</h3>
          <div className="space-y-2">
            <FaqItem
              i={0}
              open={openFaq}
              toggle={toggleFaq}
              q="Can I change the gotra/name after booking?"
              a="Yes, up to 24 hours before the pūjā. After that, we'll try our best, but changes may not be possible if the sankalpa is already taken."
            />
            <FaqItem
              i={1}
              open={openFaq}
              toggle={toggleFaq}
              q="Will I get photos/videos of the pūjā?"
              a="If included in your package, we share digital files after the pūjā. If files are corrupted or not delivered, we will redeliver or refund the digital component."
            />
            <FaqItem
              i={2}
              open={openFaq}
              toggle={toggleFaq}
              q="Can someone else attend on my behalf?"
              a="Yes. Share their details at least 24 hours prior so we can include them in the sankalpa or entry permissions if applicable."
            />
            <FaqItem
              i={3}
              open={openFaq}
              toggle={toggleFaq}
              q="I missed the courier for prasad. What now?"
              a="Courier will attempt redelivery as per their policy. If returned to origin, we can reship non-perishables at additional shipping cost."
            />
          </div>
        </motion.section>

        {/* FOOTER */}
        <footer className="mt-8 border-t border-dotted border-stone-300 pt-4 text-center text-stone-600">
          <p>
            <b>Vedic Vaibhav</b> • In service of Dharma with transparency and care.
          </p>
          <p className="mt-1 text-xs">Last updated: 7 Sep 2026</p>
        </footer>
      </div>
    </div>
  );
};

/* --------------------------- Small UI Pieces -------------------------- */

const CardAnimate = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.section
    variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: "-80px" }}
    className={`relative rounded-2xl border border-[#ffb46a]/30 bg-white p-5 shadow-[0_10px_30px_rgba(255,122,26,0.08)] ${className}`}
  >
    <CornerMotif />
    {children}
  </motion.section>
);

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="mb-2 text-xl font-extrabold text-[#cc5f10]">{title}</h3>
    <div className="text-[0.98rem] leading-relaxed text-stone-800">{children}</div>
  </div>
);

const TimelineTick = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-dashed border-[#0f5132]/30 bg-gradient-to-b from-[#0f5132]/5 to-[#0f5132]/10 px-4 py-3 text-center">
    <span className="block text-xs font-medium text-[#0f5132]">{label}</span>
    <b className="mt-0.5 block text-sm">{value}</b>
  </div>
);

const FactCard = ({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: React.ReactNode;
}) => (
  <div className="grid grid-cols-[auto,1fr] items-center gap-x-3 gap-y-1 rounded-2xl border border-[#0f5132]/10 bg-white p-4 shadow-[0_8px_22px_rgba(0,0,0,0.06)]">
    <div className="grid h-11 w-11 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,165,0,0.2),rgba(255,165,0,0))] text-[#0f5132]">
      {icon}
    </div>
    <h4 className="m-0 text-base font-semibold text-[#0f5132]">{title}</h4>
    <p className="col-span-2 m-0 text-sm text-stone-700">{text}</p>
  </div>
);

/** Subtle Sanātani corner motif using utility-only styles (no global CSS) */
const CornerMotif = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 rounded-2xl"
    style={{
      background:
        "repeating-linear-gradient(90deg, rgba(255,165,0,0.18) 0, rgba(255,165,0,0.18) 6px, transparent 6px, transparent 12px)",
      mask:
        "radial-gradient(12px at 16px 16px, transparent 10px, #000 10.5px)",
      WebkitMask:
        "radial-gradient(12px at 16px 16px, transparent 10px, #000 10.5px)",
      opacity: 0.22,
    }}
  />
);

/* -------------------------------- Icons ------------------------------- */

const LotusIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
    <path d="M12 3c2 3 5 4 7 6-1 3-3 5-7 6-4-1-6-3-7-6 2-2 5-3 7-6zM5 12c1 3 3 5 7 6 4-1 6-3 7-6-1 5-5 8-7 9-2-1-6-4-7-9z"/>
  </svg>
);

const KalashIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
    <path d="M12 3l3 3-3 2-3-2 3-3zm0 6c5 0 8 3 8 7 0 4-3 5-8 5s-8-1-8-5c0-4 3-7 8-7z"/>
  </svg>
);

const SandalIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
    <path d="M3 14c5-2 9-2 18 0v2c-9-2-13-2-18 0v-2zM5 10c4-1 10-1 14 0l-1 2c-4-1-8-1-12 0L5 10z"/>
  </svg>
);

/* ------------------------------ FAQ Item ------------------------------ */

const FaqItem = ({
  i,
  open,
  toggle,
  q,
  a,
}: {
  i: number;
  open: number | null;
  toggle: (i: number) => void;
  q: string;
  a: string;
}) => (
  <div className="overflow-hidden rounded-xl border border-[#742f02]/15 bg-white">
    <button
      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left font-semibold text-stone-800 outline-none hover:bg-[#fff6ee] focus-visible:ring-2 focus-visible:ring-[#0f5132]"
      aria-expanded={open === i}
      aria-controls={`faq-panel-${i}`}
      onClick={() => toggle(i)}
    >
      <span>{q}</span>
      <span className={`transition-transform ${open === i ? "rotate-180" : ""}`} aria-hidden="true">
        ⌄
      </span>
    </button>
    <motion.div
      id={`faq-panel-${i}`}
      role="region"
      initial={false}
      animate={{ height: open === i ? "auto" : 0, opacity: open === i ? 1 : 0 }}
      className="px-4"
    >
      <div className="pb-4 pt-1 text-stone-700">{a}</div>
    </motion.div>
  </div>
);
