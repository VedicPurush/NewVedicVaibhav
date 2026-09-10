import type { Metadata } from "next";
import MandirMain from "@/components/pages/mandir/MandirMain";

export const metadata: Metadata = {
  title: "Sacred Temples — Find Mandirs Across India | Vedic Vaibhav",
  description:
    "Explore India's most sacred mandirs — Banke Bihari, Kedarnath, Vaishno Devi, Badrinath, Kalka Ji and more. Book puja, chadhava & prasad from your favourite temple online.",
  alternates: { canonical: "https://vedicvaibhav.com/mandir" },
};

export default function Page() {
  return <MandirMain />;
}
