import type { Metadata } from "next";
import DeleteMyAccount from "@/components/pages/home/DeleteMyAccount";

export const metadata: Metadata = {
  title: "Delete My Account | Vedic Vaibhav",
};

export default function Page() {
  return <DeleteMyAccount />;
}
