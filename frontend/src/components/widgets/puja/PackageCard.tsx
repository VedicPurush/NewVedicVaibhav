"use client";

import React, { useState } from "react";
import { useMoney } from "@/lib/currency";
import { Col, Modal } from "antd";
import ArrowRightAlt from '@mui/icons-material/ArrowRightAlt';
import RadioButtonChecked from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import Close from '@mui/icons-material/Close';

interface PackageCardProps {
  backgroundcolor: string;
  textcolor: string;
  packagename: string;
  packageprice: number;
  persons: string;
  imgSrc: string;
  description: string;
  buttoncolor: string;
  onSelectPackage: () => void;
  isSelected: boolean;
  onClick: () => void;
}

const PackageCard: React.FC<PackageCardProps> = ({

  packagename,
  packageprice,
  persons,
  imgSrc,
  description,

  onSelectPackage,
  isSelected,
  onClick,
}) => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleParticipate = () => {
    onSelectPackage();
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Desktop View */}
      <Col xl={24} lg={24} md={24} xs={0} sm={0}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: "16px",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, rgba(255,250,245,0.95), rgba(255,248,240,0.95))",
            border: isSelected
              ? "2px solid #FF7D00"
              : "1px solid rgba(255,125,0,0.2)",
            boxShadow: isSelected
              ? "0 6px 24px rgba(255,125,0,0.25)"
              : "0 2px 12px rgba(0,0,0,0.08)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(255,125,0,0.15)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          {/* Decorative corner gradient */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "120px",
              height: "80px",
              background:
                "linear-gradient(225deg, rgba(255,125,0,0.08) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          <div
            style={{
              display: "flex",
              width: "100%",
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Content Section */}
            <div
              style={{
                display: "flex",
                width: "65%",
                fontSize: "18px",
                fontWeight: "600",
                flexDirection: "column",
                color: "#2D1810",
                justifyContent: "space-between",
                padding: "7px 14px",
              }}
            >
              <div className="flex gap-3">
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    background: "linear-gradient(135deg, #8B4513, #FF7D00)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {packagename}
                </div>

                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "100px",
                    backgroundColor: "rgba(255,125,0,0.12)",
                    fontWeight: "600",
                    fontSize: "10px",
                    color: "#8B4513",
                    borderRadius: "20px",
                    paddingInline: "12px",
                    paddingBlock: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "fit-content",
                    whiteSpace: "nowrap",
                    border: "1px solid rgba(255,125,0,0.2)",
                    zIndex: 10,
                  }}
                >
                  {persons}
                </div>
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontSize: "26px",
                  fontWeight: "700",
                  color: "#A21B1B",
                  letterSpacing: "-0.5px",
                }}
              >
                {money(packageprice)}
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: "500",
                    color: "rgba(0,0,0,0.5)",
                  }}
                >
                  /-
                </span>
              </div>

              {/* About Package Link */}
              <div
                onClick={showModal}
                style={{
                  marginTop: "16px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#FF7D00",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.3s ease",
                  width: "fit-content",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#FF9500";
                  e.currentTarget.style.gap = "8px";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#FF7D00";
                  e.currentTarget.style.gap = "4px";
                }}
              >
                About Package
                <ArrowRightAlt style={{ fontSize: "18px" }} />
              </div>
            </div>

            {/* Image Section */}
            <div
              style={{
                width: "50%",
                display: "flex",
                justifyContent: "end",
                alignItems: "start",
                padding: "0px",
              }}
            >
              <img loading="lazy" 
                src={imgSrc}
                style={{
                  borderRadius: "12px",
                  width: "100%",
                  objectFit: "cover",
                }}
                alt={`${packagename} Image`}
               />
            </div>
          </div>

          {/* Participate Button */}
          <div
            style={{
              width: "100%",
              cursor: "pointer",
              padding: "8px",
              justifyContent: "center",
              display: "flex",
              alignItems: "center",
              color: "white",
              background:
                "linear-gradient(90deg, #FF850A 0%, #FF9B21 35%, #FFAD3F 82%)",
              gap: "8px",
              fontWeight: "600",
              fontSize: "15px",
              letterSpacing: "0.3px",
              transition: "all 0.3s ease",
              borderTop: "1px solid rgba(255,125,0,0.2)",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 2px 8px 0 #FFD69944", // soft orange shadow like your screenshot
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(90deg, #FF850A 0%, #FF9B21 35%, #FFAD3F 82%,)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(90deg, #FF850A 0%, #FF9B21 35%, #FFAD3F 82%)";
            }}
            onClick={onSelectPackage}
          >
            <span style={{ position: "relative", zIndex: 2 }}>
              Participate Now
            </span>
            <ArrowRightAlt style={{ position: "relative", zIndex: 2 }} />
          </div>
        </div>
      </Col>

      {/* Mobile View */}
      <Col xl={0} lg={0} md={0} xs={24} sm={24}>
        <div
          onClick={onClick}
          style={{
            display: "flex",
            position: "relative",
            flexDirection: "column",
            borderRadius: "14px",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, rgba(255,250,245,0.95), rgba(255,248,240,0.95))",
            border: isSelected
              ? "2px solid #FF7D00"
              : "1px solid rgba(255,125,0,0.2)",
            boxShadow: isSelected
              ? "0 4px 16px rgba(255,125,0,0.25)"
              : "0 2px 8px rgba(0,0,0,0.08)",
            transition: "all 0.3s ease",
            cursor: "pointer",
          }}
        >
          {/* Selection Radio */}


          {/* Decorative gradient */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "80px",
              height: "80px",
              background:
                "linear-gradient(225deg, rgba(255,125,0,0.1) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Image */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "end",
              alignItems: "start",
              padding: "3px",
              // position: "absolute",
              top: "6px",
              right: "6px",
            }}
          >
            <img loading="lazy" 
              src={imgSrc}
              style={{
                borderRadius: "10px",
                width: "60%",
              }}
              alt={`${packagename} Image`}
             />

            <div
              style={{
                backgroundColor: "rgba(162,27,27,0.12)", // soft maroon tint
                fontWeight: "600",
                fontSize: "10px",
                color: "#A21B1B", // deep maroon text
                textAlign: "end",
                position: "absolute",
                top: "12px",
                left: "12px",
                zIndex: 10,
                borderRadius: "20px",
                paddingInline: "4px",
                paddingRight: "6px",
                paddingBlock: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                // width: "50%",
                border: "1px solid rgba(162,27,27,0.25)", // subtle maroon border
              }}
            >
              {isSelected ? (
                <RadioButtonChecked
                  style={{ fontSize: "16px", color: "#A21B1B" }}
                />
              ) : (
                <RadioButtonUnchecked
                  style={{ fontSize: "16px", color: "rgba(162,27,27,0.5)" }}
                />
              )}
              {persons}
            </div>
          </div>

          <div style={{ display: "flex", width: "100%", position: "relative" }}>
            {/* Content */}
            <div
              style={{
                display: "flex",
                width: "100%",
                fontSize: "14px",
                fontWeight: "600",
                flexDirection: "column",
                color: "#2D1810",
                justifyContent: "center",
                alignItems: "center",
                paddingTop: "2px",
                paddingRight: "5%",
              }}
            >
              <div className="flex justify-center items-center gap-2">
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    background: "linear-gradient(135deg, #8B4513, #FF7D00)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {packagename}
                </div>

                {/* <div
                style={{
                  backgroundColor: "rgba(162,27,27,0.12)", // soft maroon tint
                  fontWeight: "600",
                  fontSize: "10px",
                  color: "#A21B1B", // deep maroon text
                  textAlign: "center",
                  borderRadius: "20px",
                  paddingInline: "2px",
                  paddingBlock: "4px",
                  display: "inline-block",
                  width: "100%",
                  border: "1px solid rgba(162,27,27,0.25)", // subtle maroon border
                }}
              >
                {persons}
              </div> */}
              </div>

              <div
                style={{
                  marginTop: "0px",
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#A21B1B",
                }}
              >
                {money(packageprice)}
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "rgba(0,0,0,0.5)",
                  }}
                >
                  /-
                </span>
              </div>

              {/* About Package Link */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  showModal();
                }}
                style={{
                  marginTop: "2px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#FF7D00",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  paddingBottom: "4px",
                }}
              >
                View Details
                <ArrowRightAlt style={{ fontSize: "14px" }} />
              </div>
            </div>
          </div>
        </div>
      </Col>

      {/* Modal for Package Details */}
      <Modal
        open={isModalOpen}
        onCancel={handleModalClose}
        footer={null}
        closeIcon={<Close style={{ color: "#8B4513" }} />}
        centered
        width={600}
        styles={{
          body: { padding: 0 },
          content: {
            borderRadius: "20px",
            overflow: "hidden",
            background: "linear-gradient(135deg, #FFF8F0, #FFFAF5)",
          },
        }}
      >
        <div
          style={{
            position: "relative",
            background:
              "linear-gradient(135deg, rgba(255,250,245,1), rgba(255,248,240,1))",
          }}
        >
          {/* Decorative elements */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100px",
              height: "100px",
              background:
                "linear-gradient(135deg, rgba(255,125,0,0.1) 0%, transparent 70%)",
              borderRadius: "0 0 100% 0",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: "120px",
              height: "120px",
              background:
                "linear-gradient(225deg, rgba(255,184,0,0.08) 0%, transparent 70%)",
              borderRadius: "100% 0 0 0",
            }}
          />

          {/* Header with Image */}
          <div
            style={{
              position: "relative",
              padding: "16px",
              paddingLeft: "24px",
              borderBottom: "2px solid rgba(255,125,0,0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <img loading="lazy" 
                src={imgSrc}
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "16px",
                  objectFit: "cover",
                  boxShadow: "0 4px 16px rgba(255,125,0,0.2)",
                  border: "2px solid rgba(255,125,0,0.2)",
                }}
                alt={packagename}
               />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "26px",
                    fontWeight: "700",
                    background: "linear-gradient(135deg, #8B4513, #FF7D00)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    marginBottom: "4px",
                  }}
                >
                  {packagename}
                </div>
                <div
                  style={{
                    backgroundColor: "rgba(255,125,0,0.12)",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "#8B4513",
                    borderRadius: "20px",
                    paddingInline: "16px",
                    paddingBlock: "6px",
                    display: "inline-block",
                    border: "1px solid rgba(255,125,0,0.2)",
                    marginBottom: "8px",
                  }}
                >
                  {persons}
                </div>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "#A21B1B",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {money(packageprice)}
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: "500",
                      color: "rgba(0,0,0,0.5)",
                    }}
                  >
                    /-
                  </span>
                </div>
              </div>
            </div>

            {/* Decorative divider */}
            <div
              style={{
                width: "60px",
                height: "3px",
                background:
                  "linear-gradient(90deg, #FF7D00, rgba(255,125,0,0.3))",
                borderRadius: "2px",
                marginTop: "16px",
              }}
            />
          </div>

          {/* Description */}
          <div
            style={{
              padding: "32px",
              maxHeight: "300px",
              overflowY: "auto",
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "#8B4513",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "4px",
                  height: "20px",
                  background: "linear-gradient(180deg, #FF7D00, #FFB800)",
                  borderRadius: "2px",
                }}
              />
              Package Details
            </div>
            <div
              style={{
                fontSize: "14px",
                lineHeight: "1.8",
                color: "rgba(0,0,0,0.75)",
                textAlign: "justify",
              }}
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>

          {/* Participate Button */}
          <div style={{ padding: "24px 32px 32px" }}>
            <div
              onClick={handleParticipate}
              style={{
                width: "100%",
                cursor: "pointer",
                padding: "16px",
                justifyContent: "center",
                display: "flex",
                alignItems: "center",
                color: "white",
                background: "linear-gradient(135deg, #FF7D00, #FF9500)",
                gap: "8px",
                fontWeight: "600",
                fontSize: "16px",
                letterSpacing: "0.3px",
                borderRadius: "12px",
                boxShadow: "0 4px 16px rgba(255,125,0,0.3)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(255,125,0,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 16px rgba(255,125,0,0.3)";
              }}
            >
              <span style={{ position: "relative", zIndex: 2 }}>
                Participate Now
              </span>
              <ArrowRightAlt style={{ position: "relative", zIndex: 2 }} />
            </div>
          </div>
        </div>
      </Modal>

      <style>{`
        .ant-modal-content {
          box-shadow: 0 8px 32px rgba(255,125,0,0.15) !important;
        }
        
        .ant-modal-close {
          top: 16px !important;
          right: 16px !important;
        }
        
        .ant-modal-close:hover {
          background-color: rgba(255,125,0,0.1) !important;
        }
      `}</style>
    </>
  );
};

export default PackageCard;
