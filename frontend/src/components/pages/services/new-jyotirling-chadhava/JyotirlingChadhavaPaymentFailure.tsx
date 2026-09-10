"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloseCircleFilled } from "@ant-design/icons";
import { Card, Typography, Button, Divider } from "antd";
import Layout from "@/components/layout/Layout";
import { readNavState } from "@/lib/nav-state";
import { useMoney } from "@/lib/currency";

const { Title, Text } = Typography;

const PageContent = () => {
  /** Nothing was actually charged, so this shows the India list price in the
   *  devotee's own currency for display — never paidMoney(). */
  const { money } = useMoney();
  const router = useRouter();

  // react-router carried this via location.state; in Next it comes from sessionStorage.
  const [state, setState] = useState<Record<string, any>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setState(readNavState<Record<string, any>>("jyotirling-chadhava-failure") ?? {});
    setLoaded(true);
  }, []);

  const {
    finalAmount = 0,
    orderID = "N/A",
    errorReason = "Payment failed or cancelled."
  } = state;

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/profile?tab=jyotirling-chadhava");
    }, 10000); // 10 seconds redirect

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
          maxWidth: "500px",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
          textAlign: "center",
          padding: "24px 16px"
        }}
      >
        <CloseCircleFilled style={{ fontSize: "72px", color: "#ff4d4f", marginBottom: "16px" }} />

        <Title level={2} style={{ margin: "0 0 8px 0", color: "#173963", fontWeight: 700 }}>
          Booking Failed
        </Title>
        <Title level={4} style={{ margin: "0 0 24px 0", color: "#ff4d4f", fontWeight: 600 }}>
          Payment Transaction Unsuccessful
        </Title>

        <Divider style={{ margin: "16px 0" }} />

        {/* Error Details */}
        <div style={{ textAlign: "left", marginBottom: "20px" }}>
          <Title level={5} style={{ color: "#173963", marginBottom: "12px" }}>Failure Details</Title>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
            <div>
              <Text type="secondary">Reason for failure:</Text>
              <div style={{ fontWeight: 600, color: "#ff4d4f", marginTop: "2px" }}>{errorReason}</div>
            </div>
            {finalAmount > 0 && (
              <div>
                <Text type="secondary">Attempted Amount:</Text>
                <div style={{ fontWeight: 600, color: "#262626" }}>{money(finalAmount)}</div>
              </div>
            )}
            <div>
              <Text type="secondary">Order ID:</Text>
              <div style={{ fontWeight: 500, color: "#262626" }}>
                <Text copyable={{ text: orderID }}>{orderID}</Text>
              </div>
            </div>
          </div>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Button
            type="primary"
            size="large"
            onClick={() => router.push("/services/new-jyotirling-chadhava")}
            style={{
              backgroundColor: "#173963",
              borderColor: "#173963",
              borderRadius: "8px",
              fontWeight: 600,
              height: "45px"
            }}
          >
            Try Again
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
          Redirecting to your profile in a few seconds...
        </Text>
      </Card>
    </div>
  );
};

const JyotirlingChadhavaPaymentFailure = () => {
  return <Layout content={<PageContent />} activeIndex="puja" />;
};

export default JyotirlingChadhavaPaymentFailure;
