"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";

// CSS-in-JS styles for the spinner
const spinnerStyle: React.CSSProperties = {
  border: "16px solid #f3f3f3" /* Light grey */,
  borderTop: "16px solid #3498db" /* Blue */,
  borderRadius: "50%",
  width: "120px",
  height: "120px",
  animation: "spin 2s linear infinite",
};

// CSS-in-JS styles for the container to center the spinner
const containerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh", // Full height of the viewport
  flexDirection: "column", // To stack the spinner and text vertically
};

const PersonalizedPaymentHandler: React.FC = () => {
  const params = useParams<{ merchantTransactionId: string }>();
  const merchantTransactionId = params?.merchantTransactionId;
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Insert keyframes dynamically in a local <style> element
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleElement);

    const processPayment = async () => {
      if (!merchantTransactionId) {
        console.error("No merchantTransactionId found.");
        router.push("/payment-failure-2");
        return;
      }

      // The booking is confirmed by the Razorpay webhook, which can land a moment
      // after the browser gets here. Poll instead of judging on the first answer —
      // a single check used to send everyone to the failure page.
      const outcome = await verifyPaymentWithRetry<{ success?: boolean }>({
        attempt: async () =>
          (
            await api.get("/personalized-pooja-payment-status", {
              params: { orderId: merchantTransactionId },
            })
          ).data,
      });

      setLoading(false);

      if (outcome.status === "declined") {
        router.push("/payment-failure-2");
        return;
      }
      // Confirmed, or still settling — either way the payment went through, so
      // send the user to their bookings rather than to a failure screen.
      router.push("/profile?tab=personalized");
    };

    processPayment();

    return () => {
      document.head.removeChild(styleElement); // Clean up the style element on unmount
    };
  }, [merchantTransactionId, router]);

  return (
    <div style={containerStyle}>
      <h2>Redirecting, please wait...</h2>
      {loading && <div style={spinnerStyle} />}
    </div>
  );
};

export default PersonalizedPaymentHandler;
