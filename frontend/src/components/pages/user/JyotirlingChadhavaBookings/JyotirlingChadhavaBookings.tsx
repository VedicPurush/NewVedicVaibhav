"use client";

import React, { useEffect, useState } from "react";
import { paidMoney } from "@/lib/currency";
import {
  Table,
  Tag,
  Card,
  Typography,
  Spin,
  Alert,
  Empty,
  Grid,
  Pagination,
} from "antd";
import { api } from "@/lib/api";

import DetailsToggle from "../DetailsToggle";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface Booking {
  _id: string;
  orderID: string;
  transactionID: string;
  name: string;
  whatsapp: string;
  gotra: string;
  selectedTemples: any[];
  selectedOfferings: any[];
  totalPrice: number;
  bookingDate: string;
  status: string;
}

const MobileBookingCard: React.FC<{ booking: Booking }> = ({ booking }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusTag = (status: string) => {
    let color = "orange";
    if (status === "confirmed") color = "green";
    if (status === "failed") color = "red";
    return (
      <Tag color={color} style={{ margin: 0 }}>
        {status.toUpperCase()}
      </Tag>
    );
  };

  const caption: React.CSSProperties = {
    fontSize: "10.5px",
    color: "#8c8c8c",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  };

  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid #f0f0f0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        overflow: "hidden",
        backgroundColor: "#fff",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      {/* Header — the devotee and status identify the booking; the order id is a
          support reference and sits in the details with the rest. */}
      <div
        style={{
          background: "linear-gradient(135deg, #7A0F1F 0%, #C2410C 100%)",
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ ...caption, color: "rgba(255,255,255,0.7)" }}>Devotee</div>
          <div
            style={{
              color: "#fff",
              fontWeight: 600,
              fontSize: "14px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {booking.name}
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>{getStatusTag(booking.status)}</div>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
          <div style={caption}>Amount Paid</div>
          <div style={{ fontSize: "17px", fontWeight: 700, color: "#FF7722" }}>
            {paidMoney(booking)}
          </div>
        </div>

        <div>
          <div style={{ ...caption, marginBottom: "4px" }}>Selected Jyotirling</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {booking.selectedTemples.map((t) => (
              <Tag color="volcano" key={t.id} style={{ margin: 0, borderRadius: "4px" }}>
                {t.nameEnglish}
              </Tag>
            ))}
          </div>
        </div>

        <div>
          <div style={{ ...caption, marginBottom: "4px" }}>Chadhava Seva</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {booking.selectedOfferings.map((o) => (
              <Tag color="orange" key={o.id} style={{ margin: 0, borderRadius: "4px" }}>
                {o.name}
              </Tag>
            ))}
          </div>
        </div>

        <DetailsToggle open={showDetails} onToggle={() => setShowDetails((v) => !v)} />

        {showDetails && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <div style={caption}>Booking ID</div>
              <Text
                copyable={{ text: booking.orderID }}
                style={{ fontSize: "12px", fontWeight: 500, color: "#595959", wordBreak: "break-all" }}
              >
                <span style={{ color: "#595959" }}>{booking.orderID}</span>
              </Text>
            </div>

            {booking.gotra && (
              <div>
                <div style={caption}>Gotra</div>
                <div style={{ fontSize: "12px", fontWeight: 500, color: "#595959", wordBreak: "break-all" }}>
                  {booking.gotra}
                </div>
              </div>
            )}

            <div>
              <div style={caption}>Booking Date</div>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "#595959", wordBreak: "break-all" }}>
                {new Date(booking.bookingDate).toLocaleDateString()}
              </div>
            </div>

            {booking.transactionID && (
              <div>
                <div style={caption}>Transaction ID</div>
                <Text
                  copyable={{ text: booking.transactionID }}
                  style={{ fontSize: "12px", fontWeight: 500, color: "#595959", wordBreak: "break-all" }}
                >
                  <span style={{ color: "#595959" }}>{booking.transactionID}</span>
                </Text>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const JyotirlingChadhavaBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const userDetails = JSON.parse(
          localStorage.getItem("userDetails") || "{}"
        );
        // Extract phone number from stored details, fallback to local userPhone
        const phone =
          userDetails?.user?.phone || localStorage.getItem("userPhone");

        if (!phone) {
          setError("User not authenticated or phone number missing.");
          setLoading(false);
          return;
        }

        const res = await api.get(
          `/api/jyotirling-chadhava/bookings/${encodeURIComponent(phone)}`
        );

        if (res.data.success) {
          setBookings(res.data.data);
        } else {
          setError("Failed to fetch bookings.");
        }
      } catch (err) {
        console.error("Error fetching Jyotirling Chadhava bookings:", err);
        setError("Error fetching bookings. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const columns = [
    {
      title: "Booking ID",
      dataIndex: "orderID",
      key: "orderID",
      render: (text: string) => <Text copyable>{text}</Text>,
    },
    {
      title: "Devotee Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Booking) => (
        <>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            Gotra: {record.gotra || "N/A"}
          </Text>
        </>
      ),
    },
    {
      title: "Selected Jyotirling",
      key: "selectedTemples",
      render: (_: any, record: Booking) => (
        <>
          {record.selectedTemples.map((t) => (
            <Tag color="volcano" key={t.id} style={{ marginBottom: "4px" }}>
              {t.nameEnglish}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: "Chadhava Seva",
      key: "selectedOfferings",
      render: (_: any, record: Booking) => (
        <>
          {record.selectedOfferings.map((o) => (
            <Tag color="orange" key={o.id} style={{ marginBottom: "4px" }}>
              {o.name}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: "Booking Date",
      dataIndex: "bookingDate",
      key: "bookingDate",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Amount Paid",
      dataIndex: "totalPrice",
      key: "totalPrice",
      // Reads the row's OWN currency, not today's picker — see paidMoney().
      render: (amount: number, row: any) => paidMoney({ ...row, amount }),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = "orange";
        if (status === "confirmed") color = "green";
        if (status === "failed") color = "red";
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }

  const paginatedBookings = bookings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <Card
      title={
        <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: "#7A0F1F" }}>
          Jyotirling Chadhava Bookings
        </Title>
      }
      style={{ borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
      styles={{ body: { padding: isMobile ? "12px" : "24px" } }}
    >
      {bookings.length === 0 ? (
        <Empty description="No Jyotirling Chadhava bookings found." />
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {paginatedBookings.map((booking) => (
            <MobileBookingCard key={booking._id} booking={booking} />
          ))}
          {bookings.length > pageSize && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "8px",
              }}
            >
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={bookings.length}
                onChange={(page) => setCurrentPage(page)}
                size="small"
              />
            </div>
          )}
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={bookings}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      )}
    </Card>
  );
};

export default JyotirlingChadhavaBookings;
