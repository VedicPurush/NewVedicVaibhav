"use client";

import { Col, Row } from "antd";
import { useMoney } from "@/lib/currency";
import React, { useRef, useState, useEffect, type RefObject } from "react";
import PackageCard from "./PackageCard";
import BenefitCard from "./BenefitCard";
import FAQList from "./FAQ";
import { useRouter } from "next/navigation";
import PujaProcess from "./PujaProcess";
import ReviewPuja from "./ReviewPuja";
import ArrowRightAlt from '@mui/icons-material/ArrowRightAlt';
import ArrowForwardIos from '@mui/icons-material/ArrowForwardIos';

interface PujaProps {
  id: any;
  aboutus: any;
  benefit1heading: string;
  benefit1description: string;
  benefit2heading: string;
  benefit2description: string;
  benefit3heading: string;
  benefit3description: string;
  templeimgSrc: any;
  abouttemple: string;
  singlepackageprice: number;
  singlepackagedesccription: string;
  couplepackageprice: number;
  couplepackagedesccription: string;
  familypackageprice: number;
  familypackagedesccription: string;
  vippackageprice: number;
  vippackagedesccription: string;
  packagesSectionRef: RefObject<HTMLDivElement | null>;
  selectedPackage: string | null;
  setSelectedPackage: React.Dispatch<React.SetStateAction<string | null>>;
  setShowButton: (value: boolean) => void;
  pujaImage?: string;
  isExpired?: boolean;
}

