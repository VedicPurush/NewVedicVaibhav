import type { Metadata } from "next";
import VenderTermsPolicy from "@/components/pages/legal/VenderTermsPolicy";

export const metadata: Metadata = {
  title: "Terms of Business for Spiritual Service Providers | Vedic Vaibhav",
};

export default function Page() {
  return <VenderTermsPolicy />;
}
