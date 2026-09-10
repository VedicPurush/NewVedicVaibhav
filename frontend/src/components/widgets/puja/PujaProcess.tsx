"use client";

import { Col, Row } from "antd";
import { useState, useEffect } from "react";

const PujaProcess = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 6);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    {
      img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/1point.svg",
      title: "Select Your Pooja",
      desc: "Choose the Pooja that aligns with your spiritual goals",
      number: "01",
    },
    {
      img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/2point.svg",
      title: "Choose a Package",
      desc: "Pick a package that suits your needs.",
      number: "02",
    },
    {
      img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/3point.svg",
      title: "Provide Devotee Details",
      desc: "Enter essential details to personalize your Pooja",
      number: "03",
    },
    {
      img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/4point.svg",
      title: "Receive Puja Reminder",
      desc: "Stay informed with timely Pooja reminders",
      number: "04",
    },
    {
      img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/5point.svg",
      title: "Get Puja Media",
      desc: "Receive high-quality video and photos on WhatsApp",
      number: "05",
    },
    {
      img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/6point.svg",
      title: "Receive Prasad",
      desc: "Experience divine blessings delivered to your home",
      number: "06",
    },
  ];

  return (
    <>
      <style>
        {`
          @keyframes slideProgress {
            from { width: 0%; }
            to { width: 100%; }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes checkmark {
            0% { transform: scale(0) rotate(0deg); }
            50% { transform: scale(1.2) rotate(180deg); }
            100% { transform: scale(1) rotate(360deg); }
          }
        `}
      </style>

      {/* Desktop View */}
      <Col xl={24} lg={24} md={24} xs={0} sm={0}>
        <div
          style={{
            padding: "20px 0",
            position: "relative",
          }}
        >
          {/* Progress Line */}
          <div
            style={{
              position: "absolute",
              top: "48px",
              left: "0",
              right: "0",
              height: "3px",
              background:
                "linear-gradient(90deg, rgba(255, 140, 0, 0.15) 0%, rgba(255, 99, 71, 0.15) 100%)",
              zIndex: 0,
              margin: "0 40px",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #FF8C00 0%, #FF6347 100%)",
                width: `${(activeStep / 5) * 100}%`,
                transition: "width 0.5s ease",
                animation: "slideProgress 0s ease-in-out infinite",
              }}
            />
          </div>

          <Row gutter={[16, 0]} justify="space-between">
            {steps.map((step, index) => (
              <Col key={index} style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    position: "relative",
                    zIndex: 1,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={() => setActiveStep(index)}
                >
                  {/* Circle Container */}
                  <div
                    style={{
                      width: "76px",
                      height: "76px",
                      borderRadius: "50%",
                      background:
                        index <= activeStep
                          ? "linear-gradient(135deg, #FFF2B2 0%, #FFD99A 100%)"
                          : "#f5f5f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                      border:
                        index === activeStep
                          ? "3px solid rgba(255, 140, 0, 0.3)"
                          : "none",
                      boxShadow:
                        index <= activeStep
                          ? "0 8px 20px rgba(255, 140, 0, 0.25)"
                          : "0 2px 8px rgba(0,0,0,0.08)",
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      animation:
                        index === activeStep
                          ? "pulse 2s ease-in-out infinite"
                          : "none",
                    }}
                  >
                    {/* Checkmark for completed steps */}
                    {index < activeStep && (
                      <div
                        style={{
                          position: "absolute",
                          top: "-4px",
                          right: "-4px",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#4CAF50",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(76, 175, 80, 0.4)",
                          animation: "checkmark 0.5s ease",
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 13l4 4L19 7"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}

                    <img loading="lazy" 
                      src={step.img}
                      alt={step.title}
                      style={{
                        width: "38px",
                        height: "38px",
                        filter:
                          index <= activeStep
                            ? "brightness(1) invert(0)"
                            : "grayscale(1) opacity(0.4)",
                        transition: "all 0.3s ease",
                      }}
                     />
                  </div>

                  {/* Step Number */}
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: index === activeStep ? "700" : "600",
                      color:
                        index === activeStep
                          ? "#D35400"
                          : index < activeStep
                          ? "#FF8C00"
                          : "#999",
                      marginBottom: "6px",
                      letterSpacing: "1px",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {step.number}
                  </div>

                  {/* Title */}
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: index <= activeStep ? "#1a1a1a" : "#666",
                      marginBottom: "6px",
                      lineHeight: "1.3",
                      transition: "all 0.3s ease",
                      minHeight: "36px",
                    }}
                  >
                    {step.title}
                  </div>

                  {/* Description */}
                  <div
                    style={{
                      fontSize: "11px",
                      color:
                        index <= activeStep
                          ? "rgba(0,0,0,0.6)"
                          : "rgba(0,0,0,0.4)",
                      lineHeight: "1.4",
                      transition: "all 0.3s ease",
                      maxWidth: "140px",
                    }}
                  >
                    {step.desc}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </Col>

      {/* Mobile View */}
      <Col xl={0} lg={0} md={0} xs={24} sm={24}>
        <div style={{ padding: "16px 0", position: "relative" }}>
          {/* Vertical Progress Line */}
          <div
            style={{
              position: "absolute",
              left: "32px",
              top: "0",
              bottom: "0",
              width: "3px",
              background:
                "linear-gradient(180deg, rgba(255, 140, 0, 0.15) 0%, rgba(255, 99, 71, 0.15) 100%)",
              zIndex: 0,
            }}
          >
            <div
              style={{
                width: "100%",
                background: "linear-gradient(180deg, #FF8C00 0%, #FF6347 100%)",
                height: `${(activeStep / 5) * 100}%`,
                transition: "height 0.5s ease",
              }}
            />
          </div>

          <Row gutter={[0, 20]}>
            {steps.map((step, index) => (
              <Col span={24} key={index}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    position: "relative",
                    zIndex: 1,
                  }}
                  onClick={() => setActiveStep(index)}
                >
                  {/* Circle */}
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      minWidth: "64px",
                      borderRadius: "50%",
                      background:
                        index <= activeStep
                          ? "linear-gradient(135deg, #FFF2B2 0%, #FFD99A 100%)"
                          : "#f5f5f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border:
                        index === activeStep
                          ? "3px solid rgba(255, 140, 0, 0.3)"
                          : "none",
                      boxShadow:
                        index <= activeStep
                          ? "0 6px 16px rgba(255, 140, 0, 0.25)"
                          : "0 2px 8px rgba(0,0,0,0.08)",
                      transition: "all 0.4s ease",
                      position: "relative",
                    }}
                  >
                    {index < activeStep && (
                      <div
                        style={{
                          position: "absolute",
                          top: "-2px",
                          right: "-2px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "#4CAF50",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(76, 175, 80, 0.4)",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 13l4 4L19 7"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}

                    <img loading="lazy" 
                      src={step.img}
                      alt={step.title}
                      style={{
                        width: "32px",
                        height: "32px",
                        filter:
                          index <= activeStep
                            ? "brightness(1) invert(0)"
                            : "grayscale(1) opacity(0.4)",
                        transition: "all 0.3s ease",
                      }}
                     />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingTop: "4px" }}>
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        color: index <= activeStep ? "#FF8C00" : "#999",
                        marginBottom: "4px",
                        letterSpacing: "1px",
                      }}
                    >
                      {step.number}
                    </div>

                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: "600",
                        color: index <= activeStep ? "#1a1a1a" : "#666",
                        marginBottom: "4px",
                        lineHeight: "1.3",
                      }}
                    >
                      {step.title}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color:
                          index <= activeStep
                            ? "rgba(0,0,0,0.6)"
                            : "rgba(0,0,0,0.4)",
                        lineHeight: "1.5",
                      }}
                    >
                      {step.desc}
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </Col>
    </>
  );
};

export default PujaProcess;