const StickyNavigationPage: React.FC<PujaProps> = ({
  id,
  aboutus,
  benefit1description,
  benefit1heading,
  benefit2description,
  benefit2heading,
  benefit3description,
  benefit3heading,
  templeimgSrc,
  abouttemple,
  selectedPackage,
  setSelectedPackage,
  singlepackageprice,
  singlepackagedesccription,
  couplepackageprice,
  couplepackagedesccription,
  familypackageprice,
  familypackagedesccription,
  vippackageprice,
  vippackagedesccription,
  packagesSectionRef,
  setShowButton,
  pujaImage,
  isExpired = false,
}) => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const isSpecialPuja = id === "687e7037b74af9a76da1db60";
  // References for each section
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const benefitsRef = useRef<HTMLDivElement | null>(null);
  const processRef = useRef<HTMLDivElement | null>(null);
  const templeDetailsRef = useRef<HTMLDivElement | null>(null);
  const packagesRef = useRef<HTMLDivElement | null>(null);
  const reviewsRef = useRef<HTMLDivElement | null>(null);
  const faqRef = useRef<HTMLDivElement | null>(null);

  const [selectedDescription, setSelectedDescription] = useState<string>("");

  const [prasadModalVisible, setPrasadModalVisible] = useState(false);
  const [pendingPackage, setPendingPackage] = useState<string | null>(null);
  const [_localPrasadSelected, setLocalPrasadSelected] = useState(false);

  const handleCardClick = (pkgKey: string, description: string) => {
    setSelectedPackage(pkgKey); // e.g. "singlePackage"
    setSelectedDescription(description);
  };

  // Split text into words

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowButton(!entry.isIntersecting);
      },
      {
        root: null, // Uses viewport
        rootMargin: "0px",
        threshold: 1, // Button hides when 30% of the section is visible
      }
    );

    if (packagesSectionRef.current) {
      observer.observe(packagesSectionRef.current);
    }

    return () => {
      if (packagesSectionRef.current) {
        observer.unobserve(packagesSectionRef.current);
      }
    };
  }, [setShowButton]);

  const router = useRouter();

  const handleSelectPackage = (packagename: string) => {
    if (isExpired) return;
    setPendingPackage(packagename);
    setLocalPrasadSelected(false);
    setPrasadModalVisible(true);
  };

  const proceedToPayment = (isAdded: boolean) => {
    if (!pendingPackage) return;

    const mapping: Record<string, string> = {
      singlePackage: "Single",
      partnerPackage: "Couple",
      familyBhogPackage: "Family",
      jointFamilyPackage: "VIP",
    };

    const readableName = mapping[pendingPackage] || "Unknown";

    // Fire FB Pixel tracking
    (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq?.("track", "Puja Track", {
      selected_package: readableName,
    });

    localStorage.setItem(
      "selectedPackage",
      JSON.stringify({
        packageName: pendingPackage,
        timestamp: new Date().toISOString(),
      })
    );

    localStorage.setItem("prasadSelection", isAdded ? "yes" : "no");
    router.push(`/services/puja/${id}/payment`);
  };

  const handleSelectPackagemob = () => {
    if (isExpired) return;
    if (!selectedPackage) {
      alert("Please select a package before proceeding.");
      return;
    }

    setPendingPackage(selectedPackage);
    setLocalPrasadSelected(false);
    setPrasadModalVisible(true);
  };

  return (
    <>
      <style>
        {`
    .mandir-data-content p,
    .mandir-data-content ul,
    .mandir-data-content ol,
    .mandir-data-content li,
    .mandir-data-content blockquote {
      margin: 0;
      padding: 0;
    }
    .mandir-data-content p,
    .mandir-data-content li {
      line-height: 1.6;
    }
    .mandir-data-content p + p {
      margin-top: 1em;
    }
    .mandir-data-content ul,
    .mandir-data-content ol {
      margin-left: 1.5em;
      margin-top: 1em;
      list-style-type: disc;
    }
    .mandir-data-content ul {
      list-style-type: disc;
    }
    .mandir-data-content ol {
      list-style-type: decimal;
    }
    .mandir-data-content li {
      list-style-position: outside;
      display: list-item;
      margin-bottom: 0.5em;
    }
    .mandir-data-content blockquote {
      margin: 1em 0;
      padding-left: 1em;
      border-left: 3px solid #ccc;
      color: #555;
      font-style: italic;
    }

    .sticky-navigation {
      position: -webkit-sticky; /* Safari support */
      position: sticky;
      top: 85px;
      z-index: 100;
      background: linear-gradient(135deg, rgba(255,248,240,0.95), rgba(255,243,224,0.95));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px); /* Safari support */
      border-bottom: 2px solid rgba(255,125,0,0.2);
      padding: 0.6% 6%;
      display: flex;
      gap: 2%;
      box-shadow: 0 4px 20px rgba(255,125,0,0.1);
      animation: slideDown 0.6s ease-out;
      margin-top: 1%;
      margin-bottom: 1%;
      width: 100%; /* Ensure full width */
      left: 0; /* Align to left edge */
    }

    @media (max-width: 768px) {
      .sticky-navigation {
        top: 63px;
        margin-top: 2%;
        padding: 2% 6%;
        gap: 3%;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        -webkit-overflow-scrolling: touch;
      }
    }

    .sticky-nav-item {
      padding: 0.3% 1%;
      cursor: pointer;
      border-radius: 20px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 14px;
      font-weight: 500;
      color: rgba(0,0,0,0.7);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
    }

    .sticky-nav-item:hover {
      background: rgba(255,125,0,0.1);
      color: #FF7D00;
      transform: translateY(-2px);
    }

    .sticky-nav-item.active {
      background: linear-gradient(135deg, #D4805C, #C4704D);
      color: white;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(255,125,0,0.3);
    }

    .sticky-nav-item.active::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: shine 2s ease-in-out infinite;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes shine {
      0% { left: -100%; }
      20%, 100% { left: 100%; }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes expandWidth {
      from { width: 0; }
      to { width: 80px; }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .section-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 20px;
      font-weight: 600;
      background: linear-gradient(135deg, #8B4513, #FF7D00, #8B4513);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      position: relative;
      display: inline-block;
      animation: fadeInUp 0.6s ease-out;
    }

    .section-title::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 0;
      width: 80px;
      height: 3px;
      background: linear-gradient(90deg, #FF7D00, #FFB800);
      border-radius: 2px;
      animation: expandWidth 0.8s ease-out 0.3s both;
    }

    .divider-spiritual {
      height: 3px;
      width: 100%;
      background: linear-gradient(90deg, rgba(255,125,0,0.1), rgba(255,125,0,0.3), rgba(255,125,0,0.1));
      border: none;
      margin: 0.8% 0;
      position: relative;
      overflow: hidden;
    }

    .divider-spiritual::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 50%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,184,0,0.6), transparent);
      animation: shimmer 3s ease-in-out infinite;
    }

    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    @keyframes pulseGlow {
      0% {
        transform: scale(1);
        opacity: 0.55;
      }
      50% {
        transform: scale(1.15);
        opacity: 0.85;
      }
      100% {
        transform: scale(1);
        opacity: 0.55;
      }
    }
  `}
      </style>


      <div
        ref={packagesSectionRef}
        style={{
          height: "1px",
          width: "100%",
        }}
      ></div>

      {/* PACKAGES SECTION */}
      <div
        ref={packagesRef}
        style={{ width: "100%", animation: "fadeInUp 0.8s ease-out" }}
      >
        <Col xl={24} lg={24} md={0} xs={0} sm={0}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "start",
              paddingTop: "1%",
              paddingInline: "6%",
              paddingBottom: "1%",
            }}
          >
            <div className="section-title" style={{ marginBottom: "0.3%" }}>
              Select Puja Package
            </div>
            <div
              style={{
                color: "rgba(0,0,0,0.6)",
                fontSize: "14px",
                marginBottom: "1%",
                marginTop: "0.8%",
              }}
            >
              Choose the perfect puja package according to your spiritual needs
              and preferences.
            </div>

            <Row gutter={[16, 16]}>
              <Col span={6}>
                <PackageCard
                  backgroundcolor="#ECF4FD"
                  textcolor="#476CE4"
                  packagename={isSpecialPuja ? "1 Day" : "SINGLE"}
                  packageprice={singlepackageprice}
                  persons={isSpecialPuja ? "1 Person" : "1 Person"}
                  imgSrc="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_f8y1x1f8y1x1f8y1-removebg-preview.webp"
                  description={singlepackagedesccription}
                  buttoncolor="#476CE4"
                  onSelectPackage={() => handleSelectPackage("singlePackage")}
                  isSelected={selectedPackage === "singlePackage"}
                  onClick={() => setSelectedPackage("singlePackage")}
                />
              </Col>

              <Col span={6}>
                <PackageCard
                  backgroundcolor="#EDE7F9"
                  textcolor="#4A0ABD"
                  packagename={isSpecialPuja ? "3 Days" : "COUPLE"}
                  packageprice={couplepackageprice}
                  persons={isSpecialPuja ? "2 Person" : "2 Person"}
                  imgSrc="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_8oc9an8oc9an8oc9-removebg-preview.webp"
                  description={couplepackagedesccription}
                  buttoncolor="#4A0ABD"
                  onSelectPackage={() => handleSelectPackage("partnerPackage")}
                  isSelected={selectedPackage === "partnerPackage"}
                  onClick={() => setSelectedPackage("partnerPackage")}
                />
              </Col>
              <Col span={6}>
                <PackageCard
                  backgroundcolor="#FEF5EC"
                  textcolor="#F7A03E"
                  packagename={isSpecialPuja ? "8 Days" : "FAMILY"}
                  packageprice={familypackageprice}
                  persons={isSpecialPuja ? "4 Person" : "Upto 6"}
                  imgSrc="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_mjkankmjkankmjka-removebg-preview.webp"
                  description={familypackagedesccription}
                  buttoncolor="#F7A03E"
                  onSelectPackage={() =>
                    handleSelectPackage("familyBhogPackage")
                  }
                  isSelected={selectedPackage === "familyBhogPackage"}
                  onClick={() => setSelectedPackage("familyBhogPackage")}
                />
              </Col>
              <Col span={6}>
                <PackageCard
                  backgroundcolor="#E1FED4"
                  textcolor="#359807"
                  packagename={isSpecialPuja ? "18 Days" : "VIP"}
                  packageprice={vippackageprice}
                  persons={isSpecialPuja ? "8 Person" : "Corporate"}
                  imgSrc="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_5wizqr5wizqr5wiz-removebg-preview.webp"
                  description={vippackagedesccription}
                  buttoncolor="#359807"
                  onSelectPackage={() =>
                    handleSelectPackage("jointFamilyPackage")
                  }
                  isSelected={selectedPackage === "jointFamilyPackage"}
                  onClick={() => setSelectedPackage("jointFamilyPackage")}
                />
              </Col>
            </Row>
          </div>
        </Col>

        {/* MOBILE PACKAGES */}
        <Col xl={0} lg={0} md={24} xs={24} sm={24}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "start",
              paddingBlock: "3%",
              paddingInline: "3%",
            }}
          >
            <div
              className="section-title"
              style={{ fontSize: "18px", marginTop: "2%" }}
            >
              Select Puja Package
            </div>
            <div
              style={{
                color: "rgba(0,0,0,0.6)",
                fontSize: "13px",
                marginBottom: "3%",
                marginTop: "2%",
              }}
            >
              Choose the perfect puja package according to your spiritual needs
              and preferences.
            </div>

            <Row gutter={[8, 10]}>
              <Col span={12}>
                <PackageCard
                  backgroundcolor="#ECF4FD"
                  textcolor="#476CE4"
                  packagename={isSpecialPuja ? "1 Day" : "SINGLE"}
                  packageprice={singlepackageprice}
                  persons={isSpecialPuja ? "1" : "1 Person"}
                  imgSrc="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_f8y1x1f8y1x1f8y1-removebg-preview.webp"
                  description={singlepackagedesccription}
                  buttoncolor="#476CE4"
                  onSelectPackage={() => handleSelectPackage("singlePackage")}
                  isSelected={selectedPackage === "singlePackage"}
                  onClick={() =>
                    handleCardClick("singlePackage", singlepackagedesccription)
                  }
                />
              </Col>

              <Col span={12}>
                <PackageCard
                  backgroundcolor="#EDE7F9"
                  textcolor="#4A0ABD"
                  packagename={isSpecialPuja ? "3 Days" : "COUPLE"}
                  packageprice={couplepackageprice}
                  persons={isSpecialPuja ? "2" : "2 Persons"}
                  imgSrc="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_8oc9an8oc9an8oc9-removebg-preview.webp"
                  description={couplepackagedesccription}
                  buttoncolor="#4A0ABD"
                  onSelectPackage={() => handleSelectPackage("partnerPackage")}
                  isSelected={selectedPackage === "partnerPackage"}
                  onClick={() =>
                    handleCardClick("partnerPackage", couplepackagedesccription)
                  }
                />
              </Col>
              <Col span={12}>
                <PackageCard
                  backgroundcolor="#FEF5EC"
                  textcolor="#F7A03E"
                  packagename={isSpecialPuja ? "8 Days" : "FAMILY"}
                  packageprice={familypackageprice}
                  persons={isSpecialPuja ? "4" : "upto 6"}
                  imgSrc="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_mjkankmjkankmjka-removebg-preview.webp"
                  description={familypackagedesccription}
                  buttoncolor="#F7A03E"
                  onSelectPackage={() =>
                    handleSelectPackage("familyBhogPackage")
                  }
                  isSelected={selectedPackage === "familyBhogPackage"}
                  onClick={() =>
                    handleCardClick(
                      "familyBhogPackage",
                      familypackagedesccription
                    )
                  }
                />
              </Col>
              <Col span={12}>
                <PackageCard
                  backgroundcolor="#E1FED4"
                  textcolor="#359807"
                  packagename={isSpecialPuja ? "18 Days" : "VIP"}
                  packageprice={vippackageprice}
                  persons={isSpecialPuja ? "8" : "Corporate"}
                  imgSrc="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_5wizqr5wizqr5wiz-removebg-preview.webp"
                  description={vippackagedesccription}
                  buttoncolor="#359807"
                  onSelectPackage={() =>
                    handleSelectPackage("jointFamilyPackage")
                  }
                  isSelected={selectedPackage === "jointFamilyPackage"}
                  onClick={() =>
                    handleCardClick(
                      "jointFamilyPackage",
                      vippackagedesccription
                    )
                  }
                />
              </Col>
            </Row>

            {selectedDescription && (
              <div
                style={{
                  marginTop: "4%",
                  background:
                    "linear-gradient(135deg, rgba(255,248,240,0.6), rgba(255,243,224,0.6))",
                  backdropFilter: "blur(8px)",
                  border: "2px solid rgba(255,125,0,0.2)",
                  borderRadius: "12px",
                  padding: "4%",
                  boxShadow: "0 4px 16px rgba(255,125,0,0.15)",
                  animation: "fadeInUp 0.5s ease-out",
                }}
              >
                <h3
                  style={{
                    marginBottom: "3%",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#FF7D00",
                  }}
                >
                  About Package
                </h3>
                <div
                  style={{
                    fontSize: "13px",
                    color: "rgba(0,0,0,0.7)",
                    lineHeight: "1.6",
                  }}
                  dangerouslySetInnerHTML={{ __html: selectedDescription }}
                />

                <div
                  onClick={isExpired ? undefined : handleSelectPackagemob}
                  style={{
                    cursor: isExpired ? "not-allowed" : "pointer",
                    background: isExpired ? "#9ca3af" : "linear-gradient(135deg, #E67E50, #D4845F)",
                    boxShadow: isExpired ? "none" : "0px 4px 16px rgba(255,125,0,0.3)",
                    color: "white",
                    fontSize: "15px",
                    fontWeight: 600,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: "100px",
                    padding: "3%",
                    marginTop: "4%",
                    border: "2px solid rgba(255,255,255,0.3)",
                    transition: "all 0.3s ease",
                  }}
                >
                  {isExpired ? "Event Ended" : <><span>Participate</span>&nbsp;<ArrowRightAlt /></>}
                </div>
              </div>
            )}
          </div>
        </Col>
      </div>

      {/* DIVIDER */}
      <div className="divider-spiritual"></div>

      {/* BENEFITS SECTION */}
      <div
        ref={benefitsRef}
        style={{ display: "flex", width: "100%", flexDirection: "column" }}
      >
        <Col xl={24} lg={24} md={0} xs={0} sm={0}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingInline: "6%",
              paddingBlock: "1%",
            }}
          >
            <div className="section-title">Puja Benefits</div>

            <Row
              gutter={[20, 20]}
              style={{ justifyContent: "space-between", marginTop: "1%" }}
            >
              <Col span={8}>
                <BenefitCard
                  benefitheading={benefit1heading}
                  benefitdescription={benefit1description}
                  wordLimit={20}
                />
              </Col>
              <Col span={8}>
                <BenefitCard
                  benefitheading={benefit2heading}
                  benefitdescription={benefit2description}
                  wordLimit={20}
                />
              </Col>

              <Col span={8}>
                <BenefitCard
                  benefitheading={benefit3heading}
                  benefitdescription={benefit3description}
                  wordLimit={20}
                />
              </Col>
            </Row>
          </div>
        </Col>

        {/* MOBILE BENEFITS */}
        <Col xl={0} lg={0} md={24} xs={24} sm={24}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingInline: "3%",
              paddingBlock: "3%",
            }}
          >
            <div
              className="section-title"
              style={{ fontSize: "18px", marginBottom: "3%" }}
            >
              Puja Benefits
            </div>

            <Row gutter={[10, 16]} style={{ justifyContent: "space-between" }}>
              <Col span={24}>
                <BenefitCard
                  benefitheading={benefit1heading}
                  benefitdescription={benefit1description}
                  wordLimit={20}
                />
              </Col>
              <Col span={24}>
                <BenefitCard
                  benefitheading={benefit2heading}
                  benefitdescription={benefit2description}
                  wordLimit={20}
                />
              </Col>

              <Col span={24}>
                <BenefitCard
                  benefitheading={benefit3heading}
                  benefitdescription={benefit3description}
                  wordLimit={20}
                />
              </Col>
            </Row>
          </div>
        </Col>
      </div>

      {/* DIVIDER */}
      <div className="divider-spiritual"></div>

      {/* PROCESS SECTION */}
      <div ref={processRef} style={{ width: "100%" }}>
        <Col xl={24} lg={24} md={0} xs={0} sm={0}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "start",
              paddingBlock: "1%",
              paddingInline: "6%",
            }}
          >
            <div className="section-title">Puja Process</div>
            <PujaProcess />
          </div>
        </Col>

        <Col xl={0} lg={0} md={24} xs={24} sm={24}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "start",
              paddingBlock: "3%",
              paddingInline: "3%",
            }}
          >
            <div
              className="section-title"
              style={{ fontSize: "18px", marginBottom: "3%" }}
            >
              Puja Process
            </div>
            <PujaProcess />
          </div>
        </Col>
      </div>

      {/* DIVIDER */}
      <div className="divider-spiritual"></div>

      {/* ABOUT SECTION */}
      <div ref={aboutRef} style={{ width: "100%" }}>
        <Col xl={24} lg={24} md={0} xs={0} sm={0}>
          <div
            style={{
              paddingInline: "6%",
              paddingTop: "1%",
              paddingBottom: "1%",
              position: "relative",
            }}
          >
            {/* Decorative corner elements */}
            <div
              style={{
                position: "absolute",
                top: "1%",
                left: "5.5%",
                width: "40px",
                height: "40px",
                borderTop: "3px solid rgba(255,125,0,0.3)",
                borderLeft: "3px solid rgba(255,125,0,0.3)",
                borderRadius: "8px 0 0 0",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "1%",
                right: "5.5%",
                width: "40px",
                height: "40px",
                borderTop: "3px solid rgba(255,125,0,0.3)",
                borderRight: "3px solid rgba(255,125,0,0.3)",
                borderRadius: "0 8px 0 0",
              }}
            />

            {/* Content Container */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,248,240,0.3), rgba(255,243,224,0.3))",
                backdropFilter: "blur(8px)",
                border: "2px solid rgba(255,125,0,0.15)",
                borderRadius: "16px",
                padding: "2%",
                boxShadow: "0 4px 20px rgba(255,125,0,0.08)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Decorative top accent */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "20%",
                  right: "20%",
                  height: "6px",
                  background:
                    "linear-gradient(90deg, transparent, #FF7D00, #FFB800, #FF7D00, transparent)",
                }}
              />

              {/* About Content */}
              <div
                style={{
                  color: "rgba(0,0,0,0.75)",
                  textAlign: "justify",
                  lineHeight: "1.8",
                  fontSize: "16px",
                }}
                dangerouslySetInnerHTML={{ __html: aboutus }}
                className="mandir-data-content"
              ></div>

              {/* Decorative bottom accent */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "30%",
                  right: "30%",
                  height: "2px",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,125,0,0.3), transparent)",
                }}
              />
            </div>

            {/* Decorative bottom corner elements */}
            <div
              style={{
                position: "absolute",
                bottom: "1%",
                left: "5.5%",
                width: "40px",
                height: "40px",
                borderBottom: "3px solid rgba(255,125,0,0.3)",
                borderLeft: "3px solid rgba(255,125,0,0.3)",
                borderRadius: "0 0 0 8px",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "1%",
                right: "5.5%",
                width: "40px",
                height: "40px",
                borderBottom: "3px solid rgba(255,125,0,0.3)",
                borderRight: "3px solid rgba(255,125,0,0.3)",
                borderRadius: "0 0 8px 0",
              }}
            />
          </div>
        </Col>

        {/* MOBILE VIEW */}
        <Col xl={0} lg={0} md={24} xs={24} sm={24}>
          <div
            style={{
              paddingInline: "3%",
              paddingTop: "3%",
              paddingBottom: "3%",
              position: "relative",
            }}
          >
            {/* Decorative corner elements */}
            <div
              style={{
                position: "absolute",
                top: "2.5%",
                left: "2.5%",
                width: "30px",
                height: "30px",
                borderTop: "3px solid rgba(255,125,0,0.3)",
                borderLeft: "3px solid rgba(255,125,0,0.3)",
                borderRadius: "6px 0 0 0",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "2.5%",
                right: "2.5%",
                width: "30px",
                height: "30px",
                borderTop: "3px solid rgba(255,125,0,0.3)",
                borderRight: "3px solid rgba(255,125,0,0.3)",
                borderRadius: "0 6px 0 0",
              }}
            />

            {/* Content Container */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,248,240,0.4), rgba(255,243,224,0.4))",
                backdropFilter: "blur(8px)",
                border: "2px solid rgba(255,125,0,0.15)",
                borderRadius: "12px",
                padding: "5%",
                boxShadow: "0 4px 16px rgba(255,125,0,0.08)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Decorative top accent */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "15%",
                  right: "15%",
                  height: "2px",
                  background:
                    "linear-gradient(90deg, transparent, #FF7D00, #FFB800, #FF7D00, transparent)",
                }}
              />

              {/* Om symbol decoration */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "3%",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ opacity: 0.4 }}
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                    fill="#FF7D00"
                  />
                  <circle cx="12" cy="12" r="3" fill="#FFB800" />
                </svg>
              </div>

              {/* About Content */}
              <div
                style={{
                  color: "rgba(0,0,0,0.7)",
                  textAlign: "justify",
                  fontSize: "14px",
                  lineHeight: "1.7",
                }}
                className="mandir-data-content"
                dangerouslySetInnerHTML={{ __html: aboutus }}
              ></div>

              {/* Decorative bottom accent */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "25%",
                  right: "25%",
                  height: "2px",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,125,0,0.3), transparent)",
                }}
              />
            </div>

            {/* Decorative bottom corner elements */}
            <div
              style={{
                position: "absolute",
                bottom: "2.5%",
                left: "2.5%",
                width: "30px",
                height: "30px",
                borderBottom: "3px solid rgba(255,125,0,0.3)",
                borderLeft: "3px solid rgba(255,125,0,0.3)",
                borderRadius: "0 0 0 6px",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "2.5%",
                right: "2.5%",
                width: "30px",
                height: "30px",
                borderBottom: "3px solid rgba(255,125,0,0.3)",
                borderRight: "3px solid rgba(255,125,0,0.3)",
                borderRadius: "0 0 6px 0",
              }}
            />
          </div>
        </Col>
      </div>

      {/* DIVIDER */}
      <div className="divider-spiritual"></div>
      {/* TEMPLE DETAILS SECTION */}
      <div
        ref={templeDetailsRef}
        style={{ display: "flex", flexDirection: "column", width: "100%" }}
      >
        <Col xl={24} lg={24} md={0} xs={0} sm={0}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingInline: "6%",
              paddingBlock: "3%",
              // background: "linear-gradient(135deg, #fff8f0 0%, #ffffff 100%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                right: "0px",
                transform: "translateY(-50%)",
                width: "270px",
                height: "700px",
                zIndex: 0,
                pointerEvents: "none",
              }}
            >
              {/* Glow Effect */}
              <div
                className="temple-glow"
                style={{
                  position: "absolute",
                  inset: "-20px", // slightly larger for richer glow
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 50% 40%, rgba(255,205,80,0.85) 0%, rgba(255,170,30,0.55) 30%, rgba(240,135,0,0.35) 55%, rgba(200,100,0,0.15) 75%, transparent 100%)",
                  filter: "blur(25px)",
                  zIndex: -1,
                  width: "70%",
                  height: "70%",
                  top: "20%",
                  left: "15%",
                  animation: "glowPulse 3.5s ease-in-out infinite",
                }}
              ></div>

              {/* Temple Image */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundImage:
                    "url('https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/temple-removebg-preview.png')",
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  opacity: 1,
                }}
              />
            </div>

            <div
              className="section-title"
              style={{
                marginBottom: "1.5%",
                fontSize: "22px",
                fontWeight: "600",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                position: "relative",
              }}
            >
              Temple Details
            </div>

            <Row gutter={[10, 0]}>
              <Col span={7}>
                <div
                  style={{
                    borderRadius: "20px",
                    overflow: "hidden",
                    boxShadow: "0 12px 48px rgba(255,125,0,0.2)",
                    border: "1px solid rgba(255,125,0,0.15)",
                    position: "relative",
                    background: "white",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-8px)";
                    e.currentTarget.style.boxShadow =
                      "0 16px 64px rgba(255,125,0,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 12px 48px rgba(255,125,0,0.2)";
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background:
                        "linear-gradient(180deg, transparent 0%, rgba(255,125,0,0.1) 100%)",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  ></div>
                  <img loading="lazy" 
                    src={templeimgSrc}
                    style={{
                      width: "100%",
                      height: "35vh",
                      // objectFit: "cover",
                      display: "block",
                    }}
                   />
                </div>
              </Col>

              <Col span={17}>
                <div
                  className="scroll-container"
                  style={{
                    fontSize: "16px",
                    color: "#4a4a4a",
                    lineHeight: "1.8",
                    padding: "24px",
                    background: "white",
                    borderRadius: "16px",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                    border: "1px solid rgba(255,125,0,0.1)",
                    position: "relative",
                    overflowY: "auto",
                    overflowX: "hidden",
                    height: "35vh",
                    width: "82%",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -50,
                      right: -50,
                      width: "150px",
                      height: "150px",
                      background:
                        "radial-gradient(circle, rgba(255,125,0,0.08) 0%, transparent 70%)",
                      pointerEvents: "none",
                    }}
                  ></div>
                  <div
                    dangerouslySetInnerHTML={{ __html: abouttemple }}
                    className="mandir-data-content"
                    style={{ position: "relative", zIndex: 1 }}
                  ></div>
                </div>
              </Col>
            </Row>
          </div>
        </Col>

        {/* MOBILE TEMPLE DETAILS */}
        <Col xl={0} lg={0} md={24} xs={24} sm={24}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingInline: "5%",
              paddingBlock: "6%",
              background: "linear-gradient(135deg, #fff8f0 0%, #ffffff 100%)",
            }}
          >
            <div
              className="section-title"
              style={{
                fontSize: "24px",
                marginBottom: "5%",
                fontWeight: "600",
                background: "linear-gradient(135deg, #ff7d00 0%, #ff5722 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                position: "relative",
                paddingBottom: "8px",
              }}
            >
              Temple Details
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "60px",
                  height: "3px",
                  background:
                    "linear-gradient(90deg, #ff7d00 0%, transparent 100%)",
                  borderRadius: "2px",
                }}
              ></div>
            </div>

            <Row gutter={[0, 20]}>
              <Col span={24}>
                <div
                  style={{
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(255,125,0,0.2)",
                    border: "1px solid rgba(255,125,0,0.15)",
                    position: "relative",
                    background: "white",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background:
                        "linear-gradient(180deg, transparent 0%, rgba(255,125,0,0.1) 100%)",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  ></div>
                  <img loading="lazy" 
                    src={templeimgSrc}
                    style={{
                      width: "100%",
                      borderRadius: "16px",
                      display: "block",
                    }}
                   />
                </div>
              </Col>

              <Col span={24}>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#4a4a4a",
                    lineHeight: "1.7",
                    padding: "20px",
                    background: "white",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                    border: "1px solid rgba(255,125,0,0.1)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -30,
                      right: -30,
                      width: "100px",
                      height: "100px",
                      background:
                        "radial-gradient(circle, rgba(255,125,0,0.08) 0%, transparent 70%)",
                      pointerEvents: "none",
                    }}
                  ></div>
                  <div
                    dangerouslySetInnerHTML={{ __html: abouttemple }}
                    className="mandir-data-content"
                    style={{ position: "relative", zIndex: 1 }}
                  ></div>
                </div>
              </Col>
            </Row>
          </div>
        </Col>
      </div>

      {/* DIVIDER */}
      <div className="divider-spiritual"></div>

      {/* REVIEWS SECTION */}
      <div style={{ width: "100%" }} ref={reviewsRef}>
        <ReviewPuja />
      </div>

      {/* FAQ SECTION */}
      <div style={{ width: "100%" }} ref={faqRef}>
        <FAQList />
      </div>

      {/* Prasad Modal Overlay */}
      {prasadModalVisible && (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/60 backdrop-blur-md transition-opacity"
          onClick={() => { setPrasadModalVisible(false); setLocalPrasadSelected(false); }}
        >
          <div
            className="w-full md:w-1/2 h-auto bg-gradient-to-b from-orange-50 to-white rounded-t-3xl pt-2 pb-6 px-1 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 opacity-70" />

            <div className="px-5">
              {/* Selected Puja Card */}
              <div className="flex items-center gap-4 mb-6 bg-white p-3 rounded-2xl shadow-sm border border-orange-100/50">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-xl blur-sm opacity-20 -z-10" />
                  <img
                    src={pujaImage || templeimgSrc || ""}
                    className="w-14 h-14 rounded-xl object-cover border-2 border-orange-100"
                    alt="Puja"
                    loading="lazy"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white">
                    <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-orange-600 mb-0.5">Selected Package</div>
                  <div className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug">{selectedDescription ? selectedDescription.replace(/<[^>]+>/g, '').split(" ").slice(0, 6).join(" ") + "…" : "Puja Package"}</div>
                </div>
              </div>

              {/* Heading & Social Proof */}
              <div className="text-center mb-6">
                <h3 className="font-black text-xl text-slate-900 mb-3">Complete Your Devotion 🙏</h3>
                <div className="flex flex-col items-center gap-2">
                  <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5">
                    <span className="text-sm font-black text-orange-700">96% of devotees add Sacred Prasad</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5">
                    <span className="text-xs font-bold text-amber-700">Over 10,000+ Sacred Prasad opted by devotees</span>
                  </div>
                </div>
              </div>

              {/* Prasad Card (clickable toggle) */}
              <div
                className={`relative overflow-hidden flex items-center gap-4 p-4 mb-6 border-2 rounded-2xl transition-all duration-300 cursor-pointer ${
                  _localPrasadSelected ? "bg-orange-50 border-orange-500 shadow-md shadow-orange-100" : "bg-white border-slate-200 hover:border-orange-300"
                }`}
                onClick={() => setLocalPrasadSelected((p) => !p)}
              >
                {/* Selected badge */}
                {_localPrasadSelected && (
                  <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">
                    SELECTED
                  </div>
                )}

                {/* Prasad image */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-xl bg-orange-100 overflow-hidden border border-orange-200 shadow-inner">
                    <img
                      src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/Pandit%20ji%20at%20request/prasadbox.webp"
                      alt="Prasad Box"
                      className="w-full h-full object-cover transform scale-110"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = pujaImage || templeimgSrc || "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/prasad-box.jpeg"; }}
                    />
                  </div>
                  <div className="absolute -bottom-2.5 inset-x-0 mx-auto w-fit bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                    <span className="notranslate">{money(201)}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 pr-6">
                  <div className="font-bold text-slate-900 leading-tight mb-1 pr-2">
                    {abouttemple ? abouttemple.replace(/<[^>]+>/g, '').split(" ")[0] : "Holy"} Prasad Box
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    Assorted satvik prasad, blessed at the mandir &amp; delivered to your home.
                  </div>
                </div>

                {/* Checkbox */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 shrink-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    _localPrasadSelected ? "bg-orange-500 border-orange-500" : "bg-slate-50 border-slate-300"
                  }`}>
                    {_localPrasadSelected && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-3">
                <button
                  className={`w-full py-4 rounded-xl font-black text-white text-base flex items-center justify-center gap-2 transition-all ${
                    _localPrasadSelected
                      ? "bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 scale-[1.02]"
                      : "bg-gradient-to-r from-orange-400 to-red-500"
                  }`}
                  onClick={() => { proceedToPayment(true); setLocalPrasadSelected(false); }}
                >
                  {_localPrasadSelected ? "Continue with Prasad" : "Add Prasad to Complete"}
                  <ArrowForwardIos sx={{ fontSize: 16 }} />
                </button>

                <button
                  className="text-xs font-bold text-black underline decoration-slate-300 underline-offset-4 hover:text-slate-600 pb-2 mx-auto"
                  onClick={() => { proceedToPayment(false); setLocalPrasadSelected(false); }}
                >
                  No thanks, I will skip the sacred prasad
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StickyNavigationPage;

