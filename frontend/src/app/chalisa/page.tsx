import type { Metadata } from "next";
import Chalisa from "@/components/pages/explore/Chalisa";

export const metadata: Metadata = {
  title: "Chalisa Lyrics — Hanuman Chalisa, Durga Chalisa & More | Vedic Vaibhav",
  description:
    "Read Hanuman Chalisa, Durga Chalisa, Ganesh Chalisa, Shiv Chalisa and more in Hindi and English. Free chalisa lyrics online with meaning and audio.",
  alternates: { canonical: "https://vedicvaibhav.com/chalisa" },
};

export default function Page() {
  return <Chalisa />;
}
