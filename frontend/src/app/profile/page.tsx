import { Suspense } from "react";
import type { Metadata } from "next";
import ProfilePage from "@/components/pages/user/profile/Profile";

export const metadata: Metadata = {
  title: "My Profile | Vedic Vaibhav",
  description:
    "Manage your Vedic Vaibhav account — personal information, puja, chadhava, prasad and seva bookings.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProfilePage />
    </Suspense>
  );
}
