import type { Metadata } from "next";
import SanatanYatra from "@/components/pages/sanatan-yatra/sanatanyatra";

export const metadata: Metadata = {
  title: "Sanatan Yatra — Divine Spiritual Journeys | Vedic Vaibhav",
  description:
    "Experience the divine journey to sacred places across India with Sanatan Yatra. We offer curated, spiritually guided pilgrimage packages tailored to your needs.",
};

export default function Page() {
  return <SanatanYatra />;
}
