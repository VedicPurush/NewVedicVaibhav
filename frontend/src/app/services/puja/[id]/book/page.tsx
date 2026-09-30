import { Suspense } from "react";
import EnterPujaBookingPage from "@/components/pages/services/puja/Individual_puja/EnterPujaBookingPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EnterPujaBookingPage />
    </Suspense>
  );
}
