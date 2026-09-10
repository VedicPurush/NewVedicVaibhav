import type { Metadata } from "next";
import VedicGyan from "@/components/widgets/home/VedicGyan";

export const metadata: Metadata = {
  title: "Vedic Pathshala | Vedic Vaibhav",
};

export default function Page() {
  return <VedicGyan />;
}
