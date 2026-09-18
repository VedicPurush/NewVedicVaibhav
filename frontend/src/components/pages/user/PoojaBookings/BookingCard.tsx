"use client";

import { Avatar, Col, Row } from "antd";
import { paidMoney } from "@/lib/currency";
import "./BookingCard.css";
import ArrowDropDown from "@mui/icons-material/ArrowDropDown";
import ArrowDropUp from "@mui/icons-material/ArrowDropUp";
import CheckCircle from "@mui/icons-material/CheckCircle";
import { useState } from "react";
import Swal from "sweetalert2";

const BookingCard = ({
  completed,
  imgSrc,
  date,
  time,
  bookeddate,
  poojaname,
  mandirname,
  pujapackage,
  price,
  currency,
  chargedAmount,
  PersonName,
  Gotra,
  mobilenumber,
  address,
  email,
  pujaBooked,
  trackurl,
  poojaLink,
  isPending,
}: {
  address: string;
  mobilenumber: number;
  completed: boolean;
  imgSrc: string;
  date: string;
  time: string;
  bookeddate: string;
  poojaname: string;
  mandirname: string;
  pujapackage: string;
  price: number;
  /** Presentment fields from the booking record. Receipts must be shown in the
   *  currency the devotee ACTUALLY PAID IN, never re-priced by today's picker. */
  currency?: string | null;
  chargedAmount?: number | null;
  PersonName: string[];
  Gotra: string[];
  email: string;
  trackurl: string;
  pujaBooked: boolean;
  poojaLink: string;
  isPending?: boolean;
}) => {
  const [details, setShowDetails] = useState<boolean>(false);

  const toggleDetails = () => {
    setShowDetails(!details);
  };

  // Configure SweetAlert2 for toast notifications
  const Toast = Swal.mixin({
    toast: true,
    position: "center", // Center the toast
    showConfirmButton: false,
    timer: 1500,
    timerProgressBar: true,
    customClass: {
      popup: "attractive-toast-popup",
    },
    didOpen: (toast) => {
      toast.style.background = "linear-gradient(135deg, #A4EBF3, #83E2BC)"; // Custom gradient background
      toast.style.color = "#ffffff"; // White text color
      toast.style.boxShadow = "0px 0px 10px rgba(0,0,0,0.2)"; // Drop shadow
    },
  });

  /**
   * Prasad is an optional add-on, and a booking without it has no delivery
   * address. Offering "Track Prasad" on those bookings only ever produced a
   * "you have not opted for prasad" toast — a button whose sole outcome is
   * telling you it does not apply. It is hidden instead.
   */
  const prasadOpted = address !== "No Address Selected";

  // Enhanced handleTrackPrasad function
  const handleTrackPrasad = () => {
    if (address === "No Address Selected") {
      // Display informational toast
      Toast.fire({
        icon: "info",
        title: "<strong>You have not opted for prasad</strong>",
      });
    } else if (trackurl && trackurl.trim() !== "") {
      // Display success toast and open the track URL
      Toast.fire({
        iconHtml: "✅", // Custom success icon
        title: "<strong>Getting Data, Please Wait...</strong>",
        customClass: {
          popup: "attractive-toast-popup",
        },
        didOpen: (toast) => {
          toast.style.background = "linear-gradient(135deg, #28a745, #28d745)"; // Custom gradient background for success
          toast.style.color = "#ffffff"; // White text color
          toast.style.boxShadow = "0px 0px 20px rgba(0,0,0,0.3)"; // Stronger shadow
          toast.style.fontSize = "18px"; // Larger text
        },
      }).then(() => {
        // Open the track URL in a new tab
        window.open(trackurl, "_blank", "noopener,noreferrer");
      });
    } else {
      // Handle cases where trackurl is missing or invalid
      Toast.fire({
        icon: "error",
        title:
          "<strong>No tacking info available at the moment. You will be notified once it is available.</strong>",
      });
    }
  };

  const now = new Date();
  const currentDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  // Check if today is the day
  const isToday = currentDate === date && currentTime === time;

  const calculateProgress = () => {
    if (poojaLink !== null) return 100;
    if (completed) return 60;
    if (isToday) return 30;
    if (pujaBooked) return 10;
    return 10;
  };

  const progress = calculateProgress();

  /**
   * The four tracking steps, shared by the phone card's dot strip and the full
   * list inside its details panel so the two can never disagree. "Started" and
   * "Completed" both key off `completed` — that is the existing behaviour, not
   * a new rule.
   */
  const steps = [
    { short: "Booked", full: "Puja Booked", caption: bookeddate, done: pujaBooked },
    { short: "Started", full: "Puja Started", caption: date, done: completed },
    { short: "Done", full: "Puja Completed", caption: date, done: completed },
    {
      short: "Video",
      full: "Picture & Video Received",
      caption: poojaLink !== null ? "Click See Details to view" : "Coming Soon",
      done: poojaLink !== null,
    },
  ];

  const statusLabel = completed ? "Completed" : isPending ? "Pending Payment" : "In Process";
  const statusColor = completed ? "#1AA11F" : isPending ? "#faad14" : "#FFA500";

  return (
    <>
      <Col lg={24} xl={24} xs={0} sm={0} md={24}>
        <div
          style={{
            boxShadow: "0px 0px 4px 0px rgba(0,0,0,0.25)",
            borderRadius: "12px",
            marginBottom: "2%",
            paddingBlock: "3%",
            backgroundColor: "white",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0% 3%",
            }}
          >
            <div style={{ display: "flex", gap: "4px" }}>
              <Avatar
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/profile/diya.png"
                size="large"
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                {completed ? (
                  <div
                    className="status completed"
                    style={{ fontFamily: "Montserrat", fontSize: "14px" }}
                  >
                    Completed
                  </div>
                ) : isPending ? (
                  <div
                    className="status pending"
                    style={{ fontFamily: "Montserrat", fontSize: "14px", color: "#faad14" }}
                  >
                    Pending Payment
                  </div>
                ) : (
                  <div
                    className="status in-process"
                    style={{ fontFamily: "Montserrat", fontSize: "14px" }}
                  >
                    In Process
                  </div>
                )}
                <div style={{ fontSize: "12px", color: "rgba(0,0,0,0.6)" }}>
                  Pooja scheduled on {date}
                  {time ? (
                    <>
                      , <strong>(IST {time})</strong>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Whole row is conditional: with the review button gone, Track
                Prasad is its only occupant, so an unopted booking would
                otherwise render an empty 20px-offset flex row. */}
            {prasadOpted && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  marginTop: "20px",
                  gap: "8px", // optional spacing between elements
                }}
              >
                {/* Track Prasad Button */}
                <div
                  onClick={handleTrackPrasad}
                  style={{
                    cursor: "pointer",
                    fontWeight: "bold",
                    borderRadius: "50px",
                    gap: "8px",
                    width: "150px", // fixed width for better alignment
                    boxShadow: "0px 0px 4px 0px rgba(0,0,0,0.25)",
                    border: "1px solid rgba(26, 161, 31, 0.6)",
                    color: "rgba(26, 161, 31, 0.6)",
                    fontFamily: "Montserrat",
                    padding: "2px 4px",
                  }}
                  className="flex md:flex-row flex-col items-center justify-center"
                >
                  Track Prasad
                  <img
                    loading="lazy"
                    src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/truck.svg"
                    alt="truck"
                    style={{ width: "20px", height: "20px" }}
                  />
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "end",
              marginTop: "2%",
              padding: "0% 3%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3%",
                width: "100%",
              }}
            >
              <img
                loading="lazy"
                src={imgSrc}
                style={{ width: "30%", borderRadius: "12px" }}
              ></img>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "16px", fontWeight: "600", lineHeight: "1.2" }}>
                  {poojaname}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "rgba(0,0,0,0.6)",
                    marginTop: "4px",
                  }}
                >
                  Temple : <span style={{ color: "#FF6505", fontWeight: "500" }}>{mandirname}</span>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "rgba(0,0,0,0.6)",
                    marginTop: "2px",
                  }}
                >
                  Package : <span style={{ color: "#FF6505", fontWeight: "500" }}>{pujapackage}</span>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    marginTop: "4px",
                    fontWeight: "600",
                    color: address === "No Address Selected" ? "#94a3b8" : "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: address === "No Address Selected" ? "#94a3b8" : "#16a34a",
                    }}
                  ></span>
                  {address === "No Address Selected" ? "Prasad not opted" : "Prasad Opted"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                fontFamily: "Montserrat",
                fontSize: "18px",
                justifyContent: "end",
                alignItems: "end",
                width: "100%",
                height: "100%",
              }}
            >
              {paidMoney({ amount: price, currency, chargedAmount })}
            </div>
          </div>

          <div style={{ width: "100%", marginTop: "4%", padding: "0% 3%" }}>
            {/* Progress Bar Track */}
            <div
              style={{
                width: "100%",
                height: "10px",
                backgroundColor: "#d3d3d3",
                borderRadius: "5px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Filled Section */}
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(to right, #E8743B, #7A0F1F)",
                  position: "relative",
                  borderTopRightRadius: "12px",
                  borderBottomRightRadius: "12px",
                }}
              >
                {/* Progress Icon */}
                <div
                  style={{
                    width: "20px",
                    height: "20px",

                    borderRadius: "50%",
                    position: "absolute",
                    top: "0px",
                    right: "-10px",
                  }}
                >
                  <img
                    loading="lazy"
                    src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/trident.svg"
                  ></img>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "10px",
                alignItems: "start",
              }}
            >
              {/* Booked date */}
              <div
                style={{
                  justifyContent: "center",
                  alignItems: "start",
                  fontSize: "14px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "14px",
                    display: "flex",
                    gap: "2px",
                  }}
                >
                  <span style={{ fontFamily: "Montserrat", fontSize: "12px" }}>
                    {" "}
                    Puja Booked
                  </span>
                  {pujaBooked ? (
                    <span
                      style={{
                        color: "green",
                        fontWeight: pujaBooked ? "bold" : "normal",
                      }}
                    >
                      <CheckCircle style={{ fontSize: "14px" }} />
                    </span>
                  ) : (
                    <></>
                  )}
                </div>

                <div style={{ color: "rgba(0,0,0,0.4)", fontSize: "12px" }}>
                  {bookeddate}
                </div>
              </div>

              {/* started Date */}

              <div
                style={{
                  justifyContent: "center",
                  alignItems: "start",
                  fontSize: "14px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "14px",
                    display: "flex",
                    gap: "2px",
                  }}
                >
                  <span style={{ fontFamily: "Montserrat", fontSize: "12px" }}>
                    {" "}
                    Puja Started
                  </span>
                  {completed ? (
                    <span
                      style={{
                        color: "green",
                      }}
                    >
                      <CheckCircle style={{ fontSize: "14px" }} />
                    </span>
                  ) : (
                    <></>
                  )}
                </div>

                <div style={{ color: "rgba(0,0,0,0.4)", fontSize: "12px" }}>
                  {date}
                </div>
              </div>

              {/* Completed Date */}

              <div
                style={{
                  justifyContent: "center",
                  alignItems: "start",
                  fontSize: "14px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "14px",
                    display: "flex",
                    gap: "2px",
                  }}
                >
                  <span style={{ fontFamily: "Montserrat", fontSize: "12px" }}>
                    {" "}
                    Puja Completed
                  </span>
                  {completed ? (
                    <span
                      style={{
                        color: "green",
                      }}
                    >
                      <CheckCircle style={{ fontSize: "14px" }} />
                    </span>
                  ) : (
                    <></>
                  )}
                </div>

                <div style={{ color: "rgba(0,0,0,0.4)", fontSize: "12px" }}>
                  {date}
                </div>
              </div>

              {/* Picture Recieved*/}
              <div
                style={{
                  justifyContent: "center",
                  alignItems: "start",
                  fontSize: "14px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "14px",
                    display: "flex",
                    gap: "2px",
                  }}
                >
                  <span style={{ fontFamily: "Montserrat", fontSize: "12px" }}>
                    Picture & Video Received
                  </span>
                  {poojaLink !== null ? (
                    <span
                      style={{
                        color: "green",
                      }}
                    >
                      <CheckCircle style={{ fontSize: "14px" }} />
                    </span>
                  ) : (
                    <></>
                  )}
                </div>

                {poojaLink !== null ? (
                  <div style={{ color: "rgba(0,0,0,0.4)", fontSize: "12px" }}>
                    See Full Details
                  </div>
                ) : (
                  <div style={{ color: "rgba(0,0,0,0.4)", fontSize: "12px" }}>
                    Coming Soon
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              height: "1px",
              backgroundColor: "rgba(0,0,0,0.1)",
              marginTop: "2%",
            }}
          ></div>

          <div
            onClick={toggleDetails}
            style={{ width: "100%", textAlign: "end", marginBlock: "0.5%" }}
          >
            {details ? (
              <div
                style={{
                  color: "#FF6505",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "end",
                  cursor: "pointer",
                }}
              >
                Hide Details <ArrowDropUp />{" "}
              </div>
            ) : (
              <div
                style={{
                  color: "#FF6505",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "end",
                  cursor: "pointer",
                }}
              >
                See Full Details <ArrowDropDown />{" "}
              </div>
            )}
          </div>

          {details ? (
            <div
              style={{
                color: "black",
                backgroundColor: "#EDE9E6",
                marginInline: "3%",
                padding: "2%",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ fontWeight: "700", fontFamily: "Open Sans" }}>
                Puja Participants Details:
              </div>

              <Row
                className="participants-row"
                style={{
                  marginTop: "2%",
                  border: "1px solid rgba(0,0,0,0.2)",
                  borderRadius: "10px",
                  padding: "1%",
                }}
              >
                <Col
                  span={12}
                  style={{ borderRight: "1px solid rgba(0,0,0,0.3)" }}
                >
                  <div
                    className="detail-label"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.3)" }}
                  >
                    Participant Name
                  </div>
                  {PersonName.map((name, index) => (
                    <div
                      key={index}
                      className="detail-value"
                      style={{ marginTop: "1%" }}
                    >
                      {name}
                    </div>
                  ))}
                </Col>
                <Col
                  span={12}
                  style={{
                    alignItems: "end",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    className="detail-label"
                    style={{
                      borderBottom: "1px solid rgba(0,0,0,0.3)",
                      width: "100%",
                      textAlign: "end",
                    }}
                  >
                    Gotra
                  </div>
                  {Gotra.map((gotra, index) => (
                    <div
                      key={index}
                      className="detail-value"
                      style={{ marginTop: "1%" }}
                    >
                      {gotra}
                    </div>
                  ))}
                </Col>
              </Row>

              <div
                style={{
                  fontWeight: "700",
                  fontFamily: "Open Sans",
                  fontSize: "12px",
                  marginTop: "2%",
                }}
              >
                {" "}
                Address
              </div>
              <div style={{ color: "rgba(0,0,0,0.4)", fontSize: "12px" }}>
                {" "}
                {address}
              </div>
              <div
                style={{
                  fontWeight: "700",
                  fontFamily: "Open Sans",
                  fontSize: "12px",
                  marginTop: "2%",
                }}
              >
                {" "}
                Email
              </div>
              <div style={{ color: "rgba(0,0,0,0.4)", fontSize: "12px" }}>
                {" "}
                {email}
              </div>
              <div
                style={{
                  fontWeight: "700",
                  fontFamily: "Open Sans",
                  fontSize: "12px",
                  marginTop: "2%",
                }}
              >
                {" "}
                Mobile Number
              </div>
              <div style={{ color: "rgba(0,0,0,0.4)", fontSize: "12px" }}>
                {" "}
                {mobilenumber}
              </div>

              {poojaLink == null ? (
                <></>
              ) : (
                <>
                  <div
                    style={{
                      fontWeight: "700",
                      fontFamily: "Open Sans",
                      fontSize: "12px",
                      marginTop: "2%",
                    }}
                  >
                    Pooja Link
                  </div>
                  <a target="_blank" href={poojaLink}>
                    {" "}
                    <div style={{ color: "#C2410C", fontSize: "12px", textDecoration: "underline" }}>
                      {" "}
                      {poojaLink}
                    </div>
                  </a>
                </>
              )}
            </div>
          ) : (
            <></>
          )}
        </div>
      </Col>

      {/* Phone card. Only what identifies the booking stays on the face of it —
          puja, mandir, date, package, price, status and a one-line tracker.
          The step dates, participants and contact details sit behind the
          toggle, where the old card used to put a 210px vertical timeline. */}
      <Col lg={0} xl={0} xs={24} sm={24} md={0}>
        <div
          style={{
            boxShadow: "0px 0px 4px 0px rgba(0,0,0,0.25)",
            borderRadius: "12px",
            marginBottom: "3%",
            padding: "12px",
            backgroundColor: "white",
          }}
        >
          <div style={{ display: "flex", gap: "10px" }}>
            <img
              loading="lazy"
              src={imgSrc}
              alt=""
              style={{
                width: "84px",
                height: "62px",
                objectFit: "cover",
                borderRadius: "8px",
                flexShrink: 0,
                backgroundColor: "#EDE9E6",
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  lineHeight: 1.3,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {poojaname}
              </div>
              <div
                style={{
                  fontSize: "11.5px",
                  color: "#FF6505",
                  fontWeight: 500,
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {mandirname}
              </div>
              <div style={{ fontSize: "10.5px", color: "rgba(0,0,0,0.55)", marginTop: "3px" }}>
                {date}
                {pujapackage ? ` · ${pujapackage}` : ""}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              marginTop: "10px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontFamily: "Montserrat",
                fontSize: "12px",
                fontWeight: 500,
                color: statusColor,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: statusColor,
                  flexShrink: 0,
                }}
              />
              {statusLabel}
            </span>
            <span
              style={{
                fontFamily: "Montserrat",
                fontSize: "16px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {paidMoney({ amount: price, currency, chargedAmount })}
            </span>
          </div>

          {/* Tracker: four dots joined by the segment behind them, so a glance
              says how far along the puja is without opening the details. */}
          <div style={{ display: "flex", alignItems: "flex-start", marginTop: "12px" }}>
            {steps.map((step, index) => (
              <div
                key={step.full}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {index > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "5px",
                      right: "50%",
                      width: "100%",
                      height: "2px",
                      backgroundColor: step.done ? "#7A0F1F" : "#d3d3d3",
                    }}
                  />
                )}
                <span
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    boxSizing: "border-box",
                    backgroundColor: step.done ? "#7A0F1F" : "#ffffff",
                    border: `2px solid ${step.done ? "#7A0F1F" : "#d3d3d3"}`,
                  }}
                />
                <span
                  style={{
                    fontSize: "9.5px",
                    marginTop: "4px",
                    lineHeight: 1.2,
                    textAlign: "center",
                    color: step.done ? "#7A0F1F" : "rgba(0,0,0,0.45)",
                    fontWeight: step.done ? 600 : 400,
                  }}
                >
                  {step.short}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: prasadOpted ? "space-between" : "flex-end",
              gap: "8px",
              marginTop: "12px",
              paddingTop: "8px",
              borderTop: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            {prasadOpted && (
              <div
                onClick={handleTrackPrasad}
                style={{
                  cursor: "pointer",
                  fontFamily: "Montserrat",
                  fontSize: "11px",
                  fontWeight: "bold",
                  borderRadius: "50px",
                  border: "1px solid rgba(26, 161, 31, 0.6)",
                  color: "rgba(26, 161, 31, 0.6)",
                  padding: "3px 10px",
                  whiteSpace: "nowrap",
                }}
              >
                Track Prasad
              </div>
            )}
            <div
              onClick={toggleDetails}
              style={{
                color: "#FF6505",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {details ? "Hide Details" : "See Full Details"}
              {details ? <ArrowDropUp /> : <ArrowDropDown />}
            </div>
          </div>

          {details && (
            <div
              style={{
                color: "black",
                backgroundColor: "#EDE9E6",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.2)",
                marginTop: "8px",
              }}
            >
              <div style={{ fontWeight: 700, fontFamily: "Open Sans", fontSize: "12px" }}>
                Puja Status
              </div>
              <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {steps.map((step) => (
                  <div key={step.full} style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: step.done ? "#7A0F1F" : "rgba(0,0,0,0.75)" }}>
                      {step.full}
                    </span>
                    {step.done && <CheckCircle style={{ fontSize: "13px", color: "green" }} />}
                    <span
                      style={{
                        fontSize: "11px",
                        color: "rgba(0,0,0,0.4)",
                        marginLeft: "auto",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {step.caption}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontWeight: 700,
                  fontFamily: "Open Sans",
                  fontSize: "12px",
                  marginTop: "10px",
                }}
              >
                Puja Participants Details:
              </div>
              <Row
                className="participants-row"
                style={{
                  marginTop: "6px",
                  border: "1px solid rgba(0,0,0,0.2)",
                  borderRadius: "8px",
                  padding: "4px 6px",
                }}
              >
                <Col span={12} style={{ borderRight: "1px solid rgba(0,0,0,0.3)" }}>
                  <div className="detail-label" style={{ borderBottom: "1px solid rgba(0,0,0,0.3)" }}>
                    Participant Name
                  </div>
                  {PersonName.map((name, index) => (
                    <div key={index} className="detail-value" style={{ marginTop: "2px" }}>
                      {name}
                    </div>
                  ))}
                </Col>
                <Col span={12} style={{ display: "flex", flexDirection: "column", alignItems: "end" }}>
                  <div
                    className="detail-label"
                    style={{
                      borderBottom: "1px solid rgba(0,0,0,0.3)",
                      width: "100%",
                      textAlign: "end",
                    }}
                  >
                    Gotra
                  </div>
                  {Gotra.map((gotra, index) => (
                    <div key={index} className="detail-value" style={{ marginTop: "2px" }}>
                      {gotra}
                    </div>
                  ))}
                </Col>
              </Row>

              {/* Prasad, address and email only mean something when a prasad
                  delivery was actually opted into — a temple puja has none. */}
              {prasadOpted && (
                <>
                  <div style={{ fontWeight: 700, fontFamily: "Open Sans", fontSize: "12px", marginTop: "10px" }}>
                    Address
                  </div>
                  <div style={{ color: "rgba(0,0,0,0.5)", fontSize: "12px" }}>{address}</div>
                </>
              )}
              {email && (
                <>
                  <div style={{ fontWeight: 700, fontFamily: "Open Sans", fontSize: "12px", marginTop: "10px" }}>
                    Email
                  </div>
                  <div style={{ color: "rgba(0,0,0,0.5)", fontSize: "12px" }}>{email}</div>
                </>
              )}
              <div style={{ fontWeight: 700, fontFamily: "Open Sans", fontSize: "12px", marginTop: "10px" }}>
                Mobile Number
              </div>
              <div style={{ color: "rgba(0,0,0,0.5)", fontSize: "12px" }}>{mobilenumber}</div>

              {poojaLink != null && (
                <>
                  <div style={{ fontWeight: 700, fontFamily: "Open Sans", fontSize: "12px", marginTop: "10px" }}>
                    Pooja Link
                  </div>
                  <a target="_blank" href={poojaLink}>
                    <div
                      style={{
                        color: "#C2410C",
                        fontSize: "12px",
                        wordBreak: "break-all",
                        textDecoration: "underline",
                      }}
                    >
                      {poojaLink}
                    </div>
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </Col>
    </>
  );
};

export default BookingCard;
