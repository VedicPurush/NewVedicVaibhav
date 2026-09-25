"use client";

import { useEffect, useState } from "react";
import { paidMoney } from "@/lib/currency";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import useMediaQuery from "@mui/material/useMediaQuery";
import DetailsToggle from "../DetailsToggle";

interface Booking {
  orderID: string;
  name: string;
  packageName: string;
  numberOfDays: number;
  amount: number;
  paymentStatus: string;
  createdAt: string;
  startDate?: string;
  gotra?: string;
  familyMembers?: string[];
  extraCharges?: number;
  address?: string;
  city?: string;
  state?: string;
}

const StatusBadge = ({ status }: { status?: string }) => {
  const s = (status || "pending").toLowerCase();
  const map: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: "bg-green-500/20", text: "text-green-400", label: "✅ Paid" },
    pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "⏳ Pending" },
    failed: { bg: "bg-red-500/20", text: "text-red-400", label: "❌ Failed" },
  };
  const style = map[s] || map.pending;
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

const readMobile = (): string => {
  const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
  let mobile: string =
    userDetails?.user?.phone ||
    userDetails?.user?.mobile ||
    userDetails?.mobile ||
    userDetails?.phone ||
    "";
  if (mobile) {
    mobile = mobile.replace(/\D/g, "");
    if (mobile.startsWith("91") && mobile.length > 10) mobile = mobile.slice(2);
  }
  return mobile;
};

const fmtDay = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const LABEL = "text-[11px] md:text-xs font-bold uppercase tracking-wider mb-0.5";

/**
 * Its own component because each card owns whether it is expanded, and a hook
 * cannot live inside the .map() that renders them.
 */
