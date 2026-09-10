"use client";

import { Col } from "antd";
import { useState } from "react";

const BenefitCard = ({
  benefitheading,
  benefitdescription,
  wordLimit,
}: {
  benefitheading: string;
  benefitdescription: string;
  wordLimit: number;
}) => {
  const words = benefitdescription.split(" ");
  const truncatedText = words.slice(0, wordLimit).join(" ");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const toggleReadMore = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Desktop View */}
      <Col xl={24} lg={24} md={24} xs={0} sm={0}>
        <div
          style={{
            background: "linear-gradient(145deg, #FFFFFF 0%, #F8F9FA 100%)",
            height: "auto",
            boxShadow: "0px 2px 12px rgba(0, 0, 0, 0.08)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            borderRadius: "16px",
            padding: "4%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            cursor: "default",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-6px)";
            e.currentTarget.style.boxShadow =
              "0px 8px 24px rgba(0, 0, 0, 0.12)";
            e.currentTarget.style.borderColor = "rgba(255, 107, 53, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0px 2px 12px rgba(0, 0, 0, 0.08)";
            e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.06)";
          }}
        >
          {/* Subtle decorative accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "80px",
              height: "80px",
              background:
                "linear-gradient(135deg, rgba(255, 107, 53, 0.04), transparent)",
              borderRadius: "0 16px 0 100%",
            }}
          />

          {/* Header with icon */}
          <div
            style={{
              display: "flex",
              justifyContent: "start",
              alignItems: "center",
              gap: "3%",
              marginBottom: "2%",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FFF5F0 0%, #FFE8DC 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px",
                boxShadow: "0px 2px 8px rgba(255, 107, 53, 0.1)",
              }}
            >
              <img loading="lazy" 
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_rlip3urlip3urlip-removebg-preview.webp"
                alt="Benefit Icon"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
               />
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#2C3E50",
                lineHeight: "1.4",
              }}
            >
              {benefitheading}
            </div>
          </div>

          {/* Subtle divider line */}
          <div
            style={{
              width: "100%",
              height: "1px",
              background:
                "linear-gradient(90deg, rgba(255, 107, 53, 0.15), rgba(0,0,0,0.05), transparent)",
              marginBottom: "3%",
            }}
          />

          {/* Description */}
          <div
            style={{
              fontSize: "16px",
              textAlign: "justify",
              color: "#4A5568",
              lineHeight: "1.7",
              position: "relative",
              zIndex: 1,
            }}
          >
            {isExpanded
              ? benefitdescription.replace(/<[^>]*>?/gm, "")
              : `${truncatedText.replace(/<[^>]*>?/gm, "")}...`}
            <span
              onClick={toggleReadMore}
              style={{
                color: "#FF6B35",
                cursor: "pointer",
                fontWeight: 600,
                marginLeft: "5px",
                transition: "all 0.2s ease",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.color = "#FF8C42";
                e.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.color = "#FF6B35";
                e.currentTarget.style.textDecoration = "none";
              }}
            >
              {isExpanded ? "Read Less" : "Read More"}
            </span>
          </div>
        </div>
      </Col>

      {/* Mobile View */}
      <Col xl={0} lg={0} md={0} xs={24} sm={24}>
        <div
          style={{
            background: "linear-gradient(145deg, #FFFFFF 0%, #F8F9FA 100%)",
            height: "auto",
            boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.08)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            borderRadius: "14px",
            padding: "5%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle decorative accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "60px",
              height: "60px",
              background:
                "linear-gradient(135deg, rgba(255, 107, 53, 0.04), transparent)",
              borderRadius: "0 14px 0 100%",
            }}
          />

          {/* Header with icon */}
          <div
            style={{
              display: "flex",
              justifyContent: "start",
              alignItems: "center",
              gap: "3%",
              marginBottom: "3%",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FFF5F0 0%, #FFE8DC 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px",
                boxShadow: "0px 2px 6px rgba(255, 107, 53, 0.1)",
              }}
            >
              <img loading="lazy" 
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BookPuja/Gemini_Generated_Image_rlip3urlip3urlip-removebg-preview.webp"
                alt="Benefit Icon"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
               />
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#2C3E50",
                lineHeight: "1.4",
              }}
            >
              {benefitheading}
            </div>
          </div>

          {/* Subtle divider line */}
          <div
            style={{
              width: "100%",
              height: "1px",
              background:
                "linear-gradient(90deg, rgba(255, 107, 53, 0.15), rgba(0,0,0,0.05), transparent)",
              marginBottom: "3%",
            }}
          />

          {/* Description */}
          <div
            style={{
              fontSize: "14px",
              textAlign: "justify",
              color: "#4A5568",
              lineHeight: "1.7",
              position: "relative",
              zIndex: 1,
            }}
          >
            {isExpanded
              ? benefitdescription.replace(/<[^>]*>?/gm, "")
              : `${truncatedText.replace(/<[^>]*>?/gm, "")}...`}
            <span
              onClick={toggleReadMore}
              style={{
                color: "#FF6B35",
                cursor: "pointer",
                fontWeight: 600,
                marginLeft: "5px",
                display: "inline-block",
              }}
            >
              {isExpanded ? "Read Less" : "Read More"}
            </span>
          </div>
        </div>
      </Col>
    </>
  );
};

export default BenefitCard;
