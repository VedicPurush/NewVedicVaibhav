import type { Metadata } from "next";
import TermsandCondition from "@/components/pages/legal/TermsandCondition";

export const metadata: Metadata = {
  title: "Terms & Conditions | Vedic Vaibhav",
};

export default function Page() {
  return <TermsandCondition />;
}
