import type { Metadata } from "next";
import MyVideos from "@/components/pages/my-videos/MyVideos";

export const metadata: Metadata = {
  title: "Watch Your Seva Videos | Vedic Vaibhav",
  description:
    "Enter the mobile number you booked with to watch the videos recorded for you at the temple — every chadhava and puja performed in your name by Vedic Vaibhav.",
  alternates: { canonical: "https://vedicvaibhav.com/my-videos" },
};

export default function Page() {
  return <MyVideos />;
}