const BankeBihariBookingCard = ({
  booking,
  index,
  isSmallScreen,
}: {
  booking: Booking;
  index: number;
  isSmallScreen: boolean;
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // A phone keeps the package, amount and start date on the face of the card.
  // A wide screen has room for everything and never shows the toggle.
  const detailsOpen = !isSmallScreen || showDetails;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#fff",
        border: "1px solid #f5d5a8",
        boxShadow: "0 2px 16px rgba(200,100,0,0.06)",
      }}
    >
      {/* Header — the package is what identifies the seva at a glance; the
          booking id is a support reference and moves into the details. */}
      <div
        className="flex items-center justify-between gap-3 px-4 md:px-5 py-2.5 md:py-3"
        style={{ background: "linear-gradient(90deg, #fff4e0, #fff8ef)" }}
      >
        <div className="min-w-0">
          <p className={LABEL} style={{ color: "#d97706" }}>
            Package
          </p>
          <p className="font-bold text-sm md:text-base truncate" style={{ color: "#92400e" }}>
            {booking.packageName || "—"}
          </p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={booking.paymentStatus} />
        </div>
      </div>

      <div className="px-4 md:px-5 py-3 md:py-4 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 md:gap-4">
        <div>
          <p className={LABEL} style={{ color: "#d97706" }}>
            Amount Paid
          </p>
          <p className="font-bold text-sm md:text-base" style={{ color: "#ea580c" }}>
            {booking.amount == null ? "—" : paidMoney(booking)}
          </p>
          {(booking.extraCharges || 0) > 0 && (
            <p className="text-xs md:text-sm" style={{ color: "#b45309" }}>
              (incl.{" "}
              {paidMoney({ ...booking, amount: booking.extraCharges, chargedAmount: undefined })}{" "}
              extra)
            </p>
          )}
        </div>

        <div>
          <p className={LABEL} style={{ color: "#d97706" }}>
            {booking.startDate ? "Seva Start Date" : "Duration"}
          </p>
          <p className="text-sm md:text-base" style={{ color: "#78350f" }}>
            {booking.startDate
              ? fmtDay(booking.startDate)
              : `${booking.numberOfDays || "?"} day${booking.numberOfDays !== 1 ? "s" : ""}`}
          </p>
          {booking.startDate && (
            <p className="text-xs md:text-sm" style={{ color: "#b45309" }}>
              {booking.numberOfDays || "?"} day{booking.numberOfDays !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {detailsOpen && (
          <>
            <div>
              <p className={LABEL} style={{ color: "#d97706" }}>
                Booking ID
              </p>
              <p className="font-mono text-xs md:text-sm break-all" style={{ color: "#78350f" }}>
                {booking.orderID || "—"}
              </p>
            </div>

            {booking.name && (
              <div>
                <p className={LABEL} style={{ color: "#d97706" }}>
                  Devotee
                </p>
                <p className="text-sm md:text-base" style={{ color: "#78350f" }}>
                  {booking.name}
                </p>
                {booking.gotra && (
                  <p className="text-xs md:text-sm" style={{ color: "#b45309" }}>
                    Gotra: {booking.gotra}
                  </p>
                )}
              </div>
            )}

            <div>
              <p className={LABEL} style={{ color: "#d97706" }}>
                Booked On
              </p>
              <p className="text-sm md:text-base" style={{ color: "#78350f" }}>
                {fmtDay(booking.createdAt)}
              </p>
            </div>

            {(booking.city || booking.state) && (
              <div>
                <p className={LABEL} style={{ color: "#d97706" }}>
                  Prasad Delivery
                </p>
                <p className="text-sm md:text-base" style={{ color: "#78350f" }}>
                  {[booking.city, booking.state].filter(Boolean).join(", ")}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {detailsOpen && booking.familyMembers && booking.familyMembers.length > 0 && (
        <div className="px-4 md:px-5 pb-3 md:pb-4">
          <p className={LABEL} style={{ color: "#d97706" }}>
            Family Members
          </p>
          <div className="flex flex-wrap gap-1.5 md:gap-2 mt-1">
            {booking.familyMembers.map((m, i) =>
              m.trim() ? (
                <span
                  key={i}
                  className="text-xs md:text-sm px-2 py-0.5 rounded-full"
                  style={{ background: "#fff4e0", border: "1px solid #fde9bb", color: "#b45309" }}
                >
                  {m}
                </span>
              ) : null,
            )}
          </div>
        </div>
      )}

      {isSmallScreen && (
        <div className="px-4 pb-3">
          <DetailsToggle open={showDetails} onToggle={() => setShowDetails((v) => !v)} />
        </div>
      )}
    </motion.div>
  );
};

const BankeBihariBookings = () => {
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobile, setMobile] = useState("");

  useEffect(() => {
    const stored = readMobile();
    setMobile(stored);

    const fetchBookings = async () => {
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get(`/bb-seva/bookings/mobile/${stored}`);
        const list: Booking[] = Array.isArray(data) ? data : data.bookings || [];
        // Paid only — pending and failed rows are checkouts that never went through.
        setBookings(list.filter((b) => b?.paymentStatus === "paid"));
      } catch (err) {
        console.error("Error fetching BB bookings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div
          className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: "#f97316 transparent transparent transparent" }}
        />
        <p className="text-sm font-medium" style={{ color: "#b45309" }}>
          Loading your divine blessings...
        </p>
      </div>
    );
  }

  if (!mobile) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🙏</div>
        <p className="font-medium" style={{ color: "#92400e" }}>
          Please log in to see your Banke Bihariji bookings.
        </p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🪔</div>
        <p className="font-medium" style={{ color: "#92400e" }}>
          No Banke Bihariji seva bookings found.
        </p>
        <p className="text-sm mt-2" style={{ color: "#b45309" }}>
          Start your divine journey today!
        </p>
        <a
          href="/services/banke-bihariji"
          className="inline-block mt-4 px-6 py-2 rounded-full font-semibold text-sm text-white"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
        >
          Book Seva Now 🌸
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2
        className="text:xs md:text-xl px-5 font-bold flex items-center gap-2"
        style={{ color: "#92400e" }}
      >
        🙏 Shree Banke Bihari Ji Seva Bookings
        <span
          className="text-sm font-normal px-2 py-0.5 rounded-full"
          style={{
            background: "#fff4e0",
            color: "#b45309",
            border: "1px solid #fde9bb",
          }}
        >
          {bookings.length} booking{bookings.length > 1 ? "s" : ""}
        </span>
      </h2>

      {bookings.map((booking, idx) => (
        <BankeBihariBookingCard
          key={booking.orderID || idx}
          booking={booking}
          index={idx}
          isSmallScreen={isSmallScreen}
        />
      ))}
    </div>
  );
};

export default BankeBihariBookings;
