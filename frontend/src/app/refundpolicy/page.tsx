import type { Metadata } from "next";
import RefundPolicy from "@/components/pages/legal/RefundPolicy";

export const metadata: Metadata = {
  title: "Return & Refund Policy | Vedic Vaibhav",
};

export default function Page() {
  return <RefundPolicy />;
}
