import type { Metadata } from "next";
import PrivacyPolicy from "@/components/pages/legal/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy | Vedic Vaibhav",
};

export default function Page() {
  return <PrivacyPolicy />;
}
