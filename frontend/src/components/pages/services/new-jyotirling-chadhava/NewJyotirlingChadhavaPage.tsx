"use client";

// NewJyotirlingChadhavaPage.tsx
import { useState, useMemo, useEffect } from "react";
import { useMoney, toInr } from "@/lib/currency";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveNavState } from "@/lib/nav-state";
import Layout from "@/components/layout/Layout";
import "./NewJyotirlingChadhavaPage.css";
import { gtag } from "@/lib/gtag";

// --- Meta Pixel safe tracker (queues until fbq is ready) ---
const isFbq = (fn: unknown): fn is (...args: any[]) => void =>
  typeof fn === 'function';

const fbqTrack = (event: string, params?: Record<string, any>) => {
  if (typeof window === 'undefined') return;

  const fbq = (window as any).fbq;
  if (isFbq(fbq)) {
    try {
      fbq('track', event, params || {});
    } catch (e) {
      console.warn('fbq track failed', e);
    }
    return;
  }

  const win = window as any;
  win._fbqQueue = win._fbqQueue || [];
  win._fbqQueue.push({ event, params });

  if (!win._fbqInterval) {
    win._fbqInterval = window.setInterval(() => {
      const fbq = (window as any).fbq;
      if (isFbq(fbq)) {
        const q = win._fbqQueue || [];
        q.forEach((e: any) => {
          try {
            fbq('track', e.event, e.params || {});
          } catch (err: any) {
            console.warn('fbq queued track failed', err);
          }
        });
        win._fbqQueue = [];
        window.clearInterval(win._fbqInterval);
        win._fbqInterval = 0;
      }
    }, 400);
  }
};

// 12 Jyotirlingas Data
interface Jyotirlinga {
  id: string;
  nameEnglish: string;
  location: string;
  defaultMonth: number; // 0-11
  defaultDate: number;
  image?: { location?: string } | null;
}

// Chadhava Seva Offerings Data
interface Offering {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  discountedPrice?: number;
  image?: { location?: string } | null;
  badge?: string;
}

