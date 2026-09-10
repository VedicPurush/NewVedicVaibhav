import { Suspense } from "react";
import type { Metadata } from "next";
import PujaPage from "@/components/pages/services/puja/PujaPage";

export const metadata: Metadata = {
  title: "Book Online Pooja — Authentic Puja Services from Sacred Temples | Vedic Vaibhav",
  description:
    "Book online pooja from India's most sacred temples. Puja performed by trained priests in your name & gotra. Receive live video and prasad delivery. Ganesh Puja, Rudra Abhishek, Satyanarayan Katha & more.",
  keywords:
    "online pooja booking, book puja online India, Ganesh puja online, Rudra Abhishek, Satyanarayan Katha online, mandir puja booking, virtual pooja service",
  openGraph: {
    title: "Book Online Pooja — Authentic Temple Puja in Your Name & Gotra",
    description:
      "Authentic online puja from India's sacred temples. Performed by priests in your name & gotra with live video. Book now on Vedic Vaibhav.",
    type: "website",
    url: "https://vedicvaibhav.com/services/puja",
  },
  alternates: {
    canonical: "https://vedicvaibhav.com/services/puja",
  },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PujaPage />
    </Suspense>
  );
}
