import type { Metadata } from "next";
import GauSeva from "@/components/pages/services/gau-seva";

export const metadata: Metadata = {
  title: "Gau Seva Online — Sponsor Cow Care at Gaushala | Vedic Vaibhav",
  description:
    "Sponsor Gau Seva (cow care) online through Vedic Vaibhav. Your donation feeds and cares for cows at a registered gaushala. Receive photo & video proof. Daily, monthly & yearly seva packages.",
  alternates: { canonical: "https://vedicvaibhav.com/services/gau-seva" },
};

export default function Page() {
  return <GauSeva />;
}
