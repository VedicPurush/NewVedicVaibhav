"use client";

import "./Footer.css";
import I18nText from "@/components/shared/I18nText";
import React, { useState } from "react";
import Link from "next/link";
import WhatsApp from "@mui/icons-material/WhatsApp";
import Twitter from "@mui/icons-material/Twitter";
import Instagram from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { motion } from "framer-motion";
import FeaturedBanner from "./FeaturedBanner";

// ─── Detect device platform ───────────────────────────────────────────────────
const getDevicePlatform = (): "ios" | "android" | "other" => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || navigator.vendor || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
};

// ─── Services data ────────────────────────────────────────────────────────────
const services = [
  {
    name: "Vedic Vaibhav",
    logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vedicvaibhavlogo.png",
    web: "https://vedicvaibhav.com",
    ios: "https://apps.apple.com/in/app/vedicvaibhav/id6765667844",
    android: "https://play.google.com/store/apps/details?id=com.rahulrajput025.client",
  },
  {
    name: "Vedic Shop",
    logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vedicshoplogo.png.webp",
    web: "https://vedicshop.store",
    ios: "https://apps.apple.com/in/app/vedic-shop/id6766175387",
    android: "https://play.google.com/store/apps/details?id=com.nirmanyu.NewVedicShop",
  },
  {
    name: "Astro Vaibhav",
    logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/astrovaibhavlogo.png.webp",
    web: "https://astrovaibhav.com",
    ios: "https://play.google.com/store/apps/details?id=com.rahulrajput025.astro",
    android: "https://play.google.com/store/apps/details?id=com.rahulrajput025.astro",
  },
  {
    name: "Pandit Ji at Request",
    logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/panditjiatrequestlogo.png.webp",
    web: "https://panditjiatrequest.com",
    ios: "https://apps.apple.com/in/app/pandit-ji-at-request/id6762001802",
    android: "https://play.google.com/store/apps/details?id=com.panditJiAtReqapp",
  },
];

// ─── Social icons ─────────────────────────────────────────────────────────────
const socialIcons = [
  {
    icon: WhatsApp,
    href: "https://wa.me/919056955310?text=Hi%20I%20want%20to%20connect%20with%20Vedic%20Vaibhav%20team",
    color: "text-green-500",
  },
  {
    icon: Twitter,
    href: "https://x.com/Vedic_Vaibhav?t=h3_rWC2cMmRYZeNhziG-YA",
    color: "text-blue-500",
  },
  {
    icon: Instagram,
    href: "https://instagram.com/vedicvaibhav_/",
    color: "text-pink-500",
  },
  {
    icon: LinkedInIcon,
    href: "https://www.linkedin.com/company/vedic-vaibhav/posts/?feedView=all",
    color: "text-blue-700",
  },
];

