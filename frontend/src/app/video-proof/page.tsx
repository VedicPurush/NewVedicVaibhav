import type { Metadata } from "next";
import VideosSection from "@/components/pages/video-proof/vidoessection";

export const metadata: Metadata = {
  title: "Live Seva Video Proof — Real Chadhava & Puja Campaigns | Vedic Vaibhav",
  description:
    "Watch real video proof of every chadhava, puja, and prasad campaign performed by Vedic Vaibhav at sacred temples across India. 100% authentic, live seva in your name.",
  alternates: { canonical: "https://vedicvaibhav.com/video-proof" },
};

export default function Page() {
  return <VideosSection />;
}
