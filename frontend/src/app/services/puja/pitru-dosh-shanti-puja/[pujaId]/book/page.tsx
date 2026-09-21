import { Suspense } from "react";
import EnterPujaDetailsPage from "@/components/pages/services/puja/pitru-puja/EnterPujaDetailsPage";

export default async function Page({ params }: { params: Promise<{ pujaId: string }> }) {
  const { pujaId } = await params;

  return (
    <Suspense fallback={null}>
      <EnterPujaDetailsPage pujaId={pujaId} />
    </Suspense>
  );
}