// ─── Service Card (shared by desktop + mobile) ────────────────────────────────
interface ServiceCardProps {
  service: (typeof services)[0];
  compact?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, compact }) => {
  const platform = getDevicePlatform();
  const appLink = platform === "ios" ? service.ios : service.android;

  return (
    <motion.div
      className={`flex flex-col items-center gap-2 ${compact ? "px-1" : "px-2"}`}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320 }}
    >
      {/* Logo – no white bg, just the image */}
      <img
        loading="lazy"
        src={service.logo}
        alt={service.name}
        className={`object-contain drop-shadow-sm ${compact ? "h-16 w-auto" : "h-20 w-auto"}`}
      />

      {/* Service name */}
      <span
        className={`font-semibold text-gray-700 text-center leading-tight ${
          compact ? "text-[9px]" : "text-[11px]"
        }`}
      >
        {service.name}
      </span>

      {/* Action buttons */}
      <div className={`flex gap-1.5 flex-wrap justify-center ${compact ? "mt-0" : "mt-0.5"}`}>
        {/* Website button */}
        <a
          href={service.web}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1 rounded-full border border-orange-400 text-orange-600 font-medium hover:bg-orange-500 hover:text-white transition-all duration-200 ${
            compact ? "px-2 py-0.5 text-[8px]" : "px-2.5 py-0.5 text-[9px]"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={compact ? "w-2 h-2" : "w-2.5 h-2.5"}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m-9 9h18"
            />
          </svg>
          Website
        </a>

        {/* Smart App button */}
        <a
          href={appLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1 rounded-full bg-orange-500 text-white font-medium hover:bg-orange-600 transition-all duration-200 ${
            compact ? "px-2 py-0.5 text-[8px]" : "px-2.5 py-0.5 text-[9px]"
          }`}
        >
          {platform === "ios" ? (
            /* Apple icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={compact ? "w-2 h-2" : "w-2.5 h-2.5"}
              viewBox="0 0 814 1000"
              fill="currentColor"
            >
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.8 0 663.4 0 541.8c0-203.1 133.3-310.3 264.4-310.3 70.2 0 128.6 46.5 172.8 46.5 42.3 0 108.9-49 191.1-49 30.8 0 134.2 2.6 198.9 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
            </svg>
          ) : (
            /* Play Store icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={compact ? "w-2 h-2" : "w-2.5 h-2.5"}
              viewBox="0 0 512 512"
              fill="currentColor"
            >
              <path d="M48 28.9C32.2 20.1 16 30.6 16 48v416c0 17.4 16.2 27.9 32 19.1l416-208c15.1-7.5 15.1-30.7 0-38.2L48 28.9z" />
            </svg>
          )}
          App Link
        </a>
      </div>
    </motion.div>
  );
};

// ─── Main Footer Component ────────────────────────────────────────────────────
const Footer: React.FC = () => {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const handleToggle = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const recipientEmail = "support@vedicvaibhav.com";

  const openGmailCompose = () => {
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${recipientEmail}`, "_blank");
  };

  return (
    <>
      <FeaturedBanner />
      <motion.footer
        className="bg-gradient-to-b from-white to-orange-300 md:via-yellow-200 md:to-orange-300 text-gray-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* ── Desktop View ──────────────────────────────────────────────────── */}
        {/* Grid: logo(3) | quick-links(2) | support(2) | contact(2) | ecosystem(3) */}
        <div className="hidden md:grid grid-cols-12 gap-8 mx-[6%] py-12">
          {/* Logo + tagline */}
          <div className="col-span-3 flex flex-col items-center text-center justify-start pt-1 cursor-pointer">
            <img
              loading="lazy"
              src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png"
              alt="Logo"
              className="w-28 h-auto"
            />
            <p className="text-sm leading-relaxed mt-2">
              <I18nText text="FOOTER.welcome_message" />
            </p>
          </div>

          {/* Quick Links */}
          <div className="col-span-2 space-y-2">
            <h3 className="font-semibold text-lg">
              <I18nText text="FOOTER.Quick Links" />
            </h3>
            <Link href="/mandir" className="block text-sm hover:text-orange-500">
              Personalise Puja
            </Link>
            <Link href="/services/puja" className="block text-sm hover:text-orange-500">
              <I18nText text="FOOTER.Book Puja" />
            </Link>
            <Link href="/chadhava" className="block text-sm hover:text-orange-500">
              Book Chadhava
            </Link>
            <a
              href="https://vedicshop.store"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm hover:text-orange-500"
            >
              <I18nText text="FOOTER.Shop" />
            </a>
            <Link href="/blogs" className="block text-sm hover:text-orange-500">
              Vedic Pathshala
            </Link>
            <Link href="/sanatan-yatra" className="block text-sm hover:text-orange-500">
              Sanatan Yatra
            </Link>
          </div>

          {/* Support */}
          <div className="col-span-2 space-y-2">
            <h3 className="font-semibold text-lg">Support</h3>
            <Link href="/aboutus" className="block text-sm hover:text-orange-500">
              <I18nText text="FOOTER.About Us" />
            </Link>
            <Link href="/refundpolicy" className="block text-sm hover:text-orange-500">
              Return and Refund Policy
            </Link>
            <Link href="/cancellationpolicy" className="block text-sm hover:text-orange-500">
              Cancellation Policy
            </Link>
            <Link href="/shippingpolicy" className="block text-sm hover:text-orange-500">
              Shipping Policy
            </Link>
            <Link href="/privacypolicy" className="block text-sm hover:text-orange-500">
              Privacy Policy
            </Link>
            <Link href="/contactus" className="block text-sm hover:text-orange-500">
              <I18nText text="FOOTER.Contact Us" />
            </Link>
          </div>

          {/* Contact */}
          <div className="col-span-2 space-y-2">
            <h3 className="font-semibold text-lg">
              <I18nText text="FOOTER.Contact Us" />
            </h3>
            <p className="text-sm">+91 9872788769</p>
            <button onClick={openGmailCompose} className="text-sm hover:text-orange-500 text-left">
              support@vedicvaibhav.com
            </button>
            <address className="text-sm not-italic">
              1031, 10th floor, Tricity Trade Tower
              <br />
              Zirakpur-Patiala Heighway, Zirakpur, Punjab, 140603
            </address>
          </div>

          {/* ── Our Ecosystem – RIGHT COLUMN ─────────────────────────────────── */}
          <div className=" justify-center text-center col-span-3">
            <h3 className="font-semibold text-lg mb-4 text-gray-800">Our Ecosystem</h3>
            <div className="grid grid-cols-2 gap-x-2 gap-y-6">
              {services.map((service) => (
                <ServiceCard key={service.name} service={service} compact={false} />
              ))}
            </div>
          </div>
        </div>

        {/* Social Icons – Desktop */}
        <div className="flex justify-center space-x-6 py-4 md:flex hidden border-t border-orange-100 mx-[6%]">
          {socialIcons.map(({ icon: Icon, href, color }) => (
            <motion.a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${color} text-2xl`}
              whileHover={{ scale: 1.2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Icon fontSize="inherit" />
            </motion.a>
          ))}
        </div>

        {/* Bottom Links & Copyright – Desktop */}
        <div className="border-t border-black max-w-6xl mx-auto px-8 py-4 flex flex-col md:flex-row md:flex justify-between items-center md:block hidden">
          <div className="flex space-x-4">
            <Link href="/privacypolicy" className="text-sm hover:text-orange-500">
              <I18nText text="FOOTER.Privacy & Policy" />
            </Link>
            <Link href="/termsandconditions" className="text-sm hover:text-orange-500">
              <I18nText text="FOOTER.Terms & Conditions" />
            </Link>
          </div>
          <p className="text-xs mt-2 md:mt-0">
            © 2026 VEDICVAIBHAV DOT COM PRIVATE LIMITED. All rights reserved.
          </p>
        </div>

        {/* ── Mobile View ───────────────────────────────────────────────────── */}
        <div className="md:hidden px-4 pt-6 pb-2">
          {/* ── Our Ecosystem – MOBILE TOP ───────────────────────────────────── */}
          <div className="mb-6">
            <p className="text-center text-[15px] font-bold tracking-widest uppercase mb-4">
              Our Ecosystem
            </p>
            <div className="grid grid-cols-2 gap-4">
              {services.map((service) => (
                <div key={service.name} className="p-2 flex flex-col items-center gap-1.5">
                  <ServiceCard service={service} compact={true} />
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-orange-200 mb-3" />

          {/* Quick Links */}
          <div className="border-b mt-2 mb-2">
            <button
              onClick={() => handleToggle("quick")}
              className="w-full text-sm flex justify-between py-3 font-medium"
            >
              <I18nText text="FOOTER.Quick Links" />
              <span>{openSection === "quick" ? "-" : "+"}</span>
            </button>
            {openSection === "quick" && (
              <nav className="list-none pl-4 text-xs space-y-2 pb-3">
                <Link href="/mandir" className="block text-gray-600 no-underline">
                  Personalise Puja
                </Link>
                <Link href="/services/puja" className="block text-gray-600 no-underline">
                  <I18nText text="FOOTER.Book Puja" />
                </Link>
                <Link href="/chadhava" className="block text-gray-600 no-underline">
                  Book Chadhava
                </Link>
                <a
                  href="https://vedicshop.store"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-gray-600 no-underline"
                >
                  <I18nText text="FOOTER.Shop" />
                </a>
                <Link href="/blogs" className="block text-gray-600 no-underline">
                  Vedic Pathshala
                </Link>
                <Link href="/sanatan-yatra" className="block text-gray-600 no-underline">
                  Sanatan Yatra
                </Link>
              </nav>
            )}
          </div>

          {/* Support */}
          <div className="border-b mb-2">
            <button
              onClick={() => handleToggle("support")}
              className="w-full text-sm flex justify-between py-3 font-medium"
            >
              Support <span>{openSection === "support" ? "-" : "+"}</span>
            </button>
            {openSection === "support" && (
              <nav className="list-none pl-4 text-xs space-y-2 pb-3">
                <Link href="/aboutus" className="block text-gray-600 no-underline">
                  <I18nText text="FOOTER.About Us" />
                </Link>
                <Link href="/refundpolicy" className="block text-gray-600 no-underline">
                  Return and Refund Policy
                </Link>
                <Link href="/cancellationpolicy" className="block text-gray-600 no-underline">
                  Cancellation Policy
                </Link>
                <Link href="/shippingpolicy" className="block text-gray-600 no-underline">
                  Shipping Policy
                </Link>
                <Link href="/privacypolicy" className="block text-gray-600 no-underline">
                  Privacy Policy
                </Link>
                <Link href="/contactus" className="block text-gray-600 no-underline">
                  <I18nText text="FOOTER.Contact Us" />
                </Link>
              </nav>
            )}
          </div>

          {/* Contact */}
          <div className="border-b mb-2">
            <button
              onClick={() => handleToggle("contact")}
              className="w-full flex text-sm justify-between py-3 font-medium"
            >
              Contact <span>{openSection === "contact" ? "-" : "+"}</span>
            </button>
            {openSection === "contact" && (
              <div className="pl-2 text-xs space-y-3 pb-4">
                {/* Vedic Vaibhav logo + tagline inside Contact */}
                <div className="flex flex-col items-center space-y-2 py-2">
                  <img
                    loading="lazy"
                    src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png"
                    alt="Vedic Vaibhav Logo"
                    className="w-20 h-auto"
                  />
                  <p className="text-[10px] text-gray-500 text-center">
                    <I18nText text="FOOTER.welcome_message" />
                  </p>
                </div>
                <div className="border-t border-orange-100 pt-2 space-y-2">
                  <p className="text-gray-600">+91 94651 62590</p>
                  <button onClick={openGmailCompose} className="text-gray-600 no-underline">
                    support@vedicvaibhav.com
                  </button>
                  <address className="text-gray-600 not-italic">
                    1031, 10th floor, Tricity Trade Tower
                    <br />
                    Zirakpur-Patiala Heighway, Zirakpur, Punjab, 140603
                  </address>
                </div>
              </div>
            )}
          </div>

          {/* Social & Bottom */}
          <div className="pt-2 space-y-3">
            <div className="flex justify-center space-x-6">
              {socialIcons.map(({ icon: Icon, href, color }) => (
                <motion.a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener"
                  className={`${color} text-2xl`}
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Icon fontSize="inherit" />
                </motion.a>
              ))}
            </div>
            <div className="flex justify-center space-x-6">
              <Link href="/privacypolicy" className="text-gray-600 no-underline text-sm">
                <I18nText text="FOOTER.Privacy & Policy" />
              </Link>
              <Link href="/termsandconditions" className="text-gray-600 no-underline text-sm">
                <I18nText text="FOOTER.Terms & Conditions" />
              </Link>
            </div>
            <p className="text-center text-xs text-gray-600">
              © 2026 VEDICVAIBHAV DOT COM PRIVATE LIMITED.
            </p>
          </div>
        </div>

        <iframe
          id="Iframe1"
          src="https://dunsregistered.dnb.com/SealAuthentication.aspx?Cid=1"
          width="114px"
          height="97px"
          scrolling="no"
        ></iframe>
      </motion.footer>
    </>
  );
};

export default Footer;
