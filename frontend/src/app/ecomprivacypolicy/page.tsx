import type { Metadata } from "next";
import EcomPrivacyPolicy from "@/components/pages/legal/EcomPrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy — Vedic Shop | Vedic Vaibhav",
};

export default function Page() {
  return <EcomPrivacyPolicy />;
}
