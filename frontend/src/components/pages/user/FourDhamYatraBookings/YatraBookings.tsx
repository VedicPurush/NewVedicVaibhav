"use client";

import { useEffect, useState } from "react";
import { paidMoney } from "@/lib/currency";
import { Row, Col, Spin, message } from "antd";
import useMediaQuery from "@mui/material/useMediaQuery";
import { api } from "@/lib/api";
import DetailsToggle from "../DetailsToggle";

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

/** Label above value on a wide screen, label-left/value-right on a phone. */
const KEY_FIELD = "flex justify-between items-baseline gap-3 md:block";
const KEY_LABEL =
  "text-[11px] md:text-xs text-orange-500 font-semibold uppercase tracking-wider shrink-0 md:block md:mb-1";
const KEY_VALUE = "text-sm md:text-base font-bold text-gray-800 text-right md:text-left";
const SUB_LABEL =
  "text-[11px] md:text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1";

/** The fields this card reads off the `/4dham-bookings` response. */
interface YatraBooking {
  poojaName?: string;
  bookingId: string;
  paymentStatus: string;
  bookingStatus: string;
  packageName: string;
  slotName: string;
  packagePrice: number;
  discountedPackagePrice?: number;
  extraCharges?: number;
  devoteeName: string;
  whatsapp: string;
  gotra?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string | number;
  familyMembers?: string[];
  createdAt: string;
  /** Presentment fields — the receipt shows what the card was actually charged. */
  currency?: string | null;
  chargedAmount?: number | null;
}

