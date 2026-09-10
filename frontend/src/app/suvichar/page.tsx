import type { Metadata } from "next";
import Suvichar from "@/components/pages/explore/Suvichar";

export const metadata: Metadata = {
  title: "Suvichar — Hindi & English Spiritual Quotes Daily | Vedic Vaibhav",
  description:
    "Read inspiring suvichar (spiritual quotes) in Hindi and English daily. Motivational thoughts from the Bhagavad Gita, saints, and Vedic wisdom. Share on WhatsApp.",
  alternates: { canonical: "https://vedicvaibhav.com/suvichar" },
};

export default function Page() {
  return <Suvichar />;
}
