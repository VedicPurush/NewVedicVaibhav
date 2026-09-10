"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, type Variants } from "framer-motion";
import useMediaQuery from '@mui/material/useMediaQuery';
import "./BrandIntro.css";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

/* ================= IMAGE URL CONFIG ================= */
const IMG = {
  div1: {
    aarti: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div1-first-intro-image.webp",
    tree: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-1-tree-3-optimized.webp",
  },
  div2: {
    flag: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-2-flag-image-optimized.webp",
  },
  div3: {
    logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-3-vv-logo-optimized.webp",
    qr: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/My_QR_Code_1-1024.jpeg",
    googlePlay: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-3-google-play.webp",
  },
  div4: {
    apps: [
      {
        name: "Vedic Vaibhav",
        img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-4-app-1-optimized.webp",
        logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-3-vv-logo-optimized.webp",
      },
      {
        name: "Vedic Shop",
        img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-4-app-2-optimized.webp",
        logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/Group%2026086886-optimized.webp",
      },
      {
        name: "Pandit Ji at Request",
        img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-4-app-3-optimized.webp",
        logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/pandit%20ji%20at%20rerquest%201.webp",
      },
      {
        name: "Astro Vaibhav",
        img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-4-app-4-optimized.webp",
        logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/Black.webp",
      },
      {
        name: "Sanatan Yatra",
        img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-4-app-5-optimized.webp",
        logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/sanatan%20yatra%201.webp",
      },
      {
        name: "Vedic Pathshala",
        img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-4-app-6-optimized.webp",
        logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/vedic%20pathshala%201.webp",
      },
    ],
  },
  div5: {
    // Replace these with real URLs (same idea as other sections)
    testimonials: [
      {
        name: "Aman Kumar",
        location: "New Delhi, India",
        rating: 5,
        avatar: "https://vedic-vaibhav.blr1.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-5-person-1-optimized.webp",
        text:
          "Booking a Pandit for our Griha Pravesh was a breeze. The ritual was performed with such precision and spiritual depth. It truly felt like bringing divine blessings into our new home.",
      },
      {
        name: "Anita",
        location: "Nagpur, India",
        rating: 5,
        avatar: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/GIRL-2.webp",
        text:
          "A premium spiritual experience — booking, guidance, and rituals feel simple, secure, and authentic. The journey is smooth and the support is fast.",
      },
      {
        name: "Rahul Verma",
        location: "Mumbai, India",
        rating: 5,
        avatar: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/MEN-3.webp",

        text:
          "The Astro Vaibhav analysis was incredibly insightful. It combined ancient Vedic knowledge with modern clarity. This platform is perfect for anyone seeking authentic spiritual guidance.",
      },
    ],
  },

  div7: {
    heading: "Why People love us",
    reviews: [
      {
        id: "r1",
        name: "Sandeep Gupta",
        location: "Chandigarh",
        rating: 5,
        date: "12/12/2025",
        avatar: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/MEN-1.webp",
        text:
          "The Sanatan Yatra pilgrimage was perfectly organized. Every detail was handled with care, allowing us to focus entirely on our spiritual journey.",
        size: "tall",
      },
      {
        id: "r2",
        name: "Meena Sharma",
        location: "Pune",
        rating: 5,
        date: "15/12/2025",
        avatar: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/GIRL-1.webp",
        text: "The Chadhava Prasad arrived so fresh and well-packed. Truly satisfied!",
        size: "small",
      },
      {
        id: "r3",
        name: "Rajesh Iyer",
        location: "Chennai",
        rating: 5,
        date: "20/12/2025",
        avatar: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/MEN-2.webp",
        text:
          "Finally found a place for authentic Samagri. The Vedic Shop quality is unmatched. I recommend it to all my friends and family.",
        size: "medium",
      },
      {
        id: "r4",
        name: "Vikram Singh",
        location: "Indore",
        rating: 5,
        date: "22/12/2025",
        avatar: " https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/MEN-7.webp",
        text:
          "Our community's Bhandara Seva was organized seamlessly through Vedic Vaibhav. The coordination was professional and the sentiment was truly dharmic.",
        size: "tall",
      },
      {
        id: "r5",
        name: "Anita Deshmukh",
        location: "Nagpur",
        rating: 5,
        date: "24/12/2025",
        avatar: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/GIRL-2.webp",
        text: "The Pandit ji was very knowledgeable and patient during the Hawan.",
        size: "small",
      },
      {
        id: "r6",
        name: "Karan Malhotra",
        location: "Ludhiana",
        rating: 5,
        date: "26/12/2025",
        avatar: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/MEN-4.webp",
        text:
          "Astro Vaibhav's AI-driven insights gave me a very clear direction. It respects the tradition while being so convenient to use.",
        size: "medium",
      },
      {
        id: "r7",
        name: "Priya Sharma",
        location: "Jaipur",
        rating: 5,
        date: "28/12/2025",
        avatar: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/GIRL-3.webp",
        text: "Wonderful app for everyday spiritual rituals. Very easy to navigate.",
        size: "small",
      },
      {
        id: "r8",
        name: "Prakash Jha",
        location: "Patna",
        rating: 5,
        date: "30/12/2025",
        avatar: "https://vedic-vaibhav.blr1.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-5-images-optimized.webp",
        text: "Trusted platform for authentic Sanatan services. Pure and reliable.",
        size: "small",
      },
      {
        id: "r9",
        name: "Dinesh Trivedi",
        location: "Ahmedabad",
        rating: 5,
        date: "02/01/2026",
        avatar: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/MEN-8.webp",
        text:
          "Vedic Vaibhav is a blessing for those of us living far from our roots. It brings the essence of Sanatana Dharma to our doorsteps through technology. Total commitment and transparency in every service.",
        size: "wide",
      },
      {
        id: "r10",
        name: "Rahul Verma",
        location: "Mumbai",
        rating: 5,
        date: "05/01/2026",
        avatar: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/MEN-3.webp",
        text: "The best experience with Chadhava bookings and Prasad delivery!",
        size: "small",
      },
    ],
  },
};

