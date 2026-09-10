import type { Metadata } from "next";
import PersonalizedPaymentHandler from "@/components/pages/user/PersonalizedPujaBookings/PersonalizedPaymentHandler";

export const metadata: Metadata = {
  title: "Processing Payment | Vedic Vaibhav",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PersonalizedPaymentHandler />;
}