const PageContent = () => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const router = useRouter();

  // Dynamic Data States
  const [jyotirlingasData, setJyotirlingasData] = useState<Jyotirlinga[]>([]);
  const [offeringsData, setOfferingsData] = useState<Offering[]>([]);
  const [bannerData, setBannerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stepper state (1 or 2)
  const [activeStep, setActiveStep] = useState(1);


  // Selected Jyotirlingas in LIFO order
  const [selectedJyotirlingIds, setSelectedJyotirlingIds] = useState<string[]>([]);

  // Selected Offerings
  const [selectedOfferings, setSelectedOfferings] = useState<string[]>([]);

  // FAQ accordion state
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I know the Puja actually happened? (Is it real?)",
      a: "We believe in complete transparency. Every month, you will receive real photo and video proof of your Chadhava with your name and gotra read aloud by the pandit at the temple, sent directly to your WhatsApp."
    },
    {
      q: "Can I book the seva for my family or parents?",
      a: "Yes, most devotees choose to book this sacred journey for their parents or family members. You can add family names to the booking so that sankalp is performed for your entire family."
    },
    {
      q: "What happens if I don't know my Gotra?",
      a: "If you do not know your Gotra, the scriptures state that the default 'Kashyap' gotra can be used for the sankalp. The puja will be fully authentic and complete."
    },
    {
      q: "What is included in the Monthly Prasad box?",
      a: "The prasad box includes sacred dry fruits, Mishri, Bhasma (blessed ashes), holy threads, and a certificate of seva from the temple."
    },
    {
      q: "How does the 12-month scheduling work?",
      a: "Each month, your offering will be taken to a different Jyotirlinga temple (e.g. Month 1 - Omkareshwar, Month 2 - Mallikarjuna, Ujjain Mahakal, Kashi Vishwanath, etc.) on auspicious dates. We notify you 2 days prior to each puja."
    }
  ];

  // Prasad add-on state
  const [showPrasadPopup, setShowPrasadPopup] = useState(false);
  const [prasadSelected, setPrasadSelected] = useState(true);

  const prasad = {
    name: "Sacred Jyotirlinga Prasad Box",
    price: 298,
    image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/Pandit%20ji%20at%20request/prasadbox.webp",
    desc: "Assorted satvik prasad blessed at the Jyotirlinga temples, including dry fruits, Mishri, Bhasma, and sacred threads."
  };

  // Infinite Loop Scheduling Logic
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Data from DB
  useEffect(() => {
    const fetchJyotirlingData = async () => {
      try {
        const response = await api.get("/api/jyotirling-chadhava/data");
        if (response.data.success && response.data.data) {
          const config = response.data.data;
          setJyotirlingasData(config.jyotirlingTemples || []);
          setOfferingsData(config.chadhavaOfferings || []);
          setBannerData({
            topBannerImage: config.topBannerImage,
            bottomBannerImage: config.bottomBannerImage,
            bannerTitle: config.bannerTitle,
            bannerSubtitle: config.bannerSubtitle,
          });

          // Track ViewContent on load when config is fetched
          fbqTrack("ViewContent", {
            content_ids: [config._id || "jyotirling_chadhava"],
            content_name: config.bannerTitle || "12 Jyotirlinga Darshan & Chadhava",
            content_category: "Jyotirlinga Chadhava",
            content_type: "product",
            currency: "INR",
          });
          gtag("event", "view_item", {
            currency: "INR",
            items: [{
              item_id: config._id || "jyotirling_chadhava",
              item_name: config.bannerTitle || "12 Jyotirlinga Darshan & Chadhava",
              item_category: "Jyotirlinga Chadhava",
            }],
          });

          // Set defaults if data exists
          if (config.jyotirlingTemples?.length > 0) {
            setSelectedJyotirlingIds([config.jyotirlingTemples[0].id]);
          }
          if (config.chadhavaOfferings?.length > 0) {
            setSelectedOfferings([config.chadhavaOfferings[0].id]);
          }
        }
      } catch (err) {
        console.error("Error fetching Jyotirling Data:", err);
        setError("Failed to load Chadhava details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJyotirlingData();
  }, []);

  const sortedJyotirlingas = useMemo(() => {
    if (!jyotirlingasData.length) return [];

    const withDates = jyotirlingasData.map((j) => {
      let year = now.getFullYear();
      let targetDate = new Date(year, j.defaultMonth, j.defaultDate, 0, 0, 0, 0);

      // If the date has passed this year, schedule it for the next year (end of queue)
      if (now.getTime() > targetDate.getTime()) {
        targetDate.setFullYear(year + 1);
      }
      return { ...j, nextDate: targetDate };
    });

    // Sort by nearest upcoming date
    return withDates.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  }, [now, jyotirlingasData]);

  // Update Stepper state based on selections
  useEffect(() => {
    if (selectedJyotirlingIds.length === 0) {
      setActiveStep(1);
    } else {
      setActiveStep(2);
    }
  }, [selectedJyotirlingIds, selectedOfferings]);


  // Toggle Selection (adds/removes to tracking stack)
  const handleToggleJyotirling = (id: string) => {
    setSelectedJyotirlingIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Select All 12 temples
  const handleSelectAll = () => {
    if (selectedJyotirlingIds.length === sortedJyotirlingas.length) {
      setSelectedJyotirlingIds([]);
    } else {
      const allIds = sortedJyotirlingas.map((j) => j.id);
      setSelectedJyotirlingIds(allIds);
    }
  };

  // LIFO order Clear button behavior
  const handleClearLast = () => {
    setSelectedJyotirlingIds((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next.pop(); // Remove the last selected temple
      return next;
    });
  };

  // Toggle offering selection
  const handleToggleOffering = (id: string) => {
    setSelectedOfferings((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Calculate pricing
  const numSelectedTemples = selectedJyotirlingIds.length;

  const totalAmount = useMemo(() => {
    return selectedOfferings.reduce((sum, offId) => {
      const offering = offeringsData.find((o) => o.id === offId);
      if (!offering) return sum;
      return sum + (offering.price || 0) * (numSelectedTemples || 1);
    }, 0);
  }, [selectedOfferings, numSelectedTemples, offeringsData]);

  const navigateToPayment = (wantsPrasad: boolean) => {
    const finalPrice = totalAmount + (wantsPrasad ? prasad.price * numSelectedTemples : 0);

    // Track AddToCart
    const contents = selectedOfferings.map(offId => {
      const offering = offeringsData.find(o => o.id === offId);
      return {
        id: offId,
        name: offering?.name || offId,
        quantity: selectedJyotirlingIds.length || 1,
        item_price: offering?.price || 0
      };
    });

    fbqTrack("AddToCart", {
      content_ids: selectedOfferings,
      content_name: bannerData?.bannerTitle || "12 Jyotirlinga Darshan & Chadhava",
      content_category: "Jyotirlinga Chadhava",
      content_type: "product",
      contents: contents,
      value: toInr(finalPrice),
      currency: "INR",
    });
    gtag("event", "add_to_cart", {
      currency: "INR",
      value: toInr(finalPrice),
      items: contents.map(c => ({
        item_id: c.id,
        item_name: c.name,
        item_category: "Jyotirlinga Chadhava",
        price: c.item_price,
        quantity: c.quantity,
      })),
    });

    setShowPrasadPopup(false);
    saveNavState("jyotirling-chadhava-payment", {
      selectedJyotirlingIds,
      selectedOfferings,
      totalAmount: finalPrice,
      selectedTemplesData: sortedJyotirlingas.filter(j => selectedJyotirlingIds.includes(j.id)),
      selectedOfferingsData: offeringsData.filter(o => selectedOfferings.includes(o.id)),
      needPrasad: wantsPrasad,
      prasad: wantsPrasad ? { ...prasad, price: prasad.price * numSelectedTemples } : null
    });
    router.push("/services/new-jyotirling-chadhava-payment");
  };

  const handleProceed = () => {
    setShowPrasadPopup(true);
  };

  // Format Helper
  const formatDate = (date: Date) => {
    const day = date.getDate();
    const suffix = ["th", "st", "nd", "rd"][day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10 ? day % 10 : 0)];
    const month = date.toLocaleString('default', { month: 'short' });
    const targetYear = date.getFullYear();
    return `${day}${suffix} ${month} ${targetYear}`;
  };

  if (isLoading) {
    return <div className="chadhava-page-container"><p style={{ padding: "2rem", textAlign: "center" }}>Loading Jyotirling Sevas...</p></div>;
  }

  if (error) {
    return <div className="chadhava-page-container"><p style={{ padding: "2rem", textAlign: "center", color: "red" }}>{error}</p></div>;
  }

  // Countdown Calculation
  let countdownStr = "00d 00:00:00";
  if (sortedJyotirlingas.length > 0) {
    const nextSevaDate = sortedJyotirlingas[0].nextDate;
    const diff = nextSevaDate.getTime() - now.getTime();
    if (diff > 0) {
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      countdownStr = `${d.toString().padStart(2, '0')}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  }

  return (
    <div className="chadhava-page-container">
      {/* 1. Banner Section */}
      <div className="premium-banner">
        <div className="banner-img-container" style={bannerData?.topBannerImage?.location ? { height: "auto" } : {}}>
          {bannerData?.topBannerImage?.location ? (
            <img
              src={bannerData.topBannerImage.location}
              alt="Jyotirlinga Chadhava"
              className="premium-banner-img"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          ) : (
            <span className="banner-placeholder-text">[ Banner Image Space ]</span>
          )}
        </div>
      </div>

      {/* Stepper progress tracking */}
      <div className="stepper-outer-wrap">
        <div className="stepper-container">
          <div className={`step-item step-one ${activeStep >= 1 ? "active" : ""} ${activeStep > 1 ? "completed" : ""}`}>
            <div className="step-circle">1</div>
            <span className="step-label">Select Jyotirlingas</span>
          </div>
          <span className="step-divider">.........</span>
          <div className={`step-item step-two ${activeStep >= 2 ? "active" : ""} ${activeStep > 2 ? "completed" : ""}`}>
            <div className="step-circle">2</div>
            <span className="step-label">Add Offering</span>
          </div>
          <span className="step-divider">.........</span>
          <div className={`step-item step-three ${activeStep >= 3 ? "active" : ""} ${activeStep > 3 ? "completed" : ""}`}>
            <div className="step-circle">3</div>
            <span className="step-label">Pay & Book</span>
          </div>
        </div>
      </div>

      {/* 3. Step 1: Select Jyotirling Section */}
      <div className="page-section">
        <span className="section-label">🔱 STEP ONE 🔱</span>
        <div className="section-title-row">
          <h2 className="section-title">Choose Your Jyotirlingas</h2>
          {/* Every live number on this page is wrapped in .notranslate.
              Google Translate replaces the text nodes it translates with its
              own <font> elements, and React goes on writing the count into the
              original node — which is no longer in the document. The number
              then freezes at whatever it read when the user switched to Hindi.
              Keeping the digits in a skipped element leaves React's text node
              untouched, while the words around it still get translated. */}
          <span className="selection-count">
            <span className="notranslate">{numSelectedTemples}</span> of{" "}
            <span className="notranslate">{sortedJyotirlingas.length}</span> Selected
          </span>
        </div>

        <div className="controls-bar">
          <label className="select-all-pill">
            <input
              type="checkbox"
              checked={numSelectedTemples === sortedJyotirlingas.length && sortedJyotirlingas.length > 0}
              onChange={handleSelectAll}
            />
            Select All-12
          </label>
          <button
            onClick={handleClearLast}
            disabled={numSelectedTemples === 0}
            className="btn-clear"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: "10px", height: "10px" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Clear
          </button>
        </div>

        {/* Temples Grid (All 12) */}
        <div className="temples-grid">
          {sortedJyotirlingas.map((temple, idx) => {
            const isSelected = selectedJyotirlingIds.includes(temple.id);
            return (
              <div
                key={temple.id}
                className={`temple-card ${isSelected ? "selected" : ""}`}
                onClick={() => handleToggleJyotirling(temple.id)}
              >
                {/* Number index box in top-left */}
                <div className="card-index">{idx + 1}</div>

                {/* Corner Tick Checkbox in top-right */}
                <div className="card-checkbox">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24" style={{ width: "8px", height: "8px" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>

                {/* Image */}
                {temple.image?.location ? (
                  <img src={temple.image.location} alt={temple.nameEnglish} style={{ width: "90%", height: "45px", objectFit: "contain", margin: "0.8rem auto 0.3rem auto", display: "block", borderRadius: "0.25rem" }} />
                ) : (
                  <div className="temple-image-placeholder" />
                )}

                <div className="temple-info">
                  <h3 className="temple-name">{temple.nameEnglish}</h3>
                  <div className="temple-schedule">{formatDate(temple.nextDate)}</div>
                  <div className="temple-state">{temple.location}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Step 2: Select Chadhava Seva Section */}
      <div className="page-section">
        <span className="section-label">STEP TWO 🔱</span>
        <div className="section-title-row">
          <h2 className="section-title">Choose Your Offering</h2>
        </div>

        <div className="offerings-list">
          {offeringsData.map((offering) => {
            const isAdded = selectedOfferings.includes(offering.id);
            const calculatedPricePerTemple = offering.price * (numSelectedTemples || 1);
            return (
              <div
                key={offering.id}
                className={`offering-card ${isAdded ? "selected" : ""}`}
              >
                <div className="offering-left">
                  <div className="offering-img-wrap">
                    {offering.image?.location ? (
                      <img
                        src={offering.image.location}
                        alt={offering.name}
                        className="offering-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="offering-img" style={{ background: "#f3f4f6" }} />
                    )}
                  </div>
                  <div className="offering-details">
                    <div className="offering-header">
                      <h3 className="offering-name">{offering.name}</h3>
                      {offering.badge && (
                        <span className="popular-badge">
                          🔥 {offering.badge}
                        </span>
                      )}
                    </div>
                    <p className="offering-desc">{offering.description || offering.shortDescription}</p>
                    <div className="multiplier-pill">
                      <span>
                        🏷️ <span className="notranslate">{money(offering.price)}</span> per temple x{" "}
                        <span className="notranslate">{numSelectedTemples || 1}</span>{" "}
                        {numSelectedTemples === 1 ? "Temple" : "Temples"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="offering-right">
                  <div className="offering-price-col">
                    <div className="offering-price-actual notranslate">{money(calculatedPricePerTemple)}</div>
                    {offering.originalPrice && offering.originalPrice > offering.price && (
                      <div className="offering-price-cut notranslate">{money((offering.originalPrice || 0) * (numSelectedTemples || 1))}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleOffering(offering.id)}
                    className={`btn-add-offering ${isAdded ? "added" : ""}`}
                  >
                    {isAdded ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" style={{ width: "10px", height: "10px" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Added
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span> Add
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Bottom Banner Section */}
      <div className="bottom-seva-banner">
        <div className="banner-bg" style={bannerData?.bottomBannerImage?.location ? { backgroundImage: `url(${bannerData.bottomBannerImage.location})` } : {}}></div>
        <div className="banner-content">
          <div className="banner-countdown-pill">
            <span className="pill-text">Next Seva Start in</span>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 4px', strokeWidth: 2 }}><circle cx="12" cy="12" r="10"></circle><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"></path></svg>
            <span className="pill-time notranslate">{countdownStr}</span>
          </div>
        </div>
      </div>

      {/* 6. Trust & Journey Pillars Section */}
      <div className="trust-pillars-section">
        <h2 className="trust-section-title">12 Jyotirlinga Sankalp Yatra 🙏</h2>
        <p className="trust-section-subtitle">
          "Saara jeevan jise log poora nahi kar paate — woh 12 Jyotirlinga ki yatra, aapke naam aur gotra se, 12 mahine mein poori."
        </p>

        <div className="trust-pillars-grid">
          <div className="pillar-card">
            <span className="pillar-icon">🕉️</span>
            <div>
              <h3 className="pillar-title">Authentic Sankalp</h3>
              <p className="pillar-desc">Your name & gotra are physically read aloud at each temple by resident pandits.</p>
            </div>
          </div>

          <div className="pillar-card">
            <span className="pillar-icon">📱</span>
            <div>
              <h3 className="pillar-title">Sacred Proof</h3>
              <p className="pillar-desc">Receive real photo & video proof of the ritual directly on your WhatsApp every month.</p>
            </div>
          </div>

          <div className="pillar-card">
            <span className="pillar-icon">🤝</span>
            <div>
              <h3 className="pillar-title">Devotee Trust</h3>
              <p className="pillar-desc">Over 5,000+ families trust Vedic Vaibhav with their monthly devotional needs.</p>
            </div>
          </div>

          <div className="pillar-card">
            <span className="pillar-icon">🎁</span>
            <div>
              <h3 className="pillar-title">Monthly Prasad Box</h3>
              <p className="pillar-desc">Satvik prasad blessed at the temple, delivered right to your home doorstep.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 7. FAQs Section */}
      <div className="faq-section">
        <h2 className="faq-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqs.map((faq, idx) => {
            const isOpen = expandedFaqIndex === idx;
            return (
              <div key={idx} className="faq-item">
                <button
                  className="faq-question-btn"
                  onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                >
                  <span className="faq-question-text">{faq.q}</span>
                  <span className={`faq-arrow ${isOpen ? "open" : ""}`}>▼</span>
                </button>
                {isOpen && (
                  <div className="faq-answer open">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bottom-spacer"></div>

      {/* Sticky Bottom Bar */}
      <div
        className="sticky-bottom-bar"
        onClick={() => {
          if (numSelectedTemples > 0 && selectedOfferings.length > 0) {
            handleProceed();
          }
        }}
        style={{
          cursor: (numSelectedTemples > 0 && selectedOfferings.length > 0) ? "pointer" : "default"
        }}
      >
        <div className="sticky-price-info">
          <div className="sticky-total-price notranslate">{money(totalAmount)}</div>
          <div className="sticky-total-label">TOTAL</div>
        </div>
        <button
          className="sticky-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (numSelectedTemples > 0 && selectedOfferings.length > 0) {
              handleProceed();
            }
          }}
          disabled={numSelectedTemples === 0 || selectedOfferings.length === 0}
        >
          Proceed ►
        </button>
      </div>

      {/* Prasad Popup */}
      {showPrasadPopup && (
        <div
          className="fixed inset-0 z-[101] flex items-end justify-center bg-black/60 backdrop-blur-md transition-opacity"
          onClick={() => setShowPrasadPopup(false)}
        >
          <div
            className="w-full md:w-1/2 h-auto bg-gradient-to-b from-orange-50 to-white rounded-t-3xl pt-2 pb-6 px-1 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative"
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: "24px 24px 0 0" }}
          >
            {/* Drag Handle indicator */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 opacity-70" />

            <div className="px-5">
              <div className="text-center mb-6">
                <h3 className="font-black text-xl text-slate-900 mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>Complete Your Devotion 🙏</h3>
                <div className="flex flex-col items-center gap-2">
                  <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5">
                    <span className="text-sm font-black text-orange-700">96% of devotees add Sacred Prasad</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1">
                    <span className="text-xs font-bold text-amber-700">Over 10,000+ Sacred Prasad opted by devotees</span>
                  </div>
                </div>
              </div>

              {prasad && (
                <div
                  className={`relative overflow-hidden flex items-center gap-4 p-4 mb-6 border-2 rounded-2xl transition-all duration-300 cursor-pointer ${prasadSelected ? "border-orange-500 shadow-md" : "border-slate-200 hover:border-orange-300"}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px",
                    marginBottom: "24px",
                    borderRadius: "16px",
                    borderWidth: "2px",
                    backgroundColor: prasadSelected ? "#fffaf5" : "#ffffff"
                  }}
                  onClick={() => setPrasadSelected((p) => !p)}
                >
                  <div style={{ width: "64px", height: "64px", borderRadius: "12px", overflow: "hidden", backgroundColor: "#f3f4f6", flexShrink: 0 }}>
                    <img
                      src={prasad.image}
                      alt={prasad.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div style={{ fontWeight: 700, color: "#1f2937", fontSize: "14px", marginBottom: "4px" }}>{prasad.name}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.4" }}>{prasad.desc}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="notranslate" style={{ fontWeight: 900, color: "#047857", fontSize: "18px" }}>{money(prasad.price * numSelectedTemples)}</div>
                    <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
                      <span className="notranslate">{money(298)}</span> x{" "}
                      <span className="notranslate">{numSelectedTemples}</span>{" "}
                      {numSelectedTemples === 1 ? "temple" : "temples"}
                    </div>
                    <div style={{ marginTop: "4px", display: "flex", justifyContent: "flex-end" }}>
                      <div style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        border: "2px solid",
                        borderColor: prasadSelected ? "#f97316" : "#d1d5db",
                        backgroundColor: prasadSelected ? "#f97316" : "#f9fafb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {prasadSelected && (
                          <svg style={{ width: "14px", height: "14px", color: "#ffffff" }} fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                className="w-full py-4 rounded-xl font-black text-white text-base flex items-center justify-center gap-2"
                style={{
                  background: prasadSelected ? "linear-gradient(to right, #f97316, #ef4444)" : "#1f2937",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: 800,
                  fontSize: "16px",
                  cursor: "pointer",
                  color: "#ffffff"
                }}
                onClick={() => navigateToPayment(prasadSelected)}
              >
                {prasadSelected ? "Continue with Prasad" : "Add Prasad to Complete"}
              </button>

              <button
                className="w-full py-3 mt-2 rounded-xl text-center text-sm font-semibold transition-colors"
                style={{
                  background: "none",
                  border: "none",
                  color: "#6b7280",
                  cursor: "pointer",
                  marginTop: "8px"
                }}
                onClick={() => navigateToPayment(false)}
              >
                No thanks, I will skip the sacred prasad
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NewJyotirlingChadhavaPage = () => {
  return <Layout content={<PageContent />} activeIndex="puja" />;
};

export default NewJyotirlingChadhavaPage;
