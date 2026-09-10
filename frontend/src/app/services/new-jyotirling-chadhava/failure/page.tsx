import type { Metadata } from "next";
import JyotirlingChadhavaPaymentFailure from "@/components/pages/services/new-jyotirling-chadhava/JyotirlingChadhavaPaymentFailure";

export const metadata: Metadata = {
  title: "Booking Failed | Vedic Vaibhav",
};

export default function Page() {
  return <JyotirlingChadhavaPaymentFailure />;
}
