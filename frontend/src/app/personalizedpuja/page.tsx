import type { Metadata } from "next";
import PersonalizedPuja from "@/components/pages/personalized-puja/PersonalizedPuja";

export const metadata: Metadata = {
  title: "Personalized Puja Booking — Custom Puja at Your Chosen Temple | Vedic Vaibhav",
  description:
    "Book a personalized puja at any temple in India. Choose your deity, date, and mandir. Puja performed in your name and gotra by experienced pandits. Video proof and prasad delivery included.",
  alternates: { canonical: "https://vedicvaibhav.com/personalizedpuja" },
};

export default function Page() {
  return <PersonalizedPuja />;
}
