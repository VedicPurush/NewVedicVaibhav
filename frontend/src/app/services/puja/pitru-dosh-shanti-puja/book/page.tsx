import { Suspense } from "react";
import EnterPujaDetailsPage from "@/components/pages/services/puja/pitru-puja/EnterPujaDetailsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EnterPujaDetailsPage />
    </Suspense>
  );
}
