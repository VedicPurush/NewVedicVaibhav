import type { Metadata } from "next";
import JyotirlingChadhavaPaymentSuccess from "@/components/pages/services/new-jyotirling-chadhava/JyotirlingChadhavaPaymentSuccess";

export const metadata: Metadata = {
  title: "Booking Confirmed | Vedic Vaibhav",
};

export default function Page() {
  return <JyotirlingChadhavaPaymentSuccess />;
}
