"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiUrl } from "@/lib/api";

// ---------------- DATE HELPERS (pick latest from array) ----------------
const parseFlexibleDate = (value: any): Date | null => {
  if (!value) return null;

  // If it's already a Date
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  // If it's a number timestamp
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // If it's a string
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    // dd-mm-yyyy
    const m1 = s.match(/^([0-3]?\d)-([0-1]?\d)-(\d{4})$/);
    if (m1) {
      const dd = Number(m1[1]);
      const mm = Number(m1[2]);
      const yyyy = Number(m1[3]);
      const d = new Date(yyyy, mm - 1, dd, 0, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }

    // yyyy-mm-dd or ISO
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

const pickLatestDateValue = (value: any): any => {
  // If backend returns an array of dates, pick the latest
  if (Array.isArray(value)) {
    const latest = value
      .map(parseFlexibleDate)
      .filter(Boolean) as Date[];
    if (latest.length === 0) return null;
    latest.sort((a, b) => b.getTime() - a.getTime());
    return value[latest.findIndex((d) => d.getTime() === latest[0].getTime())] ?? value[0];
  }
  return value;
};

const formatDateForUI = (value: any): string => {
  const v = pickLatestDateValue(value);
  const d = parseFlexibleDate(v);
  if (!d) return "-";
  return d.toLocaleDateString();
};
// ---------------------------------------------------------------------

const ADMIN_USERNAME = "vedicvaibhav72@gmail.com";
const ADMIN_PASSWORD = "panditjiatrequest@123";

const PujaBookingsByPujaIdPage: React.FC = () => {
  const { poojaId } = useParams<{ poojaId: string }>();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // state to control which type is active: "pending" or "confirmed"
  const [bookingType, setBookingType] = useState<"pending" | "confirmed" | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      setAuthError("Invalid username or password");
    }
  };

  // Fetch bookings whenever type or poojaId changes (and only after login)
  useEffect(() => {
    if (!isAuthenticated || !poojaId || !bookingType) return;

    setLoading(true);
    setError(null);

    let url = "";
    if (bookingType === "confirmed") {
      url = apiUrl(`/fetch-booked-pooja-by-puja-id/${poojaId}`);
    } else {
      url = apiUrl(`/fetch-pending-pooja-by-puja-id/${poojaId}`);
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (bookingType === "confirmed") {
          setBookings(data.bookings || data.poojaBooked || []);
        } else {
          setBookings(data.bookings || []);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch bookings.");
        setLoading(false);
      });
  }, [isAuthenticated, poojaId, bookingType]);

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
          <button
            className="bg-orange-500 text-white font-bold px-4 py-2 rounded w-full"
            type="submit"
          >
            Login
          </button>
          {authError && <div className="text-red-600">{authError}</div>}
        </form>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">
        Puja Bookings (Puja ID: <span className="text-orange-600">{poojaId}</span>)
      </h1>

      {/* Button group */}
      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded font-bold border ${bookingType === "pending" ? "bg-orange-500 text-white" : "bg-white border-orange-400 text-orange-700"}`}
          onClick={() => setBookingType("pending")}
        >
          Pending Booking
        </button>
        <button
          className={`px-4 py-2 rounded font-bold border ${bookingType === "confirmed" ? "bg-orange-500 text-white" : "bg-white border-orange-400 text-orange-700"}`}
          onClick={() => setBookingType("confirmed")}
        >
          Confirm Booking
        </button>

        {bookingType && (
          <button
            onClick={() => {
              const url = apiUrl(`/export-pooja-bookings?type=${bookingType}&poojaId=${poojaId || ""}`);
              window.open(url, '_blank');
            }}
            className="px-4 py-2 rounded font-bold bg-green-600 text-white hover:bg-green-700 ml-auto"
          >
            Download Excel 📊
          </button>
        )}
      </div>

      {!bookingType && <div>Please select a booking type.</div>}

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}

      {/* Table only shows if a type is picked and results available */}
      {!loading && bookings.length === 0 && bookingType && <div>No bookings found.</div>}

      {!loading && bookings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-slate-300 text-sm">
            <thead>
              <tr className="bg-orange-100">
                <th className="border p-2">SNo</th>
                <th className="border p-2">Booking ID</th>
                <th className="border p-2">User ID</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Mobile</th>
                <th className="border p-2">Pooja Name</th>
                <th className="border p-2">Pooja Date</th>
                {bookingType === "confirmed" && <th className="border p-2">Time</th>}
                <th className="border p-2">Total ₹</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Prasad</th>
                <th className="border p-2">Address</th>
                <th className="border p-2">Details</th>
              </tr>
            </thead>

            <tbody>
              {bookings.map((b, idx) => {
                const isPending = bookingType === "pending";
                // Normalized extraction
                const uId = b.userID || b.bookingDetails?.userID || "-";
                // Pending object usually wraps details in bookingDetails
                const core = isPending ? b.bookingDetails : b;

                const poojaName = core?.poojaname || core?.poojaName || core?.poojaID || "-";
                const dateVal = isPending ? core?.poojadate : b.poojadate;
                const price = core?.totalPrice || b.totalPrice;
                const status = isPending ? b.status : b.poojaStatus;

                // Prasad check
                const prasad = core?.prasadStatus || b.prasadStatus || (core?.needPrasad ? "Yes" : "No");

                // Mobile
                const mobile = core?.mobile || core?.whatsapp || b.mobile || "-";
                const name = core?.name || core?.userName || b.bhaktaNames?.[0] || "-";

                // Address construction
                const addrObj = core?.address || b.address;
                let addrStr = "-";
                if (addrObj && typeof addrObj === 'object') {
                  addrStr = [addrObj.address1, addrObj.city, addrObj.state, addrObj.pinCode].filter(Boolean).join(", ");
                } else if (typeof addrObj === 'string') {
                  addrStr = addrObj;
                }

                // Extra details like Gotra/Family
                const details = [];
                if (core?.gotra) details.push(`Gotra: ${Array.isArray(core.gotra) ? core.gotra.join(",") : core.gotra}`);
                if (core?.bhaktaNames) details.push(`Names: ${Array.isArray(core.bhaktaNames) ? core.bhaktaNames.join(",") : core.bhaktaNames}`);
                if (b.transactionId) details.push(`Txn: ${b.transactionId}`);

                return (
                  <tr key={b._id}>
                    <td className="border p-2 text-center">{idx + 1}</td>
                    <td className="border p-2 text-xs">{b._id}</td>
                    <td className="border p-2 text-xs">{uId}</td>
                    <td className="border p-2">{name}</td>
                    <td className="border p-2">{mobile}</td>
                    <td className="border p-2">{poojaName}</td>
                    <td className="border p-2">{formatDateForUI(dateVal)}</td>
                    {!isPending && <td className="border p-2">{b.poojatime}</td>}
                    <td className="border p-2">{price}</td>
                    <td className="border p-2">{status}</td>
                    <td className="border p-2">{prasad}</td>
                    <td className="border p-2 text-xs max-w-[150px]">{addrStr}</td>
                    <td className="border p-2 text-xs max-w-[200px]">{details.join(" | ")}</td>
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

export default PujaBookingsByPujaIdPage;