const YatraBookingCard = ({
  booking,
  isSmallScreen,
}: {
  booking: YatraBooking;
  isSmallScreen: boolean;
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // A phone keeps only the package, slot and amount on the face of the card.
  // A wide screen has room for everything at once and never shows the toggle.
  const detailsOpen = !isSmallScreen || showDetails;

  const fullAddress = [booking.address, booking.city, booking.state, booking.pincode]
    .filter(Boolean)
    .join(", ");

  const bookingDate = new Date(booking.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.1)] border border-orange-100/50 hover:shadow-[0_8px_30px_-4px_rgba(249,115,22,0.15)] transition-all duration-300 relative overflow-hidden group">
      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 via-[#F59E0B] to-yellow-400 opacity-80 group-hover:opacity-100 transition-opacity" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 mb-3 md:mb-6">
        <div className="min-w-0">
          <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-0.5 md:mb-1 font-['Outfit',sans-serif]">
            {booking.poojaName || "4 Dham Yatra"}
          </h3>
          {/* The booking id is what you quote to support, not something you read
              at a glance — on a phone it collapses with the rest. */}
          {detailsOpen && (
            <p className="text-gray-500 text-xs md:text-sm font-medium break-all">
              Booking ID: <span className="text-gray-700">{booking.bookingId}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-2.5 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border ${
              booking.paymentStatus === "paid"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            } shadow-sm tracking-wide`}
          >
            {booking.paymentStatus === "paid" ? "PAID" : "UNPAID"}
          </span>
          <span
            className={`px-2.5 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border ${
              booking.bookingStatus === "confirmed"
                ? "bg-orange-50 text-orange-600 border-orange-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            } shadow-sm tracking-wide`}
          >
            {booking.bookingStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-orange-100 to-transparent my-3 md:my-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6">
        <div className={KEY_FIELD}>
          <span className={KEY_LABEL}>Package</span>
          <span className={KEY_VALUE}>{booking.packageName}</span>
        </div>
        <div className={KEY_FIELD}>
          <span className={KEY_LABEL}>Date &amp; Slot</span>
          <span className={KEY_VALUE}>{booking.slotName}</span>
        </div>
        <div className={KEY_FIELD}>
          <span className={KEY_LABEL}>Amount Paid</span>
          <div className="text-right md:text-left">
            <span className="text-sm md:text-base font-bold text-green-600">
              {paidMoney({
                ...booking,
                amount: booking.discountedPackagePrice || booking.packagePrice,
              })}
            </span>
            {(booking.extraCharges ?? 0) > 0 && (
              <span className="text-[10px] md:text-xs text-gray-400 block mt-0.5">
                (Includes{" "}
                {paidMoney({ ...booking, amount: booking.extraCharges, chargedAmount: undefined })}{" "}
                extra for members)
              </span>
            )}
          </div>
        </div>

        {detailsOpen && (
          <>
            <div>
              <span className={SUB_LABEL}>Devotee Details</span>
              <span className="text-sm font-bold text-gray-800 block">{booking.devoteeName}</span>
              <span className="text-sm text-gray-600 block mt-0.5">+91 {booking.whatsapp}</span>
              {booking.gotra && (
                <span className="text-sm text-gray-500 block">Gotra: {booking.gotra}</span>
              )}
            </div>

            {fullAddress && (
              <div className="sm:col-span-2 lg:col-span-2">
                <span className={SUB_LABEL}>Delivery Address</span>
                <span className="text-sm font-medium text-gray-700 leading-relaxed max-w-md block">
                  {fullAddress}
                </span>
              </div>
            )}

            {booking.familyMembers && booking.familyMembers.length > 0 && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <span className={SUB_LABEL}>Family Members</span>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {booking.familyMembers.map((member: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-orange-50/50 border border-orange-100 text-orange-800 text-xs md:text-sm px-2.5 md:px-3 py-1 rounded-md font-medium shadow-sm"
                    >
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isSmallScreen && (
        <DetailsToggle open={showDetails} onToggle={() => setShowDetails((v) => !v)} />
      )}

      {detailsOpen && (
        <div className="mt-4 md:mt-8 pt-3 md:pt-4 border-t border-gray-100 flex justify-end items-center">
          <div className="flex items-center text-[11px] md:text-xs text-gray-400 font-medium bg-gray-50 px-2.5 md:px-3 py-1.5 rounded-full border border-gray-100">
            <svg
              className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 opacity-70 shrink-0"
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
            Booked on: {bookingDate}
          </div>
        </div>
      )}
    </div>
  );
};

const YatraBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = customScrollbarStyle;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
    let phone = (userDetails?.user?.phone || "").replace(/\D/g, "");
    if (phone.startsWith("91")) phone = phone.slice(2);

    // Fallback if not logged in but checked out
    if (!phone) {
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

    const fetchBookings = async () => {
      try {
        const { data } = await api.get(`/user/${phone}/4dham-bookings`);

        if (data.success && Array.isArray(data.bookings)) {
          // Confirmed only. Payment sets "paid" and "confirmed" together, so
          // this drops unpaid checkouts and cancelled bookings alike.
          setBookings(data.bookings.filter((b: any) => b?.bookingStatus === "confirmed"));
        } else {
          setBookings([]);
        }
      } catch (error) {
        console.error("Error fetching 4 Dham bookings:", error);
        message.error("Failed to load 4 Dham bookings.");
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
      <div
        style={{
          textAlign: "center",
          padding: "20px",
          color: "gray",
          fontSize: "16px",
        }}
      >
        No 4 Dham Yatra bookings found.
      </div>
    );
  }

  return (
    <div
      className="booking-container h-full overflow-y-auto"
      style={{ paddingInline: isSmallScreen ? "3%" : "" }}
    >
      <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-500 to-yellow-600 bg-clip-text text-transparent mb-6 tracking-tight font-['Outfit',sans-serif]">
        My 4 Dham Yatra Bookings
      </div>

      <Row gutter={[16, 16]}>
        {bookings.map((booking) => (
          <Col key={booking._id} lg={24} xl={24} xs={24} sm={24} md={24}>
            <YatraBookingCard booking={booking} isSmallScreen={isSmallScreen} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default YatraBookings;
