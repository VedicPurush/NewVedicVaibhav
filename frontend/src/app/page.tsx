import type { Metadata } from "next";
import HomePage from "@/components/pages/home/HomePage";
import { loadHomeData } from "@/lib/server/homeData";

export const metadata: Metadata = {
  title: "Vedic Vaibhav — Online Pooja, Prasad & Spiritual Services from Sacred Temples",
  description:
    "Book authentic online pooja, prasad delivery, and spiritual services from sacred temples across India. Offerings at Vrindavan, Varanasi, Kedarnath & more. Puja performed in your name & gotra.",
  keywords:
    "online pooja booking, prasad delivery India, virtual puja service, Vrindavan prasad, Varanasi pooja, mandir seva online, chadhava booking",
  alternates: { canonical: "https://vedicvaibhav.com/" },
  openGraph: {
    title: "Vedic Vaibhav — Authentic Online Pooja & Prasad from India's Sacred Temples",
    description:
      "India's trusted platform for online pooja, prasad delivery & spiritual services. Temple seva in your name & gotra. Trusted by lakhs of devotees.",
    type: "website",
    url: "https://vedicvaibhav.com/",
  },
};

/**
 * Regenerate the prerendered homepage every 5 minutes.
 *
 * Without this the page would still be built once and then serve whatever the
 * API returned at build time, forever. With it, the listings below are fetched
 * on the server at most once per window and reused for every visitor in it —
 * so server-side fetching costs nothing per request.
 */
export const revalidate = 300;

export default async function Page() {
  const initialData = await loadHomeData();
  return <HomePage initialData={initialData} />;
}
