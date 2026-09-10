"use client";

import { useEffect, useState } from "react";
import { paidMoney } from "@/lib/currency";
import { Row, Col, Spin, message } from "antd";
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
          setBookings(data.bookings);
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
        {bookings.map((booking) => {
          const addressParts = [
            booking.address,
            booking.city,
            booking.state,
            booking.pincode,
          ];
          const fullAddress = addressParts.filter(Boolean).join(", ");

          const bookingDate = new Date(booking.createdAt).toLocaleDateString(
            "en-IN",
            {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          );

          return (
            <Col key={booking._id} lg={24} xl={24} xs={24} sm={24} md={24}>
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.1)] border border-orange-100/50 hover:shadow-[0_8px_30px_-4px_rgba(249,115,22,0.15)] transition-all duration-300 relative overflow-hidden group">
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 via-[#F59E0B] to-yellow-400 opacity-80 group-hover:opacity-100 transition-opacity" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 font-['Outfit',sans-serif]">
                      {booking.poojaName || "4 Dham Yatra"}
                    </h3>
                    <p className="text-gray-500 text-sm font-medium">
                      Booking ID:{" "}
                      <span className="text-gray-700">{booking.bookingId}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        booking.paymentStatus === "paid"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      } shadow-sm tracking-wide`}
                    >
                      {booking.paymentStatus === "paid" ? "PAID" : "UNPAID"}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        booking.bookingStatus === "confirmed"
                          ? "bg-orange-50 text-orange-600 border-orange-200"
                          : "bg-blue-50 text-blue-600 border-blue-200"
                      } shadow-sm tracking-wide`}
                    >
                      {booking.bookingStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-orange-100 to-transparent my-6" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <span className="text-xs text-orange-500 font-semibold uppercase tracking-wider block mb-1">
                      Package
                    </span>
                    <span className="text-base font-bold text-gray-800">
                      {booking.packageName}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-orange-500 font-semibold uppercase tracking-wider block mb-1">
                      Date & Slot
                    </span>
                    <span className="text-base font-bold text-gray-800">
                      {booking.slotName}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-orange-500 font-semibold uppercase tracking-wider block mb-1">
                      Amount Paid
                    </span>
                    <span className="text-base font-bold text-green-600">
                      {paidMoney({
                        ...booking,
                        amount: booking.discountedPackagePrice || booking.packagePrice,
                      })}
                    </span>
                    {booking.extraCharges > 0 && (
                      <span className="text-xs text-gray-400 block mt-0.5">
                        (Includes {paidMoney({ ...booking, amount: booking.extraCharges, chargedAmount: undefined })} extra for members)
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">
                      Devotee Details
                    </span>
                    <span className="text-sm font-bold text-gray-800 block">
                      {booking.devoteeName}
                    </span>
                    <span className="text-sm text-gray-600 block mt-0.5">
                      +91 {booking.whatsapp}
                    </span>
                    {booking.gotra && (
                      <span className="text-sm text-gray-500 block">
                        Gotra: {booking.gotra}
                      </span>
                    )}
                  </div>

                  <div className="sm:col-span-2 lg:col-span-2">
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">
                      Delivery Address
                    </span>
                    <span className="text-sm font-medium text-gray-700 leading-relaxed max-w-md block">
                      {fullAddress}
                    </span>
                  </div>

                  {booking.familyMembers && booking.familyMembers.length > 0 && (
                    <div className="col-span-1 sm:col-span-2 lg:col-span-3 mt-2">
                      <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">
                        Family Members
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {booking.familyMembers.map(
                          (member: string, idx: number) => (
                            <span
                              key={idx}
                              className="bg-orange-50/50 border border-orange-100 text-orange-800 text-sm px-3 py-1 rounded-md font-medium shadow-sm"
                            >
                              {member}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end items-center">
                  <div className="flex items-center text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                    <svg
                      className="w-4 h-4 mr-1.5 opacity-70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    Booked on: {bookingDate}
                  </div>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default YatraBookings;
