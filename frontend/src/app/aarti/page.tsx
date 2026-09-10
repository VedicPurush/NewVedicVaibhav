import type { Metadata } from "next";
import Aarti from "@/components/pages/explore/Aarti";

export const metadata: Metadata = {
  title: "Aarti Lyrics & Video — Online Aarti Sangrah | Vedic Vaibhav",
  description:
    "Read and listen to aarti lyrics in Hindi and English. Ganesh Aarti, Hanuman Aarti, Durga Aarti, Shiv Aarti and 50+ aartis with audio. Free aarti sangrah online.",
  alternates: { canonical: "https://vedicvaibhav.com/aarti" },
};

export default function Page() {
  return <Aarti />;
}
