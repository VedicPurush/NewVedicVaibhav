"use client";

import { useEffect, useState } from "react";
import { Row, Col, Spin } from "antd";
import PersonalizedBookingCard from "./PersonalizedBookingCard";
import useMediaQuery from "@mui/material/useMediaQuery";
import { api } from "@/lib/api";

interface PersonalizedBooking {
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string[];
  gotra?: string[];
  mobile?: string;
  email?: string;
  poojaDate?: string;
  price?: number | null;
  problemName?: string;
  description?: string;
  link?: string | null;
  orderId?: string;
  prasadDeliveryStatus?: string;
  paymentStatus?: boolean;
  /** Presentment fields, written by the server on every payable record. */
  currency?: string;
  chargedAmount?: number;
  isApproved?: boolean;
  completed?: boolean;
  mandirName?: string;
  createdAt?: string;
  updatedAt?: string;
}

const PersonalisedPujaBookings = () => {
  const [bookings, setBookings] = useState<PersonalizedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isSmall = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
    let phone = (userDetails?.user?.phone || "").replace(/\D/g, "");
    if (phone.startsWith("91") && phone.length === 12) phone = phone.slice(2);

    if (!phone) {
      setError("Please log in to view your bookings.");
      setLoading(false);
      return;
    }

    api
      .get(`/get-personalizedpooja-by-number/${phone}`)
      .then(({ data }) => {
        const list: PersonalizedBooking[] = Array.isArray(data?.data)
          ? data.data
          : [];
        // Sort newest first
        list.sort((a, b) => {
          const ta = new Date(a.createdAt || a.poojaDate || 0).getTime();
          const tb = new Date(b.createdAt || b.poojaDate || 0).getTime();
          return tb - ta;
        });
        setBookings(list);
      })
      .catch((err: { response?: { status?: number } }) => {
        /**
         * A user with no personalized bookings gets 404 + a JSON body, not
         * 200 + []. That is an empty result, not a failure, and catching it
         * blindly put a red "Failed to load bookings" where the "No bookings
         * found" empty state below belongs. Every other bookings tab already
         * falls back to an empty list on 404; this one didn't.
         *
         * Narrow to 404 on purpose — network drops and 5xx must still surface
         * as an error rather than silently claiming the user has no bookings.
         */
        if (err?.response?.status === 404) {
          setBookings([]);
          return;
        }
        setError("Failed to load bookings. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-5xl">🛕</span>
        <p className="text-red-500 font-medium text-sm">{error}</p>
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="text-6xl">🛕</span>
        <p className="text-gray-500 font-medium">
          No personalized puja bookings found.
        </p>
        <a
          href="/mandir"
          className="mt-2 inline-block text-white font-semibold px-5 py-2.5 rounded-full text-sm shadow hover:opacity-90 transition"
          style={{ background: "linear-gradient(135deg,#f97316,#d97706)" }}
        >
          Book a Personalized Puja
        </a>
      </div>
    );
  }

  return (
    <div
      className="booking-container h-full overflow-y-auto"
      style={{ paddingInline: isSmall ? "3%" : "" }}
    >
      <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-500 to-yellow-600 bg-clip-text text-transparent mb-6 tracking-tight font-['Outfit',sans-serif]">
        My Personalized Puja Bookings
      </div>

      <Row gutter={[16, 16]}>
        {bookings.map((b, i) => (
          <Col key={b._id ?? `p-${i}`} xs={24} sm={24} md={24} lg={24} xl={24}>
            <PersonalizedBookingCard
              orderId={b.orderId ?? "—"}
              poojaName={b.problemName ?? "Personalized Puja"}
              mandirName={b.mandirName}
              devoteeName={b.firstName ?? (b.fullName?.[0] ?? "—")}
              fullName={b.fullName}
              gotra={b.gotra}
              mobile={b.mobile ?? "—"}
              email={b.email ?? "—"}
              poojaDate={b.poojaDate}
              price={b.price ?? null}
              currency={b.currency}
              chargedAmount={b.chargedAmount}
              description={b.description ?? ""}
              link={b.link ?? null}
              prasadDeliveryStatus={b.prasadDeliveryStatus ?? "pending"}
              paymentStatus={!!b.paymentStatus}
              isApproved={!!b.isApproved}
              isCompleted={!!b.completed}
              createdAt={b.createdAt}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default PersonalisedPujaBookings;
