import type { Metadata } from "next";
import ChadhavaList3 from "@/components/pages/services/chadhava/ChadhavaList3";

export const metadata: Metadata = {
  title: "Upcoming Chadhava — Book Temple Offerings Online | Vedic Vaibhav",
  description:
    "Book upcoming chadhava at India's sacred temples. Offerings performed in your name & gotra. Live video + prasad delivery. Ganesh Chaturthi, Navratri, Ekadashi chadhava and more.",
  keywords:
    "chadhava booking online, temple offering India, online chadhava, Navratri chadhava, prasad delivery, book temple offerings, Vrindavan chadhava",
  openGraph: {
    title: "Upcoming Chadhava — Authentic Temple Offerings in Your Name",
    description:
      "Book chadhava at India's sacred temples. Offered in your name & gotra with live video and prasad delivery.",
    type: "website",
    url: "https://vedicvaibhav.com/chadhava",
  },
  alternates: { canonical: "https://vedicvaibhav.com/chadhava" },
};

export default function Page() {
  return <ChadhavaList3 />;
}
