"use client";

import { useEffect, useState } from "react";
import { Row, Col, Spin, message } from "antd";
import useMediaQuery from "@mui/material/useMediaQuery";
import ChadhavaBookingCard from "./Chadhavabookingcard";
import { api } from "@/lib/api";

// --- Types ---
interface Address {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
}

interface Puja {
  title?: string;
  temple?: string;
  date?: string; // ISO preferred
}

type BookingStatus = "confirmed" | "pending" | string;

interface Booking {
  /** Presentment fields, written by the server on every payable record. */
  currency?: string;
  chargedAmount?: number;
  _id?: string;
  orderID?: string;
  transactionID?: string;
  name?: string;
  puja?: Puja;
  totalPrice?: number;
  status?: BookingStatus;
  address?: Address;
  familyMembers?: string[] | string;
  bookingDate?: string; // ISO preferred
  gotra?: string;
  accessories?: any[]; // can be string[] or object[] from backend
  comboSelections?: any[]; // present only for combo bookings
  createdAt?: string; // if API provides
  // normalized fields:
  _pendingId?: string;
}

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

const normalizeStatus = (s?: string): "pending" | "confirmed" | "failed" => {
  if (s === "confirmed") return "confirmed";
  if (s === "pending") return "pending";
  return "failed";
};

// --- helpers for robust date sorting ---
const toTime = (value?: unknown): number => {
  if (!value) return 0;
  const d = new Date(String(value));
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
};

const getSortKey = (b: Booking): number => {
  // priority: bookingDate > createdAt > puja.date
  const candidates: (string | undefined)[] = [
    b.bookingDate,
    b.createdAt,
    b.puja?.date,
  ];
  for (const c of candidates) {
    const t = toTime(c);
    if (t) return t;
  }
  return 0;
};

