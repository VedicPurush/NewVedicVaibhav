import type { Metadata } from "next";
import ContactUs from "@/components/pages/legal/ContactUs";

export const metadata: Metadata = {
  title: "Contact Us — Reach Vedic Vaibhav Support | Vedic Vaibhav",
  description:
    "Contact Vedic Vaibhav for puja booking queries, chadhava tracking, prasad delivery status, or any other support. We respond within 24 hours. WhatsApp and email support available.",
  alternates: { canonical: "https://vedicvaibhav.com/contactus" },
};

export default function Page() {
  return <ContactUs />;
}
