import type { Metadata } from "next";
import YatraLandingPage from "@/components/pages/services/four-dham-yatra/YatraLandingPage";

export const metadata: Metadata = {
  title: "4 Dham Yatra — Kedarnath, Badrinath, Gangotri & Yamunotri Pilgrimage | Vedic Vaibhav",
  description:
    "Book your sacred 4 Dham Yatra — Kedarnath, Badrinath, Gangotri, and Yamunotri. Guided pilgrimage packages from Vedic Vaibhav. Authentic darshan, pooja, and prasad at all four dhams.",
  keywords:
    "4 dham yatra booking, Chardham yatra, Kedarnath yatra, Badrinath darshan, Gangotri pilgrimage, Yamunotri yatra, online dham yatra package",
  openGraph: {
    title: "4 Dham Yatra — Sacred Pilgrimage to Kedarnath, Badrinath, Gangotri & Yamunotri",
    description:
      "Book authentic 4 Dham Yatra with Vedic Vaibhav. Guided pilgrimage to all four sacred dhams with darshan, pooja & prasad included.",
    type: "website",
    url: "https://vedicvaibhav.com/4-dham-yatra",
  },
  alternates: { canonical: "https://vedicvaibhav.com/4-dham-yatra" },
};

export default function Page() {
  return <YatraLandingPage />;
}
