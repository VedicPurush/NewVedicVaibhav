import type { Metadata } from "next";
import EcomCancelPolicy from "@/components/pages/legal/EcomCancelpolicy";

export const metadata: Metadata = {
  title: "Cancellation Policy | Vedic Vaibhav",
};

export default function Page() {
  return <EcomCancelPolicy />;
}
