import type { Metadata } from "next";
import NewJyotirlingChadhavaPage from "@/components/pages/services/new-jyotirling-chadhava/NewJyotirlingChadhavaPage";

export const metadata: Metadata = {
  title: "Offer Jyotirlinga Chadhava Seva - Online Booking | Vedic Vaibhav",
  description:
    "Choose sacred Jyotirling temples and book holy Chadhava offerings like Bel Patra, Panchamrit, and special Shringar online. Get blessings delivered to your name & gotra.",
  keywords:
    "Jyotirling Chadhava, Online Puja booking, Somnath offering, Kedarnath seva, Mahadev abhishek, gotra sankalp",
};

export default function Page() {
  return <NewJyotirlingChadhavaPage />;
}
