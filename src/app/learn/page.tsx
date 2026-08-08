import { auth } from "@/lib/auth";
import { LearnResourceForm } from "@/components/learn/learn-resource-form";
import { LearnResourceList } from "@/components/learn/learn-resource-list";
import { PageHeader } from "@/components/layout/page-header";
import {
  backfillLearnThumbnails,
  listLearnResources,
} from "@/lib/queries/learn";
import {
  LEARN_VIDEO_CATEGORIES,
  LEARN_VIDEO_CATEGORY_LABELS,
  type LearnVideoCategoryInput,
} from "@/lib/validation/schemas";

export const metadata = {
  title: "Learn Tennis",
  description: "YouTube channels and coaching videos to level up your game.",
};

export default async function LearnPage() {
  const session = await auth();
  // Pull channel/video thumbnails for any entries saved without a photo yet.
  await backfillLearnThumbnails();
  const resources = await listLearnResources();
  const isAdmin = session?.user?.role === "admin";

  const channels = resources.filter((item) => item.kind === "channel");
  const videos = resources.filter((item) => item.kind === "video");

  const videosByCategory = LEARN_VIDEO_CATEGORIES.map((category) => ({
    category,
    label: LEARN_VIDEO_CATEGORY_LABELS[category],
    items: videos.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="px-4 py-4 md:px-0 md:py-8">
      <PageHeader
        title="Learn Tennis"
        subtitle="Curated YouTube channels and stroke videos for technique, tactics, and match play."
      />

      {isAdmin && (
        <section className="mx-auto mb-10 max-w-2xl rounded-2xl border border-court/20 bg-court/5 p-5 md:p-6">
          <h2 className="font-display text-lg font-bold">Add to Learn</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Paste a YouTube channel or video URL. Videos need a category like
            serve or forehand. Only admins can post.
          </p>
          <LearnResourceForm />
        </section>
      )}

      <section className="mb-12">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-bold md:text-2xl">
            Channels
          </h2>
          <p className="text-sm text-muted">
            {channels.length} {channels.length === 1 ? "channel" : "channels"}
          </p>
        </div>
        <LearnResourceList
          items={channels}
          isAdmin={!!isAdmin}
          emptyTitle="No channels yet"
          emptyDescription={
            isAdmin
              ? "Add a YouTube channel above to get started."
              : "Check back soon — coaching channels are on the way."
          }
        />
      </section>

      <section className="space-y-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-bold md:text-2xl">
            Videos by stroke
          </h2>
          <p className="text-sm text-muted">
            {videos.length} {videos.length === 1 ? "video" : "videos"}
          </p>
        </div>

        {videosByCategory.length === 0 ? (
          <LearnResourceList
            items={[]}
            isAdmin={!!isAdmin}
            emptyTitle="No videos yet"
            emptyDescription={
              isAdmin
                ? "Add a video and pick a category like Serve or Forehand."
                : "Stroke videos will show up here by category."
            }
          />
        ) : (
          videosByCategory.map((group) => (
            <div key={group.category}>
              <h3 className="font-display mb-3 text-lg font-semibold md:text-xl">
                {group.label}
              </h3>
              <LearnResourceList
                items={group.items}
                isAdmin={!!isAdmin}
                badgeLabel={(item) =>
                  item.category
                    ? LEARN_VIDEO_CATEGORY_LABELS[
                        item.category as LearnVideoCategoryInput
                      ]
                    : "Video"
                }
              />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