type TabKey = "mission" | "vision";

const BrandIntro: React.FC = () => {
  /* ---------------- DIV 1 refs/motion ---------------- */
  const ref = useRef<HTMLDivElement>(null);

  // Mouse based 3D tilt (DIV 1)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const smoothX = useSpring(x, { stiffness: 180, damping: 20 });
  const smoothY = useSpring(y, { stiffness: 180, damping: 20 });

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-12, 12]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;

    x.set(px);
    y.set(py);
  };

  /* ---------------- DIV 2 state + motion ---------------- */
  const [activeTab, setActiveTab] = useState<TabKey>("mission");

  const tabContent = useMemo(
    () => ({
      mission: {
        title: "Our Mission",
        body:
          "Our mission is to bridge the gap between ancient spiritual heritage and the modern world through innovative technology. We are dedicated to reviving the Vedic Shiksha Pranali, digitizing the experience of sacred pilgrimages, and creating a global ecosystem where every Sanatan devotee can access authentic guidance and pure spiritual products with absolute trust, transparency, and ease.",
        bullets: [
          "Reviving Vedic Shiksha Pranali through modern Ed-Tech solutions for the next generation.",
          "Digitizing ancient shrines to provide global accessibility for Bhog, Bhandara, and Rituals.",
          "Establishing a verified global network of Brahmans, Astrologers, and spiritual experts.",
          "Enabling last-mile reach of authentic spiritual products through a robust global supply chain.",
          "Empowering the Brahman community with technology and sustainable socioeconomic growth.",
          "Preserving the sanctity of Sanatan traditions while embracing future-ready digital platforms.",
          "Ensuring 100% commitment to the religious sentiments and aastha of every global devotee.",
          "Creating a transparent spiritual economy that rewards authenticity and excellence.",
        ],
      },
      vision: {
        title: "Our Vision",
        body:
          "To become the world's premier digital gateway for Sanatana Dharma, uniting a global family of seekers under the core philosophy of 'वेद वैभव वन्दे शाश्वतम् सनातनम्'. We envision a future where spiritual growth is effortless, ritual accuracy is guaranteed, and the timeless essence of Vedic culture is accessible to every soul on Earth.",
        bullets: [
          "One Dharma: Protecting and propagating the timeless values and wisdom of Sanatana.",
          "One Network: A unified, high-tech platform catering to every spiritual and ritualistic need.",
          "Creating a peaceful and premium 'Digital Temple' experience accessible from any home.",
          "Bridging ancient Vedic wisdom with modern AI and data-driven spiritual guidance.",
          "Building the world's most trusted and sustainable ecosystem for spiritual commerce.",
          "Cultivating a global community where tradition and innovation flourish together.",
          "Ensuring the light of Vedic Vaibhav reaches every home to inspire a spiritual renaissance.",
        ],
      },
    }),
    []
  );

  // Separate 3D tilt for DIV 2 panel
  const isMobile = useMediaQuery("(max-width:768px)");

  const ref2 = useRef<HTMLDivElement>(null);
  const x2 = useMotionValue(0);
  const y2 = useMotionValue(0);
  const sx2 = useSpring(x2, { stiffness: 190, damping: 22 });
  const sy2 = useSpring(y2, { stiffness: 190, damping: 22 });
  const rX2 = useTransform(sy2, [-0.5, 0.5], [isMobile ? 0 : 10, isMobile ? 0 : -10]);
  const rY2 = useTransform(sx2, [-0.5, 0.5], [isMobile ? 0 : -10, isMobile ? 0 : 10]);
  const glowX2 = useTransform(sx2, [-0.5, 0.5], [30, -30]);
  const glowY2 = useTransform(sy2, [-0.5, 0.5], [30, -30]);

  const handleMouseMove2 = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref2.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    x2.set(px);
    y2.set(py);
  };

  /* ---------------- DIV 4 : apps grid (scroll reveal) ---------------- */
  const vv4Container = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.14, delayChildren: 0.05 },
    },
  };

  const vv4Item: Variants = {
    hidden: { opacity: 0, y: 40, scale: 0.96, filter: "blur(6px)" },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 180, damping: 18 },
    },
  };


  /* ---------------- DIV 5 : Testimonials (3D carousel) ---------------- */
  const [vv5Index, setVv5Index] = useState(0);
  const [vv5Dir, setVv5Dir] = useState<1 | -1>(1);

  const vv5Testimonials = IMG.div5.testimonials;

  const vv5Next = () => {
    setVv5Dir(1);
    setVv5Index((p: number) => (p + 1) % vv5Testimonials.length);
  };

  const vv5Prev = () => {
    setVv5Dir(-1);
    setVv5Index((p: number) => (p - 1 + vv5Testimonials.length) % vv5Testimonials.length);
  };

  const vv5PrevIndex =
    (vv5Index - 1 + vv5Testimonials.length) % vv5Testimonials.length;
  const vv5NextIndex2 = (vv5Index + 1) % vv5Testimonials.length;

  type Vv5Pos = "left" | "center" | "right";

  const vv5CardVariants: Variants = {
    enter: ({ dir }: { pos: Vv5Pos; dir: 1 | -1 }) => {
      const fromX = dir === 1 ? 340 : -340;
      return {
        opacity: 0,
        x: fromX,
        y: 14,
        z: -320,
        rotateY: dir === 1 ? -44 : 44,
        scale: 0.88,
        filter: "blur(12px)",
        zIndex: 0,
      };
    },

    left: {
      opacity: 0.62,
      x: -260,
      y: 16,
      z: -200,
      rotateY: 28,
      scale: 0.92,
      filter: "blur(2px)",
      transition: { type: "spring", stiffness: 220, damping: 24 },
      zIndex: 1,
    },

    center: {
      opacity: 1,
      x: 0,
      y: 0,
      z: 0,
      rotateY: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 240, damping: 22 },
      zIndex: 3,
    },

    right: {
      opacity: 0.62,
      x: 260,
      y: 16,
      z: -200,
      rotateY: -28,
      scale: 0.92,
      filter: "blur(2px)",
      transition: { type: "spring", stiffness: 220, damping: 24 },
      zIndex: 1,
    },

    exit: ({ dir }: { pos: Vv5Pos; dir: 1 | -1 }) => {
      const toX = dir === 1 ? -380 : 380;
      return {
        opacity: 0,
        x: toX,
        y: 18,
        z: -360,
        rotateY: dir === 1 ? 46 : -46,
        scale: 0.86,
        filter: "blur(14px)",
        transition: { duration: 0.28, ease: "easeOut" },
        zIndex: 0,
      };
    },
  };

  const vv5Visible = [
    { idx: vv5PrevIndex, pos: "left" as const },
    { idx: vv5Index, pos: "center" as const },
    { idx: vv5NextIndex2, pos: "right" as const },
  ];

  const vv5Stars = (rating: number) => {
    const full = Math.max(0, Math.min(5, Math.round(rating)));
    return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  };

  const vv7Stars = (rating: number) => {
    const full = Math.max(0, Math.min(5, Math.round(rating)));
    return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  };


  return (
    <>
      <Navbar />
      {/* ===================== DIV 1 ===================== */}
      <section className="vv-section  mt-20 pt-[20%] md:pt-[10%]">
        <motion.div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            x.set(0);
            y.set(0);
          }}
          style={{ rotateX, rotateY }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="vv-grid">
            {/* LEFT IMAGE */}
            <motion.div
              className="vv-left"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <img loading="lazy" 
                src={IMG.div1.aarti}
                alt="Aarti"
                className="vv-left-img"
               />
            </motion.div>

            {/* RIGHT CONTENT */}
            <motion.div
              className="vv-right"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="vv-title">Vedic Vaibhav</h1>
              <p className="vv-subtitle">धर्मो रक्षति रक्षितः | वेद वैभव वन्दे शाश्वतम् सनातनम्</p>

              <motion.div
                className="vv-tree-wrapper"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <img loading="lazy" 
                  src={IMG.div1.tree}
                  alt="Tree"
                  className="vv-tree"
                 />
                <span className="vv-tree-glow" />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>





      {/* ===================== DIV 2 ===================== */}
      <section className="vv2-section">
        <div className="vv2-wrap">
          {/* Tabs */}
          <div className="vv2-tabs" role="tablist" aria-label="Mission and Vision">
            <button
              type="button"
              className={"vv2-tab " + (activeTab === "mission" ? "isActive" : "")}
              role="tab"
              aria-selected={activeTab === "mission"}
              onClick={() => setActiveTab("mission")}
            >
              <span className="vv2-ic">◎</span>
              Our Mission
              {activeTab === "mission" && (
                <motion.span
                  layoutId="vv2-pill"
                  className="vv2-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
            </button>

            <button
              type="button"
              className={"vv2-tab " + (activeTab === "vision" ? "isActive" : "")}
              role="tab"
              aria-selected={activeTab === "vision"}
              onClick={() => setActiveTab("vision")}
            >
              <span className="vv2-ic">👁</span>
              Our Vision
              {activeTab === "vision" && (
                <motion.span
                  layoutId="vv2-pill"
                  className="vv2-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
            </button>
          </div>

          {/* Panel */}
          <motion.div
            ref={ref2}
            className="vv2-panel"
            onMouseMove={handleMouseMove2}
            onMouseLeave={() => {
              x2.set(0);
              y2.set(0);
            }}
            style={{ rotateX: rX2, rotateY: rY2 }}
          >
            <div className="vv2-border" aria-hidden />
            <motion.div
              className="vv2-glow"
              aria-hidden
              style={{ x: glowX2, y: glowY2 }}
            />

            {/* Flag image bottom-left */}
            <motion.img
              className="vv2-flag"
              src={IMG.div2.flag}
              alt="Flag"
              aria-hidden
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="vv2-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <p className="vv2-body">{tabContent[activeTab].body}</p>

                  <div className="vv2-bullets">
                    {tabContent[activeTab].bullets.map((b: string) => (
                      <motion.div
                        key={b}
                        className="vv2-bullet"
                        whileHover={{ y: -3 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      >
                        <span className="vv2-dot" />
                        <span>{b}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================== DIV 3 ===================== */}
      <section className="vv3-section">
        <div className="vv3-wrap">
          <motion.h2
            className="vv3-title"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            Our Services
          </motion.h2>

          <div className="vv3-timeline" aria-hidden>
            <div className="vv3-line" />
          </div>

          <div className="vv3-items">
            {[
              {
                title: "Vedic Vaibhav",
                text: "A platform to offer personalized pooja, prasad, brahman bhog & bhandara in all famous Sanatan shrines across the globe.",
                bullets: ["Personalized Pooja", "Prasad Delivery", "Brahman Bhog", "Bhandara Seva"],
                qr: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/VEDIC%20VAIBHAV%20APPLICATION%20QR%20CODE.webp",
                logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-3-vv-logo-optimized.webp",
                link: "https://play.google.com/store/apps/details?id=com.rahulrajput025.client"
              },
              {
                title: "Vedic Shop",
                text: "An e-commerce platform for all categories of spiritual products related to Sanatan ensuring last mile doorstep delivery.",
                bullets: ["Authentic Products", "Quality Assurance", "Doorstep Delivery", "Spiritual Essentials"],
                qr: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/VEDIC%20SHOP%20APP%20QR%20CODE.webp",
                logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/Group%2026086886-optimized.webp",
                link: "https://play.google.com/store/apps/details?id=com.nirmanyu.NewVedicShop"
              },
              {
                title: "Astro Vaibhav",
                text: "A platform to access advanced algo driven astrology and numerology services with integration of AI.",
                bullets: ["Advanced Algorithms", "AI Analysis", "Personalized Guidance", "Verified Astrologers"],
                qr: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/ASTRO%20VAIBHAV%20WEBSITE.webp",
                logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/Black.webp",
                link: "https://vedicvaibhav.com/astrology"
              },
              {
                title: "Pandit ji At Request",
                text: "A platform to book pandit ji online for various sanskars and rituals, poojas and hawans.",
                bullets: ["Online Booking", "Verified Pandits", "Home & Office Rituals", "Hawan & Poojas"],
                qr: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/PANDIT%20JI%20AT%20REQUEST%20APP.webp",
                logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/pandit%20ji%20at%20rerquest%201.webp",
                link: "https://play.google.com/store/apps/details?id=com.panditJiAtReqapp"
              },
              {
                title: "Vedic Pathshala",
                text: "An ed-technology solution for spreading Vedic education across the globe - spreading Vedic Shiksha Pranali through tech.",
                bullets: ["Spreading Vedic Education", "Traditional Shiksha", "Modern Delivery", "Global Accessibility"],
                qr: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/SANATAN%20YATRA.webp",
                logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/vedic%20pathshala%201.webp",
                link: "https://vedicvaibhav.com/"
              },
              {
                title: "Sanatan Yatra",
                text: "A travel platform focusing on spiritual journeys to connect with Sanatan roots.",
                bullets: ["Spiritual Journeys", "Holy Pilgrimages", "Deep Connections", "Sanatan Heritage"],
                qr: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/SANATAN%20YATRA.webp",
                logo: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/sanatan%20yatra%201.webp",
                link: "https://vedicvaibhav.com/"
              }
            ].map((item, idx) => {
              const isLeft = idx % 2 !== 0;
              const fromX = isLeft ? -120 : 120;
              return (
                <div
                  key={idx}
                  className={
                    "vv3-row " + (isLeft ? "isLeft" : "isRight")
                  }
                >
                  {/* Center node */}
                  <motion.div
                    className="vv3-node"
                    initial={{ scale: 0.7, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.55 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <img loading="lazy" 
                      className="vv3-nodeLogo"
                      src={item.logo}
                      alt=""
                      aria-hidden
                     />
                  </motion.div>

                  {/* Pop card */}
                  <motion.div
                    className="vv3-pop"
                    initial={{
                      opacity: 0,
                      x: fromX,
                      y: 14,
                      filter: "blur(6px)",
                    }}
                    whileInView={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true, amount: 0.45 }}
                    transition={{ type: "spring", stiffness: 140, damping: 18 }}
                  >
                    <div className="vv3-logoChip" aria-hidden>
                      <img loading="lazy"  src={item.logo} alt=""  />
                    </div>

                    <h3 className="vv3-itemTitle">{item.title}</h3>
                    <p className="vv3-text">{item.text}</p>

                    <div className="vv3-bullets">
                      {item.bullets.map((b) => (
                        <div key={b} className="vv3-b">
                          <span className="vv3-dot" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>

                    {/* Attached QR card */}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vv3-qrLink"
                    >
                      <motion.div
                        className="vv3-qr"
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.55 }}
                        transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="vv3-qrLeft">
                          <img
                            className="vv3-qrImg"
                            src={item.qr}
                            alt="QR"
                            loading="lazy"
                          />
                        </div>
                        <div className="vv3-qrRight">
                          <div className="vv3-qrTitle">
                            <span className="vv3-qrTitleBold">SCAN</span>
                            <span className="vv3-qrTitleLight"> the QR code</span>
                          </div>
                          <div className="vv3-qrSub">&amp; Download the App Now</div>
                          <img
                            className="vv3-store"
                            src={IMG.div3.googlePlay}
                            alt="Google Play"
                            loading="lazy"
                          />
                        </div>
                        <div className="vv3-qrArt" aria-hidden />
                      </motion.div>
                    </a>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* watermark */}
          <div className="vv3-watermark" aria-hidden>
            ॐ
          </div>
        </div>
      </section>


      {/* ===================== DIV 4 ===================== */}
      <section className="vv4-section">
        <div className="vv4-wrap">
          <motion.h2
            className="vv4-title"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            Our Apps
          </motion.h2>

          <motion.div
            className="vv4-grid"
            variants={vv4Container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
          >
            {IMG.div4.apps.map((app) => (
              <motion.div
                key={app.name}
                className="vv4-card"
                variants={vv4Item}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}
              >
                <img
                  className="vv4-img"
                  src={app.img}
                  alt={app.name}
                  loading="lazy"
                />
                {app.logo && (
                  <img
                    className="vv4-logo"
                    src={app.logo}
                    alt={`${app.name} logo`}
                    loading="lazy"
                    style={{ width: "100px", height: "60px", objectFit: "contain" }}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>


      {/* ===================== DIV 5 ===================== */}
      <section className="vv5-section">
        <div className="vv5-wrap">
          <motion.div
            className="vv5-pill"
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            TESTIMONIALS
          </motion.div>

          <motion.h2
            className="vv5-title"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            What Our Community Says
          </motion.h2>

          <motion.p
            className="vv5-sub"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
          >
            Discover how Vedic wisdom has transformed lives across our community
          </motion.p>

          <div className="vv5-stage">
            <div className="vv5-sideGlow vv5-leftGlow" aria-hidden />
            <div className="vv5-sideGlow vv5-rightGlow" aria-hidden />

            <button type="button" className="vv5-arrow vv5-left" onClick={vv5Prev} aria-label="Previous testimonial">
              ‹
            </button>

            <button type="button" className="vv5-arrow vv5-right" onClick={vv5Next} aria-label="Next testimonial">
              ›
            </button>

            <div className="vv5-cardWrap" style={{ perspective: 1400 }}>
              <div className="vv5-stack" aria-live="polite">
                <AnimatePresence initial={false}>
                  {vv5Visible.map(({ idx, pos }) => {
                    const t = vv5Testimonials[idx];
                    const isCenter = pos === "center";

                    return (
                      <motion.div
                        key={idx}
                        className={"vv5-slot " + (isCenter ? "isCenter" : "isBack")}
                        custom={{ pos, dir: vv5Dir }}
                        variants={vv5CardVariants}
                        initial="enter"
                        animate={pos}
                        exit="exit"
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        <div className="vv5-card">
                          <div className="vv5-cardInner">
                            <div className="vv5-imgCol">
                              <img
                                className="vv5-avatar"
                                src={t.avatar}
                                alt={t.name}
                                loading="lazy"
                              />
                            </div>

                            <div className="vv5-textCol">
                              <div className="vv5-quoteMark" aria-hidden>
                                ”
                              </div>

                              <div className="vv5-stars" aria-label={`${t.rating} out of 5 stars`}>
                                {vv5Stars(t.rating)}
                              </div>

                              <div className="vv5-text">“{t.text}”</div>

                              <div className="vv5-name">{t.name}</div>
                              <div className="vv5-loc">{t.location}</div>

                              <div className="vv5-om" aria-hidden>
                                ॐ
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            <div className="vv5-dots" role="tablist" aria-label="Testimonials">
              {vv5Testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={"vv5-dot " + (i === vv5Index ? "isActive" : "")}
                  aria-label={`Go to testimonial ${i + 1}`}
                  aria-selected={i === vv5Index}
                  onClick={() => {
                    setVv5Dir(i > vv5Index ? 1 : -1);
                    setVv5Index(i);
                  }}
                />
              ))}
            </div>
          </div>

          <div className="vv5-rings" aria-hidden />
          <div className="vv5-flagMark" aria-hidden />
          <div className="vv5-omTop" aria-hidden>ॐ</div>
        </div>
      </section>


      {/*  in this do not limit the number of single chadhava as i can see it has showing only 4 single and one combo make it flexible so that more  */}
      {/* ===================== DIV 7 ===================== */}
      <section className="vv7-section">
        <div className="vv7-wrap">
          <motion.h2
            className="vv7-title"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {IMG.div7.heading}
          </motion.h2>

          <motion.div
            className="vv7-grid"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
            }}
          >
            {IMG.div7.reviews.map((r) => (
              <motion.article
                key={r.id}
                className={"vv7-card vv7-" + r.size}
                variants={{
                  hidden: { opacity: 0, y: 26, scale: 0.98, filter: "blur(6px)" },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)",
                    transition: { type: "spring", stiffness: 180, damping: 18 },
                  },
                }}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
              >
                <div className="vv7-top">
                  <div className="vv7-stars" aria-label={`${r.rating} out of 5 stars`}>
                    {vv7Stars(r.rating)}
                  </div>
                  <div className="vv7-date">{r.date}</div>
                </div>

                <p className="vv7-text">{r.text}</p>

                <div className="vv7-bottom">
                  <img className="vv7-avatar" src={r.avatar} alt={r.name} loading="lazy" />
                  <div className="vv7-meta">
                    <div className="vv7-name">{r.name}</div>
                    <div className="vv7-loc">{r.location}</div>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default BrandIntro;
