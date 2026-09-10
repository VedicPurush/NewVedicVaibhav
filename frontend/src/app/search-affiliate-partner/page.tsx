import type { Metadata } from "next";
import SearchBarAffiliatePartner from "@/components/pages/affiliate/SearchBarAffiliatePartner";

export const metadata: Metadata = {
  title: "Search | Vedic Vaibhav",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SearchBarAffiliatePartner />;
}
