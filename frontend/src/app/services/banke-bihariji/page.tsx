import type { Metadata } from "next";
import BankeBihariji from "@/components/pages/services/banke-bihariji";

export const metadata: Metadata = {
  title: "Shri Banke Bihari Ji Seva — Online Pooja & Prasad from Vrindavan | Vedic Vaibhav",
  description:
    "Book online Shri Banke Bihari Ji pooja and prasad service from Vrindavan. Authentic seva performed at Shri Banke Bihari Mandir. Receive live puja video, prasad delivery, and blessings in your name & gotra. Starting from ₹399.",
  keywords:
    "Banke Bihari Ji online pooja, Vrindavan mandir seva, Banke Bihari prasad delivery, online darshan Vrindavan, Shri Banke Bihari Ji puja booking",
  openGraph: {
    title: "Shri Banke Bihari Ji Seva — Online Pooja & Prasad from Vrindavan",
    description:
      "Book authentic Shri Banke Bihari Ji pooja from Vrindavan. Puja performed in your name & gotra. Prasad delivered to your home. Starting ₹399.",
    type: "website",
    url: "https://vedicvaibhav.com/services/banke-bihariji",
  },
  alternates: { canonical: "https://vedicvaibhav.com/services/banke-bihariji" },
};

export default function Page() {
  return <BankeBihariji />;
}
