"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleFilled } from "@ant-design/icons";
import { Card, Tag, Typography, Button, Divider } from "antd";
import confetti from "canvas-confetti";
import Layout from "@/components/layout/Layout";
import { readNavState } from "@/lib/nav-state";
import { paidMoney } from "@/lib/currency";

const { Title, Text } = Typography;

const PageContent = () => {
  const router = useRouter();

  // react-router carried this via location.state; in Next it comes from sessionStorage.
  const [state, setState] = useState<Record<string, any>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setState(readNavState<Record<string, any>>("jyotirling-chadhava-success") ?? {});
    setLoaded(true);
  }, []);

  const {
    devoteeName = "N/A",
    whatsappNumber = "N/A",
    gotra = "N/A",
    family = [],
    bookedTemples = [],
    selectedOfferingObjs = [],
    finalAmount = 0,
    orderID = "N/A",
    transactionID = "N/A",
    currency,
    chargedAmount,
  } = state;

  useEffect(() => {
    // Trigger confetti on mount
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.5 }
    });

    const timer = setTimeout(() => {
      router.push("/profile?tab=jyotirling-chadhava");
    }, 5000); // 5 seconds redirect

    return () => clearTimeout(timer);
  }, [router]);

  if (!loaded) return null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "80vh",
      padding: "20px",
      backgroundColor: "#f9fafb",
      fontFamily: "Poppins, sans-serif"
    }}>
      <Card
        bordered={false}
        style={{
          width: "100%",
          maxWidth: "550px",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
          textAlign: "center",
          padding: "24px 16px"
        }}
      >
        <CheckCircleFilled style={{ fontSize: "72px", color: "#52c41a", marginBottom: "16px" }} />

        <Title level={2} style={{ margin: "0 0 8px 0", color: "#173963", fontWeight: 700 }}>
          🕉 Har Har Mahadev! 🕉
        </Title>
        <Title level={4} style={{ margin: "0 0 24px 0", color: "#52c41a", fontWeight: 600 }}>
          Booking Confirmed Successfully
        </Title>

        <Divider style={{ margin: "16px 0" }} />

        {/* Devotee Info */}
        <div style={{ textAlign: "left", marginBottom: "20px" }}>
          <Title level={5} style={{ color: "#173963", marginBottom: "12px" }}>Devotee Details</Title>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px" }}>
            <div>
              <Text type="secondary">Name:</Text>
              <div style={{ fontWeight: 600, color: "#262626" }}>{devoteeName}</div>
            </div>
            <div>
              <Text type="secondary">Gotra:</Text>
              <div style={{ fontWeight: 600, color: "#262626" }}>{gotra}</div>
            </div>
            <div>
              <Text type="secondary">WhatsApp:</Text>
              <div style={{ fontWeight: 600, color: "#262626" }}>{whatsappNumber}</div>
            </div>
            {family.length > 0 && (
              <div style={{ gridColumn: "span 2" }}>
                <Text type="secondary">Family Members:</Text>
                <div style={{ fontWeight: 600, color: "#262626" }}>{family.filter(Boolean).join(", ")}</div>
              </div>
            )}
          </div>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Seva Info */}
        <div style={{ textAlign: "left", marginBottom: "20px" }}>
          <Title level={5} style={{ color: "#173963", marginBottom: "12px" }}>Booking Summary</Title>

          <div style={{ marginBottom: "12px" }}>
            <Text type="secondary" style={{ display: "block", marginBottom: "4px" }}>Selected Jyotirlingas:</Text>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {bookedTemples.map((t: any) => (
                <Tag color="blue" key={t.id || t._id}>{t.nameEnglish}</Tag>
              ))}
              {bookedTemples.length === 0 && <Text strong>N/A</Text>}
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <Text type="secondary" style={{ display: "block", marginBottom: "4px" }}>Chadhava Offerings:</Text>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {selectedOfferingObjs.map((o: any) => (
                <Tag color="orange" key={o.id || o._id}>{o.name}</Tag>
              ))}
              {selectedOfferingObjs.length === 0 && <Text strong>N/A</Text>}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", padding: "12px", backgroundColor: "#fff7e6", borderRadius: "8px" }}>
            <Text strong style={{ fontSize: "15px", color: "#d46b08" }}>Amount Paid:</Text>
            <Text style={{ fontSize: "20px", fontWeight: 700, color: "#d46b08" }}>{paidMoney({ amount: finalAmount, currency, chargedAmount })}</Text>
          </div>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* IDs */}
        <div style={{ textAlign: "left", fontSize: "12px", backgroundColor: "#f5f5f5", padding: "12px", borderRadius: "8px", marginBottom: "24px" }}>
          <div style={{ marginBottom: "4px" }}>
            <Text type="secondary">Order ID:</Text>{" "}
            <Text copyable={{ text: orderID }} style={{ fontWeight: 500 }}>{orderID}</Text>
          </div>
          <div>
            <Text type="secondary">Transaction ID:</Text>{" "}
            <Text copyable={{ text: transactionID }} style={{ fontWeight: 500 }}>{transactionID}</Text>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Button
            type="primary"
            size="large"
            onClick={() => router.push("/profile?tab=jyotirling-chadhava")}
            style={{
              backgroundColor: "#173963",
              borderColor: "#173963",
              borderRadius: "8px",
              fontWeight: 600,
              height: "45px"
            }}
          >
            Go to My Bookings
          </Button>
          <Button
            size="large"
            onClick={() => router.push("/")}
            style={{
              borderRadius: "8px",
              fontWeight: 600,
              height: "45px",
              color: "#173963",
              borderColor: "#173963"
            }}
          >
            Back to Home
          </Button>
        </div>

        <Text type="secondary" style={{ display: "block", marginTop: "20px", fontSize: "12px" }}>
          Redirecting to your profile in 5 seconds...
        </Text>
      </Card>
    </div>
  );
};

const JyotirlingChadhavaPaymentSuccess = () => {
  return <Layout content={<PageContent />} activeIndex="puja" />;
};

export default JyotirlingChadhavaPaymentSuccess;
