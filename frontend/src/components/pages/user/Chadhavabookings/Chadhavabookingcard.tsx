"use client";

import { Card, Col, Row, Typography, Tag, Divider, Grid } from "antd";
import { paidMoney } from "@/lib/currency";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import React from "react";
import ReviewComponent from "../PoojaBookings/ReviewComponent";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface Accessory {
  id: number;
  name: string;
  desc: string;
  price: number;
  image: string;
  images?: string[]; // array of images for combos
  quantity: number;
}

interface ChadhavaBookingCardProps {
  chadhavaId: string;
  orderID: string;
  transactionID: string;
  name: string;
  pujaTitle: string;
  temple: string;
  date: string;
  totalPrice: number;
  /** Presentment fields from the booking record. Receipts must be shown in the
   *  currency the devotee ACTUALLY PAID IN, never re-priced by today's picker. */
  currency?: string | null;
  chargedAmount?: number | null;
  status: "pending" | "confirmed" | "failed";
  address?: string;
  familyMembers: string;
  bookingDate: string;
  gotra?: string;
  accessories?: Accessory[];
}

const getStatusTag = (status: string) => {
  const tagStyle = {
    fontWeight: 500,
    fontFamily: "Poppins",
    fontSize: 12,
    height: 24,
    paddingInline: 8,
    lineHeight: "22px",
  };

  switch (status) {
    case "confirmed":
      return (
        <Tag icon={<CheckCircleOutlined />} color="success" style={tagStyle}>
          Confirmed
        </Tag>
      );
    case "failed":
      return (
        <Tag icon={<CloseCircleOutlined />} color="error" style={tagStyle}>
          Failed
        </Tag>
      );
    default:
      return (
        <Tag icon={<ClockCircleOutlined />} color="warning" style={tagStyle}>
          Pending
        </Tag>
      );
  }
};

const textStyle = {
  fontFamily: "Poppins",
  fontSize: 13,
  lineHeight: 1.4,
};

const labelStyle = {
  fontWeight: 600,
  marginRight: 6,
};

