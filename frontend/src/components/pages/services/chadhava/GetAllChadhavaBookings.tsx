"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiUrl } from "@/lib/api";

// ---------------- TYPES ----------------
type ChadhavaBooking = {
  _id: string;
  orderID: string;
  name?: string;
  whatsapp?: string;
  bookingDate?: string;
  createdAt?: string;
  totalPrice?: number;
  familyMembers?: string[];
  gotra?: string | null;
  status?: string;
  referralCode?: string;
  puja?: {
    title: string;
    temple: string;
    date: string;
  };
  accessories?: {
    name: string;
    quantity: number;
  }[];
  prasad?: {
    name: string;
    price: number;
  };
  address?: {
    name: string;
    address1: string;
    city: string;
    state: string;
    country: string;
    pinCode: number;
  };
  bookingDetails?: any; // for pending
};

// ---------------- AUTH ----------------
const ADMIN_USERNAME = "vedicvaibhav72@gmail.com";
const ADMIN_PASSWORD = "panditjiatrequest@123";

const PujaTitleBookingsTable: React.FC = () => {
  const params = useParams();
  const pujaTitle = String(params?.pujaTitle ?? "");

  const [bookings, setBookings] = useState<ChadhavaBooking[]>([]);
  const [bookingType, setBookingType] =
    useState<"pending" | "confirmed" | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // auth
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // ---------------- LOGIN ----------------
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      setAuthError("Invalid username or password");
    }
  };

  // ---------------- FETCH ----------------
  useEffect(() => {
    if (!isAuthenticated || !pujaTitle || !bookingType) return;

    setLoading(true);
    setError(null);

    const url =
      bookingType === "confirmed"
        ? apiUrl(`/newChadhava/get-all-confirmed-bookings/${encodeURIComponent(
          pujaTitle
        )}`)
        : apiUrl(`/newChadhava/get-all-pending-bookings/${encodeURIComponent(
          pujaTitle
        )}`);

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setBookings(data.bookings || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch bookings");
        setLoading(false);
      });
  }, [isAuthenticated, pujaTitle, bookingType]);

  // ---------------- LOGIN UI ----------------
  if (!isAuthenticated) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            className="border rounded px-3 py-2 w-full"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="bg-orange-500 text-white font-bold px-4 py-2 rounded w-full">
            Login
          </button>
          {authError && <div className="text-red-600">{authError}</div>}
        </form>
      </div>
    );
  }

  // ---------------- MAIN UI ----------------
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Chadhava Bookings:{" "}
        <span className="text-orange-600">{pujaTitle}</span>
      </h2>

      {/* BUTTONS */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setBookingType("pending")}
          className={`px-4 py-2 rounded font-bold border ${bookingType === "pending"
            ? "bg-orange-500 text-white"
            : "border-orange-400 text-orange-700"
            }`}
        >
          Pending Booking
        </button>

        <button
          onClick={() => setBookingType("confirmed")}
          className={`px-4 py-2 rounded font-bold border ${bookingType === "confirmed"
            ? "bg-orange-500 text-white"
            : "border-orange-400 text-orange-700"
            }`}
        >
          Confirmed Booking
        </button>

        {bookingType && (
          <button
            onClick={() => {
              const url = apiUrl(`/newChadhava/export-bookings?type=${bookingType}&pujaTitle=${encodeURIComponent(pujaTitle || "")}`);
              window.open(url, '_blank');
            }}
            className="px-4 py-2 rounded font-bold bg-green-600 text-white hover:bg-green-700 ml-auto"
          >
            Download Excel 📊
          </button>
        )}
      </div>

      {!bookingType && <div>Select booking type.</div>}
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && bookings.length === 0 && bookingType && (
        <div>No bookings found.</div>
      )}

      {!loading && bookings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-orange-100">
                <th className="border p-2">SNo</th>
                <th className="border p-2">Booking ID</th>
                <th className="border p-2">Booking Date</th>
                <th className="border p-2">Order ID</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Mobile</th>
                <th className="border p-2">Temple</th>
                <th className="border p-2">Puja Date</th>
                <th className="border p-2">Total ₹</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Gotra</th>
                <th className="border p-2">Family</th>
                <th className="border p-2">Address</th>
                <th className="border p-2">Prasad?</th>
                <th className="border p-2">Accessories</th>
                <th className="border p-2">Free Gifts</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, idx) => {
                const isPending = bookingType === "pending";
                // If confirmed, 'b' is the booking. If pending, 'b.bookingDetails' is the data.
                const data = isPending ? b.bookingDetails : b;

                // Title/Temple extraction
                let temple = "-";
                let dateStr = "-";

                if (isPending) {
                  temple = data?.chadhavaDetails?.temple || data?.puja?.mandir?.nameEnglish || "-";
                  dateStr = data?.chadhavaDetails?.date || data?.puja?.date || "-";
                } else {
                  temple = data?.puja?.mandir?.nameEnglish || "-";
                  dateStr = data?.puja?.date || "-";
                }

                // Address Construction
                const addr = data?.address || {};
                const addressStr = [
                  addr?.address1,
                  addr?.city,
                  addr?.state,
                  addr?.pinCode,
                  addr?.country
                ].filter(Boolean).join(", ") || "-";

                // Prasad
                // Check 'prasad' object or 'needPrasad' or 'prasadWanted'
                const hasPrasad = !!data?.prasad || !!data?.needPrasad || !!data?.prasadWanted;
                const prasadText = hasPrasad ? "Yes" : "No";

                // Accessories (Array of {name, quantity})
                let accStr = "-";
                if (Array.isArray(data?.accessories) && data.accessories.length > 0) {
                  accStr = data.accessories
                    .map((a: any) => `${a.name || a.itemName} (x${a.quantity || 1})`)
                    .join(", ");
                }

                // Free Gifts / Combo Selections (if stored there)
                // Sometimes gifts are in 'gifts' array or part of accessories with price 0
                let giftStr = "-";
                if (Array.isArray(data?.gifts) && data.gifts.length > 0) {
                  giftStr = data.gifts.map((g: any) => g.title || g.name).join(", ");
                } else if (data?.freeGifts) {
                  // If structure differs
                  giftStr = JSON.stringify(data.freeGifts);
                }

                return (
                  <tr key={b._id || b.orderID}>
                    <td className="border p-2 text-center">{idx + 1}</td>
                    <td className="border p-2">{b._id}</td>
                    <td className="border p-2">
                      {new Date(isPending ? (b.createdAt || "") : (b.bookingDate || "")).toLocaleString()}
                    </td>
                    <td className="border p-2">{b.orderID}</td>
                    <td className="border p-2">{data?.name || "-"}</td>
                    <td className="border p-2">{data?.whatsapp || data?.mobile || data?.phone || "-"}</td>
                    <td className="border p-2">{temple}</td>
                    <td className="border p-2">
                      {dateStr
                        ? new Date(dateStr).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="border p-2">{data?.totalPrice}</td>
                    <td className="border p-2">
                      {b.status || bookingType}
                    </td>
                    <td className="border p-2">{data?.gotra || "-"}</td>
                    <td className="border p-2">
                      {data?.familyMembers?.join(", ") || "-"}
                    </td>
                    <td className="border p-2 text-xs max-w-[150px]">{addressStr}</td>
                    <td className="border p-2">{prasadText}</td>
                    <td className="border p-2 text-xs max-w-[200px]">{accStr}</td>
                    <td className="border p-2 text-xs">{giftStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PujaTitleBookingsTable;
