import type { Metadata } from "next";
import EcomShippingPolicy from "@/components/pages/legal/Ecomshippingpolicy";

export const metadata: Metadata = {
  title: "Shipping Policy | Vedic Vaibhav",
};

export default function Page() {
  return <EcomShippingPolicy />;
}