const ChadhavaBookingCard: React.FC<ChadhavaBookingCardProps> = ({
  chadhavaId,
  orderID,
  transactionID,
  name,
  pujaTitle,
  temple,
  date,
  totalPrice,
  currency,
  chargedAmount,
  status,
  address,
  familyMembers,
  bookingDate,
  gotra,
  accessories,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const showFamily =
    familyMembers && familyMembers.trim().length > 0 && familyMembers !== "N/A";
  const showAddress =
    address && address.trim().length > 0 && address !== "No Address Selected";

  const formatSafeDate = (isoDate: string): string => {
    // Parse safely using split instead of relying on Date()
    const parts = isoDate?.split("T")[0]?.split("-");
    if (parts?.length !== 3) return "Invalid Date";

    const [year, month, day] = parts;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  return (
    <Card
      bordered={false}
      style={{
        marginBottom: 16,
        borderRadius: 12,
        fontFamily: "Poppins",
        boxShadow: "0 6px 14px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}
      styles={{ body: { padding: 0 } }}
      hoverable
    >
      {/* Gradient Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
        }}
        className="py-[12px] pl-[4px]   flex flex-col"
      >
        <div
          className="w-full flex items-start gap-2"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            padding: "12px 16px",
          }}
        >
          {/* Title gets every pixel the row isn't using — flexbox computes the
              exact remaining width itself (unlike a guessed float/padding
              reservation), so it wraps as late as the badge's real size
              actually requires and no later. */}
          <div className="flex-1 min-w-0">
            <Title
              level={5}
              className="!m-0 "
              style={{ color: "#fff", fontFamily: "Poppins", lineHeight: 1.1 }}
            >
              {pujaTitle}
            </Title>
          </div>

          {/* Review badge — top-aligned so it reads as the row's corner
              rather than centered against a multi-line title. */}
          {status === "confirmed" && (
            <div className="shrink-0">
              <ReviewComponent
                poojaname={pujaTitle}
                pujaId={chadhavaId}
                bookingId={orderID}
              />
            </div>
          )}
        </div>

        <Text className="pl-4" style={{ color: "#e0e0e0", ...textStyle }}>
          {temple}
        </Text>
      </div>

      {/* Info Section */}
      <div style={{ padding: "14px 16px" }}>
        <Row gutter={[12, 8]} align="middle">
          {/* Info Grid */}
          <Col span={isMobile ? 24 : 20}>
            <Row gutter={[16, 6]}>
              <Col span={12}>
                <Text style={textStyle}>
                  <span style={labelStyle}>User:</span> {name}
                </Text>
              </Col>
              <Col span={12}>
                <Text style={textStyle}>
                  <span style={labelStyle}>Date:</span>
                  {formatSafeDate(date)}
                </Text>
              </Col>
              <Col span={12}>
                <Text style={textStyle}>
                  <span style={labelStyle}>Gotra:</span> {gotra || "N/A"}
                </Text>
              </Col>
              <Col span={12}>
                <Text style={textStyle}>
                  <span style={labelStyle}>Booking Date:</span>
                  {formatSafeDate(bookingDate)}
                </Text>
              </Col>

              {showFamily && (
                <Col span={24}>
                  <Text style={textStyle}>
                    <span style={labelStyle}>Family Members:</span>{" "}
                    {familyMembers}
                  </Text>
                </Col>
              )}

              {showAddress && (
                <Col span={24}>
                  <Text style={textStyle}>
                    <span style={labelStyle}>Address:</span> {address}
                  </Text>
                </Col>
              )}

              <Col span={24}>
                <Text style={textStyle}>
                  <span style={labelStyle}>Transaction ID:</span>{" "}
                  {transactionID}
                </Text>
              </Col>
            </Row>
          </Col>

          {/* Total Price */}
          <Col
            span={isMobile ? 24 : 4}
            style={{
              textAlign: isMobile ? "left" : "right",
              marginTop: isMobile ? 8 : 0,
            }}
          >
            <div
              style={{
                backgroundColor: "#f0f2ff",
                color: "#2f3e9e",
                fontWeight: 600,
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 13,
                display: "inline-block",
                fontFamily: "Poppins",
              }}
            >
              {paidMoney({ amount: totalPrice, currency, chargedAmount })}
            </div>
          </Col>

          {/* Status and Order ID */}
          <Col
            span={24}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            {getStatusTag(status)}
            <Text type="secondary" style={{ ...textStyle }}>
              Order ID: {orderID}
            </Text>
          </Col>

          {/* Accessories */}
          {accessories && accessories.length > 0 && (
            <>
              <Col span={24}>
                <Divider style={{ fontFamily: "Poppins", margin: "8px 0" }}>
                  Chadhava Details
                </Divider>
              </Col>
              {accessories.map((item) => {
                // Check if this item has multiple images (combo)
                const hasMultipleImages = item.images && item.images.length > 1;

                return (
                  <Col span={24} key={item.id} style={{ marginBottom: 12 }}>
                    {hasMultipleImages ? (
                      /* Combo with multiple images - show scrollable gallery */
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <Text style={{ ...textStyle, fontWeight: 600 }}>
                            {item.name}
                          </Text>
                          {item.quantity > 1 && (
                            <span
                              style={{
                                fontSize: 12,
                                color: "#666",
                                fontFamily: "Poppins",
                              }}
                            >
                              × {item.quantity}
                            </span>
                          )}
                        </div>
                        <Text
                          style={{
                            ...textStyle,
                            fontSize: 12,
                            color: "#666",
                            display: "block",
                            marginBottom: 8,
                          }}
                        >
                          {item.desc}
                        </Text>
                        {/* Horizontal scrollable image gallery */}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            overflowX: "auto",
                            paddingBottom: 8,
                            scrollbarWidth: "thin",
                          }}
                          className="combo-images-scroll"
                        >
                          {item.images?.map((imgUrl: string, idx: number) => (
                            <img
                              loading="lazy"
                              key={idx}
                              src={imgUrl}
                              alt={`${item.name} - ${idx + 1}`}
                              style={{
                                width: 80,
                                height: 80,
                                objectFit: "cover",
                                borderRadius: 8,
                                flexShrink: 0,
                                border: "1px solid #e0e0e0",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Single accessory - original layout */
                      <div
                        style={{ display: "flex", gap: 12, alignItems: "center" }}
                      >
                        <img
                          loading="lazy"
                          src={item.image}
                          alt={item.name}
                          style={{
                            width: 50,
                            height: 50,
                            objectFit: "cover",
                            borderRadius: 8,
                          }}
                        />
                        <div>
                          <Text style={{ ...textStyle, fontWeight: 600 }}>
                            {item.name}
                          </Text>
                          <br />
                          <Text style={{ ...textStyle, fontSize: 12 }}>
                            {item.desc}
                          </Text>
                        </div>
                      </div>
                    )}
                  </Col>
                );
              })}
            </>
          )}

          {/* Add CSS for smooth scrolling */}
          <style>{`
            .combo-images-scroll::-webkit-scrollbar {
              height: 4px;
            }
            .combo-images-scroll::-webkit-scrollbar-track {
              background: #f1f1f1;
              border-radius: 4px;
            }
            .combo-images-scroll::-webkit-scrollbar-thumb {
              background: #888;
              border-radius: 4px;
            }
            .combo-images-scroll::-webkit-scrollbar-thumb:hover {
              background: #555;
            }
          `}</style>
        </Row>
      </div>
    </Card>
  );
};

export default ChadhavaBookingCard;
