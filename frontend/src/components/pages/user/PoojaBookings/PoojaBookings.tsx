"use client";

import { useEffect, useState } from "react";
import { Row, Col, Spin, message } from "antd";
import BookingCard from "./BookingCard";
import useMediaQuery from "@mui/material/useMediaQuery";
import { api } from "@/lib/api";

const customScrollbarStyle = `
  .booking-container::-webkit-scrollbar {
    width: 8px;
  }
  .booking-container::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }
  .booking-container::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
  }
`;

// --- robust date helpers for sorting ---
const toTime = (val?: unknown): number => {
  if (!val) return 0;
  const t = new Date(String(val)).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const getSortKey = (b: any): number => {
  // Priority: createdAt > (poojadate+poojatime) > poojadate
  const created = toTime(b?.createdAt);
  if (created) return created;

  // Combine date + time if both present
  if (b?.poojadate && b?.poojatime) {
    const combined = toTime(`${b.poojadate} ${b.poojatime}`);
    if (combined) return combined;
  }

  const dateOnly = toTime(b?.poojadate);
  if (dateOnly) return dateOnly;

  return 0;
};

const PoojaBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = customScrollbarStyle;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const isSmallScreen = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
    let phone = (userDetails?.user?.phone || "").replace(/\D/g, "");
    if (phone.startsWith("91")) phone = phone.slice(2);
    const userId = Number(phone);

    const fetchBookings = async () => {
      try {
        const { data } = await api.get(`/fetch-pooja-by-mobile/${userId}`);

        const list = data?.poojaBooked;
        if (Array.isArray(list)) {
          // Confirmed only: `isPending` rows come from the pending-checkout
          // collection — payments that never went through. Latest → oldest.
          const sorted = list
            .filter((b) => !b?.isPending)
            .sort((a, b) => getSortKey(b) - getSortKey(a));
          setBookings(sorted);
        } else {
          message.error("No puja bookings found.");
          setBookings([]);
        }
      } catch (error) {
        console.error("Error fetching pooja bookings:", error);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        No Pooja bookings found.
      </div>
    );
  }

  return (
    <div
      className="booking-container"
      style={{ paddingInline: isSmallScreen ? "3%" : "" }}
    >
      <div
        style={{
          fontFamily: "Montserrat",
          color: "rgba(0,0,0,0.6)",
          fontSize: "18px",
          fontWeight: 500,
          marginBottom: "2%",
        }}
      >
        My Puja Bookings
      </div>

      <Row gutter={[0, 0]}>
        {bookings.map((booking) => {
          const addressParts = [
            booking.address1,
            booking.address2,
            booking.city,
            booking.state ? `(${booking.state})` : "",
            booking.pincode,
          ];
          const address =
            addressParts.filter(Boolean).join(", ") || "No Address Selected";

          return (
            <Col key={booking._id} lg={24} xl={24} xs={24} sm={24} md={24}>
              <BookingCard
                isPending={booking.isPending}
                poojaLink={booking.poojaLink}
                completed={booking.completed}
                imgSrc={booking.mandirimage}
                date={booking.poojadate}
                time={booking.poojatime}
                bookeddate={
                  booking.createdAt
                    ? new Date(booking.createdAt).toLocaleDateString()
                    : "N/A"
                }
                poojaname={booking.poojaname}
                mandirname={booking.mandirname}
                pujapackage={booking.package}
                price={booking.totalPrice}
                currency={booking.currency}
                chargedAmount={booking.chargedAmount}
                PersonName={booking.bhaktaNames}
                Gotra={booking.gotra}
                email={booking.email}
                address={address}
                mobilenumber={booking.mobile}
                pujaBooked={true}
                trackurl={booking.track_url}
              />
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default PoojaBookings;
