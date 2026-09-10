import { Suspense } from "react";
import ChoosePackage from "@/components/pages/services/puja/Individual_puja/Choose_package";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ChoosePackage />
    </Suspense>
  );
}
