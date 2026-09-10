"use client";

// EcomPrivacyPolicy.tsx
// NOTE: This template is for general informational purposes only and is not legal advice.
// Please have a qualified attorney review and adapt it for your business and local laws.

import React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

const effectiveDate = "Feb 2, 2025";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.05, ease: "easeOut" },
  }),
};

const EcomPrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 text-stone-800 selection:bg-amber-200/60">
      {/* Top aura / “sanātani vibe” ribbon */}
      <div className="pointer-events-none h-1 w-full bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300" />

      <motion.div
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
      >
        {/* Card container */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-amber-200/70 bg-white shadow-[0_10px_40px_rgba(245,158,11,0.15)]"
        >
          {/* Header */}
          <div className="relative overflow-hidden rounded-t-2xl border-b border-amber-200/70 bg-gradient-to-b from-orange-50 to-white p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <img loading="lazy"  src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png" alt="" className="w-[16%] h-[16%] "  />
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Privacy Policy — Vedic Vaibhav <span className="text-amber-700">(Vedic Shop)</span>
                  </h1>
                  <p className="mt-1 text-sm text-stone-600">
                    Effective date: <span className="font-medium text-stone-700">{effectiveDate}</span> •
                    Applies to our website and mobile apps
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 px-4 py-2 text-sm font-semibold text-stone-900 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400/70"
                  onClick={() => window.print()}
                >
                  🖨️ Print / Save as PDF
                </motion.button>
                <motion.a
                  href="#your-rights"
                  whileHover={{ y: -2 }}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  🔒 Your Rights
                </motion.a>
                <motion.a
                  href="#contact"
                  whileHover={{ y: -2 }}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  📮 Contact
                </motion.a>
              </div>
            </div>

            <p className="mt-5 rounded-xl border border-amber-200/70 bg-amber-50/60 p-4 text-sm leading-relaxed text-stone-700">
              “Sanātana-inspired, modern privacy.” This policy explains how Vedic Vaibhav (operating
              the spiritual ecommerce store “Vedic Shop”) collects, uses, and protects your
              information on our website and mobile applications. If anything here seems unclear,
              please reach out using the contact details below.
            </p>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* TOC */}
            <motion.nav
              variants={fadeUp}
              custom={1}
              aria-label="Table of contents"
              className="rounded-xl border border-amber-200/70 bg-orange-50/50 p-4 sm:p-5"
              id="toc"
            >
              <h2 className="text-lg font-semibold">Contents</h2>
              <div className="my-3 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
              <ul className="grid list-disc grid-cols-1 gap-x-6 gap-y-2 pl-5 text-sm sm:grid-cols-2">
                {[
                  ["#scope", "1. Scope"],
                  ["#data-we-collect", "2. Data We Collect"],
                  ["#how-we-use", "3. How We Use Data"],
                  ["#legal-bases", "4. Legal Bases (where applicable)"],
                  ["#sharing", "5. Sharing & Disclosures"],
                  ["#cookies", "6. Cookies & Tracking"],
                  ["#mobile-permissions", "7. Mobile App Permissions"],
                  ["#payments", "8. Payments & UPI"],
                  ["#retention", "9. Data Retention"],
                  ["#security", "10. Security"],
                  ["#children", "11. Children’s Privacy"],
                  ["#xborder", "12. Cross-Border Transfers"],
                  ["#your-rights", "13. Your Rights & Choices"],
                  ["#changes", "14. Changes to this Policy"],
                  ["#contact", "15. Contact & Grievance Officer"],
                ].map(([href, label], i) => (
                  <motion.li key={href} variants={fadeUp} custom={i / 8}>
                    <a
                      href={href}
                      className="text-amber-700 underline-offset-2 hover:text-amber-800 hover:underline"
                    >
                      {label}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </motion.nav>

            {/* Sections */}
            <Section id="scope" title="1. Scope" index={2}>
              This Privacy Policy covers personal data processed by Vedic Vaibhav and our group entities,
              vendors, and service providers in connection with the Vedic Shop website and mobile
              applications (collectively, the “Services”). By using the Services, you agree to the
              practices described here.
            </Section>

            <Section id="data-we-collect" title="2. Data We Collect" index={3}>
              <p>We collect information in the following categories:</p>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>
                  <b>Account &amp; Contact:</b> name, email, phone number, billing/shipping address,
                  country.
                </li>
                <li>
                  <b>Order &amp; Support:</b> items purchased, order IDs, invoices, returns, support
                  chats/tickets, notes.
                </li>
                <li>
                  <b>Payments:</b> limited payment details from gateways (e.g., masked card, transaction
                  ID, status). We do not store full card or UPI PINs.
                </li>
                <li>
                  <b>Usage &amp; Device:</b> log data, IP, app version, browser type, device model, OS,
                  language, referring pages, crash logs, performance metrics.
                </li>
                <li>
                  <b>Preference Data:</b> wishlists, cart, recently viewed items, notification preferences,
                  spiritual categories of interest.
                </li>
                <li>
                  <b>Marketing &amp; Communications:</b> consents, unsubscribes, campaign interactions,
                  referral codes.
                </li>
                <li>
                  <b>Location (approx.):</b> general location from IP to estimate shipping, currency,
                  or app experience. Precise GPS is collected only if you enable it for specific features.
                </li>
                <li>
                  <b>User-Generated Content:</b> product reviews, Q&amp;A, photos you upload, ratings.
                </li>
              </ul>

              <Details title="Sources of data (direct, automatic, third-party)">
                <ul className="ml-5 list-disc space-y-1.5">
                  <li>
                    <b>Directly from you</b> when you create an account, place orders, contact support,
                    or submit reviews.
                  </li>
                  <li>
                    <b>Automatically</b> via cookies, SDKs, and similar technologies when you browse or
                    use the app.
                  </li>
                  <li>
                    <b>From partners</b> such as analytics, payment, shipping, identity/OTP providers,
                    and social sign-in (if used).
                  </li>
                </ul>
              </Details>
            </Section>

            <Section id="how-we-use" title="3. How We Use Data" index={4}>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>Provide, operate, and improve the Services and our spiritual ecommerce offerings.</li>
                <li>Process orders, payments, deliveries, returns, refunds, and warranties.</li>
                <li>Create and manage your account, wishlists, and cart sync across web and app.</li>
                <li>Personalize content (e.g., recommended puja items, idols, books) and measure performance.</li>
                <li>Send transactional messages (order confirmations, shipping updates, security alerts).</li>
                <li>
                  Send marketing communications (email/SMS/WhatsApp/push) where permitted; you can opt out
                  anytime.
                </li>
                <li>Prevent fraud, abuse, and enforce our Terms.</li>
                <li>Comply with legal obligations and respond to lawful requests.</li>
                <li>Conduct analytics, research, and product development (including A/B testing).</li>
              </ul>
            </Section>

            <Section id="legal-bases" title="4. Legal Bases (where applicable)" index={5}>
              Depending on your location, we may rely on one or more of the following legal grounds:
              <i> consent</i> (e.g., marketing, precise location), <i>contract</i> (to fulfill your orders),
              <i> legitimate interests</i> (to secure and improve the Services), and <i>legal obligations</i>{" "}
              (tax, accounting, KYC/AML where required).
            </Section>

            <Section id="sharing" title="5. Sharing & Disclosures" index={6}>
              <p>We share data only as needed, with appropriate safeguards, for example with:</p>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>
                  <b>Payment processors &amp; gateways</b> (e.g., card networks, UPI providers) to process
                  your payments.
                </li>
                <li>
                  <b>Logistics &amp; couriers</b> to deliver your orders and manage returns.
                </li>
                <li>
                  <b>Cloud &amp; IT providers</b> for hosting, storage, and security.
                </li>
                <li>
                  <b>Analytics &amp; measurement</b> to understand usage and improve the experience.
                </li>
                <li>
                  <b>Marketing &amp; communications</b> platforms for emails, SMS/WhatsApp, and push
                  notifications—only where permitted.
                </li>
                <li>
                  <b>Identity/verification &amp; OTP</b> providers for sign-in and fraud prevention.
                </li>
                <li>
                  <b>Professional advisers</b> (legal, tax, auditors) and as required by law or to protect
                  rights and safety.
                </li>
                <li>
                  <b>Business transfers</b> (e.g., merger, acquisition) where your data may be part of the
                  transaction with notice as required by law.
                </li>
              </ul>
              <p className="mt-2 font-medium text-stone-900">We do <span className="underline">not</span> sell your personal information.</p>
            </Section>

            <Section id="cookies" title="6. Cookies, SDKs & Similar Technologies" index={7}>
              We use cookies (web) and SDKs (mobile) for core functionality, remembering your preferences,
              analytics, and—where you consent—personalized offers. You can manage preferences via your
              browser settings, our cookie banner (web), and your device settings (mobile ads, push,
              location).
              <Details title="Categories we use">
                <ul className="ml-5 list-disc space-y-1.5">
                  <li>
                    <b>Strictly necessary</b> (authentication, cart, security).
                  </li>
                  <li>
                    <b>Preferences</b> (language, currency, shipping country).
                  </li>
                  <li>
                    <b>Analytics</b> (traffic, performance, crash reports).
                  </li>
                  <li>
                    <b>Marketing</b> (campaign attribution, push messaging, retargeting where permitted).
                  </li>
                </ul>
              </Details>
            </Section>

            <Section id="mobile-permissions" title="7. Mobile App Permissions" index={8}>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>
                  <b>Notifications:</b> to send order updates and offers (opt-in, can be turned off in OS
                  settings).
                </li>
                <li>
                  <b>Camera:</b> for QR/UPI scans or profile uploads (only when you choose to use the
                  feature).
                </li>
                <li>
                  <b>Photos/Media:</b> to upload review images or profile pics (optional).
                </li>
                <li>
                  <b>Location:</b> approximate for localized content; precise only if you grant permission.
                </li>
              </ul>
            </Section>

            <Section id="payments" title="8. Payments, UPI & Messaging" index={9}>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>
                  Payments are processed by compliant third-party providers. We receive limited payment
                  metadata (e.g., masked card, transaction status) and do not store full card numbers or
                  UPI PINs.
                </li>
                <li>
                  For UPI, we may redirect to your UPI app or present a QR—verification and authorization
                  occur within your chosen provider.
                </li>
                <li>
                  Transactional communications may be sent via email, SMS, WhatsApp, or push notifications.
                  Promotional messages are sent only with appropriate consent; you can opt out anytime.
                </li>
              </ul>
            </Section>

            <Section id="retention" title="9. Data Retention" index={10}>
              We keep personal data only as long as necessary for the purposes in this policy (e.g., for
              orders, taxes, and legal obligations), then delete or anonymize it. Retention periods may vary
              by data type and local law.
            </Section>

            <Section id="security" title="10. Security" index={11}>
              We employ administrative, technical, and physical safeguards designed to protect your data
              (access controls, encryption in transit, monitoring). No system is fully secure; please use
              strong, unique passwords and keep your account details confidential.
            </Section>

            <Section id="children" title="11. Children’s Privacy" index={12}>
              The Services are not directed to children under the age required by local law for online
              consent. If you believe a child provided us data, please contact us so we can take appropriate
              steps.
            </Section>

            <Section id="xborder" title="12. International & Cross-Border Transfers" index={13}>
              We may process and store data in countries other than your own. Where required, we implement
              safeguards for cross-border transfers (such as contractual protections).
            </Section>

            <Section id="your-rights" title="13. Your Rights & Choices" index={14}>
              <p>Depending on your location, you may have rights to:</p>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>Access, correct, or delete your personal data.</li>
                <li>
                  Object to or restrict certain processing, or withdraw consent where consent is the basis.
                </li>
                <li>Port your data to another service (where applicable).</li>
                <li>Opt out of marketing communications at any time.</li>
              </ul>
              <p className="mt-2">
                You can exercise many rights via account settings or by contacting us. We may need to verify
                your identity before fulfilling a request. If we cannot fulfill a request, we’ll explain why
                (unless prohibited by law).
              </p>
            </Section>

            <Section id="changes" title="14. Changes to this Policy" index={15}>
              We may update this Privacy Policy from time to time. We will post the updated version with a
              new “Effective date” and, where required, provide additional notice.
            </Section>

            <Section id="contact" title="15. Contact & Grievance Officer" index={16}>
              <p>
                If you have questions, requests, or complaints about this Privacy Policy or our data
                practices, please contact:
              </p>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>
                  <b>Vedic Vaibhav</b> (Vedic Shop)
                </li>
                <li>
                  Email:{" "}
                  <a
                    href="mailto:info@vedicvaibhav.com"
                    className="text-amber-700 underline-offset-2 hover:underline"
                  >
                    info@vedicvaibhav.com
                  </a>
                </li>
                <li>
                  Address: <i>1031, 10th floor , Tricity Trade Tower , Zirakpur-Patiala Heighway , Zirakpur ,Punjab , 140603</i>
                </li>
                <li>
                  Support:{" "}
                  <a
                    href="mailto:support@vedicvaibhav.example"
                    className="text-amber-700 underline-offset-2 hover:underline"
                  >
                    support@vedicvaibhav.com
                  </a>{" "}
                  • Phone: <i>+91-9872788769</i>
                </li>
              </ul>

              <Details title="Grievance Officer (India)">
                <p>In accordance with applicable Indian law, you may contact our Grievance Officer:</p>
                <ul className="ml-5 list-disc space-y-1.5">
                  <li>
                    Name: <i>Jatin Saini</i>
                  </li>
                  <li>
                    Email:{" "}
                    <a
                      href="mailto:grievance@vedicvaibhav.example"
                      className="text-amber-700 underline-offset-2 hover:underline"
                    >
                      jatinsaini@vedicvaibhav.com
                    </a>
                  </li>
                  <li>
                    Address: <i>1031, 10th floor , Tricity Trade Tower , Zirakpur-Patiala Heighway , Zirakpur ,Punjab , 140603</i>
                  </li>
                  <li>
                    Working hours: <i>Mon–Fri, 10:00–18:00 IST</i>
                  </li>
                </ul>
              </Details>
            </Section>
          </div>

          {/* Footer */}
          <div className="flex flex-col items-start gap-3 rounded-b-2xl border-t border-amber-200/70 bg-gradient-to-b from-white to-orange-50 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <Chip>🗓 Effective: {effectiveDate}</Chip>
            <Chip>🕉️ Modern Sanātani vibe</Chip>
            <Chip>🔐 We don’t sell your data</Chip>
          </div>
        </motion.div>
      </motion.div>

      {/* Back to top */}
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        title="Back to top"
        className="fixed bottom-16 right-5 inline-flex items-center justify-center rounded-full border border-amber-300 bg-white p-2 shadow-lg ring-1 ring-white/70 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-400/70"
      >
        ↑
      </motion.button>
    </div>
  );
};

/* ---------- Small UI helpers (Tailwind + Framer Motion) ---------- */

const Section: React.FC<{ id: string; title: string; index?: number; children: React.ReactNode }> = ({
  id,
  title,
  index = 0,
  children,
}) => (
  <motion.section
    id={id}
    variants={fadeUp}
    custom={index}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
    className="mt-6 rounded-xl border border-amber-200/70 bg-white p-5 shadow-sm"
  >
    <div className="flex items-center gap-2">
      <span className="inline-block h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
    <div className="my-3 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
    <div className="prose prose-stone max-w-none prose-a:text-amber-700 prose-a:underline-offset-2 hover:prose-a:underline">
      {children}
    </div>
  </motion.section>
);

const Details: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <motion.details
    initial={false}
    className="mt-1 overflow-hidden rounded-lg border border-amber-200/70  bg-orange-50/60 p-3"
  >
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-amber-800">
      <span>{title}</span>
      <motion.span
        initial={false}
        animate={{ rotate: 0 }}
        className="rounded-md border border-amber-200/70 bg-white px-2 py-1 text-xs text-stone-700"
      >
        ▾
      </motion.span>
    </summary>
    <div className="mt-3 text-sm leading-relaxed text-stone-800">{children}</div>
  </motion.details>
);

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.span
    whileHover={{ y: -1 }}
    className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1.5 text-xs font-medium text-stone-800"
  >
    {children}
  </motion.span>
);

export default EcomPrivacyPolicy;
