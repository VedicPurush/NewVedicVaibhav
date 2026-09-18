"use client";

import { useEffect, useState } from "react";
import { paidMoney } from "@/lib/currency";
import { Row, Col, Spin } from "antd";
import {
  fetchUserGauSevaBookingsApi,
} from "@/components/pages/services/gau-seva/api/gauSeva.api";
import type { GauSevaBooking } from "@/components/pages/services/gau-seva/api/gauSeva.api";
import useMediaQuery from "@mui/material/useMediaQuery";
import DetailsToggle from "../DetailsToggle";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-50 text-green-700 border-green-200",
  created: "bg-yellow-50 text-yellow-700 border-yellow-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-orange-50 text-orange-600 border-orange-200",
  initiated: "bg-blue-50 text-blue-600 border-blue-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

const COW_ICON = "🐄";

const SUB_LABEL =
  "text-[11px] md:text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-0.5";

/**
 * Its own component because each card owns whether it is expanded, and a hook
 * cannot live inside the .map() that renders them.
 */
const GauSevaBookingCard = ({
  booking,
  isSmallScreen,
}: {
  booking: GauSevaBooking;
  isSmallScreen: boolean;
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // A phone keeps the seva, its status and the amount on the face of the card.
  // A wide screen has room for everything and never shows the toggle.
  const detailsOpen = !isSmallScreen || showDetails;

  const bookedOn = new Date(booking.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-2xl p-4 md:p-7 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.1)] border border-orange-100/50 hover:shadow-[0_8px_30px_-4px_rgba(249,115,22,0.15)] transition-all duration-300 relative overflow-hidden group">
      {/* Top accent */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 opacity-80 group-hover:opacity-100 transition-opacity" />

      {/* Header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 md:mb-5">
        <div className="min-w-0">
          <h3 className="text-base md:text-xl font-bold text-gray-900 mb-0.5 font-['Outfit',sans-serif] flex items-center gap-2">
            <span>{COW_ICON}</span>
            {booking.packageName}
          </h3>
          {/* An identifier you quote to support, not something read at a glance. */}
          {detailsOpen && (
            <p className="text-gray-500 text-xs font-medium break-all">
              Booking ID:{" "}
              <span className="text-gray-700 font-semibold">{booking.bookingId}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-2.5 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border shadow-sm tracking-wide uppercase ${
              STATUS_COLORS[booking.paymentStatus] || "bg-gray-50 text-gray-600 border-gray-200"
            }`}
          >
            {booking.paymentStatus}
          </span>
          <span
            className={`px-2.5 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border shadow-sm tracking-wide uppercase ${
              BOOKING_STATUS_COLORS[booking.bookingStatus] ||
              "bg-gray-50 text-gray-600 border-gray-200"
            }`}
          >
            {booking.bookingStatus}
          </span>
        </div>
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-orange-100 to-transparent mb-3 md:mb-5" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 md:gap-y-4">
        <div>
          <span className="text-[11px] md:text-xs text-orange-500 font-semibold uppercase tracking-wider block mb-0.5">
            Amount Paid
          </span>
          <span className="text-sm font-bold text-green-600">{paidMoney(booking)}</span>
          {booking.quantity > 1 && (
            <span className="text-xs text-gray-400 block">(×{booking.quantity} seva)</span>
          )}
        </div>

        {detailsOpen && (
          <>
            <div>
              <span className={SUB_LABEL}>Devotee Name</span>
              <span className="text-sm font-bold text-gray-800">{booking.devoteeName}</span>
            </div>
            <div>
              <span className={SUB_LABEL}>WhatsApp</span>
              <span className="text-sm font-semibold text-gray-700">+91 {booking.whatsapp}</span>
            </div>
            {booking.gotra && (
              <div>
                <span className={SUB_LABEL}>Gotra</span>
                <span className="text-sm text-gray-700">{booking.gotra}</span>
              </div>
            )}
            {booking.occasionType && (
              <div>
                <span className={SUB_LABEL}>Occasion</span>
                <span className="text-sm text-gray-700 capitalize">{booking.occasionType}</span>
              </div>
            )}
            {booking.email && (
              <div>
                <span className={SUB_LABEL}>Email</span>
                <span className="text-sm text-gray-700 break-all">{booking.email}</span>
              </div>
            )}
          </>
        )}
      </div>

      {detailsOpen && booking.specialMessage && (
        <div className="mt-3 md:mt-4 bg-orange-50/60 border border-orange-100 rounded-xl px-3 md:px-4 py-2.5 md:py-3">
          <span className="text-[11px] md:text-xs text-orange-500 font-semibold uppercase tracking-wider block mb-1">
            Special Message
          </span>
          <p className="text-sm text-gray-700 leading-relaxed">{booking.specialMessage}</p>
        </div>
      )}

      {isSmallScreen && (
        <DetailsToggle open={showDetails} onToggle={() => setShowDetails((v) => !v)} />
      )}

      {detailsOpen && (
        <div className="mt-4 md:mt-5 pt-3 md:pt-4 border-t border-gray-100 flex justify-end">
          <div className="flex items-center text-[11px] md:text-xs text-gray-400 font-medium bg-gray-50 px-2.5 md:px-3 py-1.5 rounded-full border border-gray-100">
            <svg
              className="w-3.5 h-3.5 mr-1.5 opacity-70 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Booked on: {bookedOn}
          </div>
        </div>
      )}
    </div>
  );
};

const GauSevaBookings = () => {
  const [bookings, setBookings] = useState<GauSevaBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
    let phone = (userDetails?.user?.phone || "").replace(/\D/g, "");
    if (phone.startsWith("91")) phone = phone.slice(2);

    if (!phone) {
      // fallback from checkout flow
      const checkoutContact = JSON.parse(
        localStorage.getItem("checkoutContact") || "{}"
      );
      phone = (checkoutContact?.phone || "").replace(/\D/g, "");
      if (phone.startsWith("91")) phone = phone.slice(2);
    }

    if (!phone) {
      setLoading(false);
      return;
    }

    fetchUserGauSevaBookingsApi(phone)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
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
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="text-6xl">{COW_ICON}</span>
        <p className="text-gray-500 text-base font-medium">
          No Gau Seva bookings found.
        </p>
        <a
          href="/services/gau-seva"
          className="mt-2 inline-block bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm shadow hover:opacity-90 transition"
        >
          Book Gau Seva Now
        </a>
      </div>
    );
  }

  return (
    <div
      className="booking-container h-full overflow-y-auto"
      style={{ paddingInline: isSmallScreen ? "3%" : "" }}
    >
      <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-500 to-yellow-600 bg-clip-text text-transparent mb-6 tracking-tight font-['Outfit',sans-serif]">
        My Gau Seva Bookings
      </div>

      <Row gutter={[16, 16]}>
        {bookings.map((booking) => (
          <Col key={booking._id} xs={24} sm={24} md={24} lg={24} xl={24}>
            <GauSevaBookingCard booking={booking} isSmallScreen={isSmallScreen} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default GauSevaBookings;
