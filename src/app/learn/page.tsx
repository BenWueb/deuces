import { auth } from "@/lib/auth";
import { LearnResourceForm } from "@/components/learn/learn-resource-form";
import { LearnResourceList } from "@/components/learn/learn-resource-list";
import { PageHeader } from "@/components/layout/page-header";
import {
  backfillLearnThumbnails,
  listLearnResources,
} from "@/lib/queries/learn";

export const metadata = {
  title: "Learn Tennis",
  description: "YouTube channels and coaching links to level up your game.",
};

export default async function LearnPage() {
  const session = await auth();
  // Pull channel banners/avatars for any entries saved without a photo yet.
  await backfillLearnThumbnails();
  const resources = await listLearnResources();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="px-4 py-4 md:px-0 md:py-8">
      <PageHeader
        title="Learn Tennis"
        subtitle="Curated YouTube channels for technique, tactics, and match play."
      />

      {isAdmin && (
        <section className="mx-auto mb-10 max-w-2xl rounded-2xl border border-court/20 bg-court/5 p-5 md:p-6">
          <h2 className="font-display text-lg font-bold">Add a channel</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Paste a YouTube channel URL — name and description are pulled in
            automatically. Only admins can post.
          </p>
          <LearnResourceForm />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-bold md:text-2xl">
            Channels
          </h2>
          <p className="text-sm text-muted">
            {resources.length} {resources.length === 1 ? "link" : "links"}
          </p>
        </div>
        <LearnResourceList items={resources} isAdmin={!!isAdmin} />
      </section>
    </div>
  );
}
