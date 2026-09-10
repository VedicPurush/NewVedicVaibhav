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

  const calculateProgressmobile = () => {
    if (poojaLink !== null) return 100;
    if (completed) return 63;
    if (isToday) return 35;
    if (pujaBooked) return 20;
    return 10;
  };

  const progressmobile = calculateProgressmobile();

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
                  Pooja scheduled on {date}, <strong>(IST {time})</strong>
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
                  background: "linear-gradient(to right, #3256F3, #1D328D)",
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
                    <div style={{ color: "#476CE4", fontSize: "12px" }}>
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

      <Col lg={0} xl={0} xs={24} sm={24} md={0}>
        <div
          style={{
            boxShadow: "0px 0px 4px 0px rgba(0,0,0,0.25)",
            borderRadius: "12px",
            marginBottom: "4%",
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
              alignItems: "start",
              padding: "0% 3%",
            }}
          >
            <div style={{ display: "flex", gap: "10px" }}>
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
                  Pooja scheduled on ,
                </div>
                <div style={{ fontSize: "12px" }}>
                  {" "}
                  {date},{" "}
                  <strong style={{ fontSize: "12px" }}>(IST {time})</strong>
                </div>
              </div>
            </div>

            {prasadOpted && (
              <div
                style={{
                  marginTop: "0px",
                  gap: "8px", // optional spacing between elements
                }}
                className="flex md:flex-row flex-col items-center justify-center "
              >
                {/* Track Prasad Button */}
                <div
                  onClick={handleTrackPrasad}
                  style={{
                    cursor: "pointer",
                    fontWeight: "bold",
                    borderRadius: "50px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    width: "110px", // fixed width for better alignment
                    boxShadow: "0px 0px 4px 0px rgba(0,0,0,0.25)",
                    border: "1px solid rgba(26, 161, 31, 0.6)",
                    color: "rgba(26, 161, 31, 0.6)",
                    fontFamily: "Montserrat",
                    padding: "2px 3px",
                  }}
                >
                  Track Prasad
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "end",
              marginTop: "6%",
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
                style={{ width: "40%", borderRadius: "12px" }}
              ></img>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "14px", fontWeight: "600", lineHeight: "1.2" }}>
                  {poojaname}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#FF6505",
                    fontWeight: "500",
                    marginTop: "2px",
                  }}
                >
                  {mandirname}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(0,0,0,0.6)",
                    marginTop: "2px",
                  }}
                >
                  Package : <span style={{ color: "#FF6505" }}>{pujapackage}</span>
                </div>
                <div
                  style={{
                    fontSize: "10px",
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
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      backgroundColor: address === "No Address Selected" ? "#94a3b8" : "#16a34a",
                    }}
                  ></span>
                  {address === "No Address Selected" ? "Prasad not opted" : "Prasad Opted"}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontFamily: "Montserrat",
                    fontSize: "18px",
                    fontWeight: "600",
                    alignItems: "end",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  {paidMoney({ amount: price, currency, chargedAmount })}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              width: "100%",
              marginTop: "4%",
              padding: "3% 3%",
              borderTop: "1px dashed rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                color: "#20379B",
                fontWeight: "600",
                marginBottom: "3%",
              }}
            >
              Puja Status
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                position: "relative",
              }}
            >
              {/* Vertical Progress Bar */}
              <div
                style={{
                  position: "relative",
                  width: "10px",
                  backgroundColor: "#d3d3d3",
                  borderRadius: "5px",
                  height: "100%",
                  minHeight: "210px", // Set a minimum height to ensure visibility
                  marginRight: "20px",
                }}
              >
                {/* Filled Section */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    width: "100%",
                    height: `${progressmobile}%`,
                    background: "linear-gradient(to top, #3256F3, #1D328D)",
                    borderRadius: "5px",
                  }}
                >
                  <div
                    style={{
                      borderRadius: "50%",
                      position: "absolute",
                      bottom: "0px",
                      right: "0px",
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
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {/* Step 1 */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: "14px" }}>Puja Booked</span>
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
                    <div style={{ color: "rgba(0,0,0,0.4)", fontSize: "10px" }}>
                      {bookeddate}
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: "14px" }}>Puja Started</span>
                      {completed ? (
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
                      {date}
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: "14px" }}>Puja Completed</span>
                      {completed ? (
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
                      {date}
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: "14px" }}>
                        Picture & Video Received
                      </span>
                      {poojaLink !== null ? (
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

                    {poojaLink !== null ? (
                      <div
                        style={{ color: "rgba(0,0,0,0.4)", fontSize: "12px" }}
                      >
                        Click See Details to view
                      </div>
                    ) : (
                      <div
                        style={{ color: "rgba(0,0,0,0.4)", fontSize: "12px" }}
                      >
                        Coming Soon
                      </div>
                    )}
                  </div>
                </div>
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
                    <div style={{ color: "#476CE4", fontSize: "12px" }}>
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
    </>
  );
};

export default BookingCard;