// Build accessories list for the card.
// If comboSelections exists, include them.
// Also include regular accessories if they exist.
// Show BOTH when both are present.
const buildAccessoriesForCard = (b: Booking): any[] => {
  const result: any[] = [];

  // Add combo items if they exist
  const combos = Array.isArray((b as any).comboSelections)
    ? (b as any).comboSelections
    : [];
  if (combos.length > 0) {
    const comboItems = combos.map((c: any, idx: number) => {
      // Extract images array from combo
      const comboImages = c?.images && c?.images.length > 0 ? c?.images : [];
      const fallbackImage =
        c?.image || "https://via.placeholder.com/100?text=Combo";

      return {
        id:
          c?.comboId ||
          c?._id ||
          `combo-${idx}-${Math.random().toString(36).substr(2, 9)}`,
        name: c?.comboName || c?.comboId || "Combo",
        desc: c?.comboDescription || "Combo Package",
        image: fallbackImage, // single image for backward compat
        images: comboImages.length > 0 ? comboImages : [fallbackImage], // array of all images
        quantity: Number(c?.quantity || 1),
        price: Number(c?.price || 0),
      };
    });
    result.push(...comboItems);
  }

  // Add individual accessories if they exist
  const acc = Array.isArray(b.accessories) ? b.accessories : [];
  if (acc.length > 0) {
    const accessoryItems = acc.map((a: any, idx: number) => {
      if (typeof a === "string")
        return {
          id: `acc-str-${idx}`,
          name: a,
          quantity: 1,
          desc: "",
          price: 0,
          image: "",
        };
      const name = a?.name || a?.title || a?.desc || "Accessory";
      const quantity = Number(a?.quantity ?? a?.qty ?? 1);
      // For individual accessories, wrap single image in array for consistent handling
      const images = a?.image ? [a.image] : [];
      return {
        ...a,
        id: a?.id || a?._id || `acc-${idx}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        quantity,
        images,
      };
    });
    result.push(...accessoryItems);
  }

  return result;
};

const ChadhavaBookings = () => {
  const [bookingDetails, setBookingDetails] = useState<Booking[]>([]);
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
    const fetchBooking = async () => {
      setLoading(true);
      const userDetailsRaw = localStorage.getItem("userDetails") || "{}";
      const userDetails = JSON.parse(userDetailsRaw);

      const promises = [];

      // 1. Fetch old bookings via Phone
      let phoneNumber: string | undefined = userDetails?.user?.phone;
      if (phoneNumber) {
        phoneNumber = phoneNumber.replace(/\D/g, "");
        if (phoneNumber.startsWith("91")) phoneNumber = phoneNumber.slice(2);
        promises.push(
          api
            .get(`/chadhava-details/${encodeURIComponent(phoneNumber)}`)
            .then((res) => ({ type: "old", data: res.data }))
            .catch((err) => ({ type: "old", error: err }))
        );
      }

      // 2. Fetch new bookings via Phone (same number as old API)
      if (phoneNumber) {
        promises.push(
          api
            .get(`/newChadhava/user-bookings/${phoneNumber}`)
            .then((res) => ({ type: "new", data: res.data }))
            .catch((err) => ({ type: "new", error: err }))
        );
      }

      try {
        const results = await Promise.allSettled(promises);
        const allBookings: Booking[] = [];

        results.forEach((result) => {
          if (result.status === "rejected") return;
          const val = result.value as any; // { type, data/error }
          if (val.error || !val.data?.success) return;

          if (val.type === "old") {
            const data = val.data;
            // --- Old API Handling ---
            if (data.bookingDetails) {
              const arr = Array.isArray(data.bookingDetails)
                ? data.bookingDetails
                : [data.bookingDetails];
              allBookings.push(...arr);
            } else {
              // Confirmed + Pending arrays
              const confirmed = Array.isArray(data.confirmedBookings)
                ? data.confirmedBookings
                : [];
              const pendingRaw = Array.isArray(data.pendingBookings)
                ? data.pendingBookings
                : [];

              const confirmedNormalized = confirmed.map((c: any) => ({
                ...c,
                status: "confirmed",
              }));
              const pendingNormalized = pendingRaw.map((p: any) => {
                const details = p?.bookingDetails ?? p;

                // Handle New API structure within Pending bookings
                if (details?.puja?.chadhavaName || details?.puja?.bookedSections) {
                  const accessories =
                    details.puja?.bookedSections?.flatMap((sec: any) =>
                      sec.items.map((it: any) => ({
                        name: it.itemName,
                        quantity: it.quantity,
                        image: it.itemImage?.location,
                        price: it.itemPrice,
                        desc: it.itemDesc,
                      }))
                    ) || [];

                  const offers =
                    details.puja?.offerApplied?.map((off: any) => ({
                      name: off.offerName,
                      quantity: 1,
                      image: off.images?.[0]?.location,
                      price: off.offerPrice,
                      desc: off.offerDescription,
                    })) || [];

                  if (offers.length > 0) accessories.push(...offers);

                  return {
                    ...details,
                    puja: {
                      title: details.puja?.chadhavaName,
                      temple: details.puja?.mandir?.nameEnglish,
                      date: details.puja?.date,
                    },
                    accessories: accessories,
                    comboSelections: [],
                    _pendingId: p?._id,
                    status: "pending",
                    createdAt: details.createdAt ?? p?.createdAt,
                  };
                }

                return {
                  ...details,
                  comboSelections:
                    details?.comboSelections ?? p?.comboSelections ?? [],
                  _pendingId: p?._id,
                  status: "pending",
                  createdAt: details.createdAt ?? p?.createdAt,
                };
              });
              allBookings.push(...confirmedNormalized, ...pendingNormalized);
            }
          } else if (val.type === "new") {
            // --- New API Handling ---
            const newBookings = Array.isArray(val.data.bookings)
              ? val.data.bookings
              : [];
            const mappedNew = newBookings.map((b: any) => {
              // Flatten bookedSections into accessories for card display
              const accessories =
                b.puja?.bookedSections?.flatMap((sec: any) =>
                  sec.items.map((it: any) => ({
                    name: it.itemName,
                    quantity: it.quantity,
                    image: it.itemImage?.location,
                    price: it.itemPrice,
                    desc: it.itemDesc,
                  }))
                ) || [];

              // Offers to comboSelections/accessories
              const offers =
                b.puja?.offerApplied?.map((off: any) => ({
                  name: off.offerName,
                  quantity: 1,
                  image: off.images?.[0]?.location,
                  price: off.offerPrice,
                  desc: off.offerDescription,
                })) || [];

              if (offers.length > 0) accessories.push(...offers);

              return {
                _id: b._id,
                orderID: b.orderID,
                transactionID: b.transactionID,
                name: b.name,
                puja: {
                  title: b.puja?.chadhavaName,
                  temple: b.puja?.mandir?.nameEnglish,
                  date: b.puja?.date,
                },
                totalPrice: b.totalPrice,
                status: b.status,
                address: b.address,
                familyMembers: b.familyMembers,
                bookingDate: b.bookingDate,
                gotra: b.gotra,
                accessories: accessories, // Mapped for display
                comboSelections: [],
                createdAt: b.createdAt,
              };
            });
            allBookings.push(...mappedNew);
          }
        });

        if (allBookings.length > 0) {
          // Sort all by date
          const sorted = allBookings.sort((a, b) => getSortKey(b) - getSortKey(a));
          setBookingDetails(sorted);
        } else {
          setBookingDetails([]);
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
        message.error("Failed to fetch bookings.");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!bookingDetails || bookingDetails.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        No Chadhava bookings found.
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
          fontFamily: "Poppins",
          color: "rgba(0,0,0,0.8)",
          fontSize: "18px",
          fontWeight: 500,
          marginBottom: "2%",
        }}
      >
        My Chadhava Bookings
      </div>

      <Row gutter={[16, 16]}>
        {bookingDetails.map((b, i) => {
          const addressParts = [
            b?.address?.address1,
            b?.address?.address2,
            b?.address?.city,
            b?.address?.state ? `(${b?.address?.state})` : "",
            b?.address?.pinCode,
          ];
          const fullAddress =
            addressParts.filter(Boolean).join(", ") || "No Address Selected";

          return (
            <Col
              span={24}
              key={b.orderID ?? b._pendingId ?? b.transactionID ?? `bk-${i}`}
            >
              <ChadhavaBookingCard
                chadhavaId={b._id ?? "N/A"}
                orderID={b.orderID ?? b._pendingId ?? b.transactionID ?? "N/A"}
                transactionID={b.transactionID ?? "N/A"}
                name={b.name ?? "N/A"}
                pujaTitle={b?.puja?.title ?? "N/A"}
                temple={b?.puja?.temple ?? "N/A"}
                date={b?.puja?.date ?? b.bookingDate ?? "N/A"}
                totalPrice={b.totalPrice ?? 0}
                currency={b.currency}
                chargedAmount={b.chargedAmount}
                status={normalizeStatus(b.status as string)}
                address={fullAddress}
                familyMembers={
                  Array.isArray(b.familyMembers)
                    ? b.familyMembers.join(", ")
                    : b.familyMembers ?? "N/A"
                }
                bookingDate={b.bookingDate ?? "N/A"}
                gotra={b.gotra ?? "N/A"}
                accessories={buildAccessoriesForCard(b) as any}
              />
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default ChadhavaBookings;
