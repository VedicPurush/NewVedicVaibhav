import type { Metadata } from "next";
import TwelveJyotirling from "@/components/pages/services/twelve-jyotirling";

export const metadata: Metadata = {
  title: "12 Jyotirlinga Subscription — Monthly Abhishek & Pooja at All 12 Jyotirlingas | Vedic Vaibhav",
  description:
    "Subscribe to monthly pooja and Abhishek at all 12 Jyotirlingas — Somnath, Kashi Vishwanath, Kedarnath, Rameshwaram and more. Receive live puja video every month in your name & gotra. Starting ₹399/month.",
  keywords:
    "12 jyotirlinga subscription, online jyotirlinga pooja, Somnath abhishek, Kashi Vishwanath pooja booking, Kedarnath online darshan, monthly jyotirlinga seva",
  openGraph: {
    title: "12 Jyotirlinga Monthly Subscription — Authentic Pooja at All 12 Sacred Shiva Temples",
    description:
      "Get monthly pooja performed at all 12 Jyotirlingas. Live puja video delivered to you. Book your subscription starting ₹399/month on Vedic Vaibhav.",
    type: "website",
    url: "https://vedicvaibhav.com/services/12-jyotirlinga",
  },
  alternates: { canonical: "https://vedicvaibhav.com/services/12-jyotirlinga" },
};

export default function Page() {
  return <TwelveJyotirling />;
}
