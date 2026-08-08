import "server-only";

import { asc, desc, eq, isNull } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import {
  learnResources,
  type LearnResourceKind,
  type LearnVideoCategory,
} from "@/lib/db/schema";
import { lookupYouTubeChannel } from "@/lib/youtube/channel";
import { lookupYouTubeVideo } from "@/lib/youtube/video";

export type LearnResourceListItem = {
  id: string;
  kind: LearnResourceKind;
  category: LearnVideoCategory | null;
  title: string;
  url: string;
  description: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  createdAt: Date;
};

const listColumns = {
  id: learnResources.id,
  kind: learnResources.kind,
  category: learnResources.category,
  title: learnResources.title,
  url: learnResources.url,
  description: learnResources.description,
  thumbnailUrl: learnResources.thumbnailUrl,
  sortOrder: learnResources.sortOrder,
  createdAt: learnResources.createdAt,
};

export async function listLearnResources(): Promise<LearnResourceListItem[]> {
  const db = requireDb();

  return db
    .select(listColumns)
    .from(learnResources)
    .orderBy(asc(learnResources.sortOrder), desc(learnResources.createdAt));
}

/**
 * Fills missing photos from YouTube Data API.
 * Safe to call on page load — only hits the API for rows without a thumbnail.
 */
export async function backfillLearnThumbnails(): Promise<number> {
  const db = requireDb();
  const missing = await db
    .select({
      id: learnResources.id,
      kind: learnResources.kind,
      url: learnResources.url,
    })
    .from(learnResources)
    .where(isNull(learnResources.thumbnailUrl))
    .limit(20);

  let updated = 0;

  for (const row of missing) {
    try {
      const info =
        row.kind === "video"
          ? await lookupYouTubeVideo(row.url)
          : await lookupYouTubeChannel(row.url);
      if (!info.thumbnailUrl) continue;

      await db
        .update(learnResources)
        .set({
          thumbnailUrl: info.thumbnailUrl,
          updatedAt: new Date(),
        })
        .where(eq(learnResources.id, row.id));
      updated += 1;
    } catch (error) {
      console.error("Failed to backfill learn thumbnail", row.id, error);
    }
  }

  return updated;
}
