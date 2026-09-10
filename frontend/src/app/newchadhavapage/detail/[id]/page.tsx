import { redirect } from "next/navigation";
import NewChadhavaDetailPage from "@/components/pages/services/chadhava/NewChadhavaDetailPage";
import { extractIdFromSlug } from "@/lib/slug";

// Old SPA logic (RedirectNewChadhavaDetail): this one chadhava id is served by the
// modified detail page at /chadhava/detail/:id; every other id keeps the legacy page.
//
// `id` here is really a "name-id" slug (see lib/slug.ts) — extract the real
// Mongo id to compare against the hardcoded target, but forward the ORIGINAL
// param on redirect so the name stays in the URL rather than collapsing back
// to a bare id.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (extractIdFromSlug(id) === "69b8f83af1b6b394676700e0") {
    redirect(`/chadhava/detail/${id}`);
  }
  return <NewChadhavaDetailPage />;
}
