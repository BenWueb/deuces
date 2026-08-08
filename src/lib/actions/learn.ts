"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { learnResources } from "@/lib/db/schema";
import { getCurrentUser, isAdmin } from "@/lib/permissions";
import { lookupYouTubeChannel } from "@/lib/youtube/channel";
import { lookupYouTubeVideo } from "@/lib/youtube/video";
import {
  idSchema,
  youtubeUrlSchema,
  toValidationFailure,
  type ActionResult,
} from "@/lib/validation/schemas";
import {
  learnResourceSchema,
  type LearnResourceServerInput,
} from "@/lib/validation/server";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return {
      ok: false as const,
      error: "Only admins can manage Learn Tennis links.",
    };
  }
  return { ok: true as const, user };
}

export async function lookupYouTubeChannelAction(url: string): Promise<
  | { success: true; title: string; description: string; url: string }
  | { error: string }
> {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return { error: admin.error };
  }

  const parsed = youtubeUrlSchema.safeParse(url);
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  try {
    const channel = await lookupYouTubeChannel(parsed.data);
    return {
      success: true,
      title: channel.title,
      description: channel.description,
      url: channel.url,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not look up that YouTube channel.",
    };
  }
}

export async function lookupYouTubeVideoAction(url: string): Promise<
  | { success: true; title: string; description: string; url: string }
  | { error: string }
> {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return { error: admin.error };
  }

  const parsed = youtubeUrlSchema.safeParse(url);
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  try {
    const video = await lookupYouTubeVideo(parsed.data);
    return {
      success: true,
      title: video.title,
      description: video.description,
      url: video.url,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not look up that YouTube video.",
    };
  }
}

async function resolveYouTubeFields(input: LearnResourceServerInput) {
  let payload = input;
  let thumbnailUrl: string | null = null;

  if (!input.url?.trim()) {
    return { payload, thumbnailUrl };
  }

  try {
    if (input.kind === "video") {
      const video = await lookupYouTubeVideo(input.url);
      thumbnailUrl = video.thumbnailUrl;
      payload = {
        ...input,
        title: input.title?.trim() || video.title,
        url: video.url || input.url,
        description:
          input.description?.trim() || video.description || undefined,
        category: input.category ?? null,
      };
    } else {
      const channel = await lookupYouTubeChannel(input.url);
      thumbnailUrl = channel.thumbnailUrl;
      payload = {
        ...input,
        title: input.title?.trim() || channel.title,
        url: channel.url || input.url,
        description:
          input.description?.trim() || channel.description || undefined,
        category: null,
      };
    }
  } catch (error) {
    console.error("YouTube lookup failed", error);
  }

  return { payload, thumbnailUrl };
}

export async function createLearnResource(
  input: LearnResourceServerInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return { error: admin.error };
  }

  const { payload, thumbnailUrl } = await resolveYouTubeFields(input);
  const parsed = learnResourceSchema.safeParse(payload);
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  const db = requireDb();
  const [row] = await db
    .select({ maxOrder: max(learnResources.sortOrder) })
    .from(learnResources)
    .where(eq(learnResources.kind, parsed.data.kind));
  const nextOrder = (row?.maxOrder ?? -1) + 1;

  await db.insert(learnResources).values({
    kind: parsed.data.kind,
    category:
      parsed.data.kind === "video" ? (parsed.data.category ?? null) : null,
    title: parsed.data.title,
    url: parsed.data.url,
    description: parsed.data.description?.trim() || null,
    thumbnailUrl,
    sortOrder: nextOrder,
    createdBy: admin.user.id,
  });

  revalidatePath("/learn");
  return { success: true };
}

export async function updateLearnResource(
  id: string,
  input: LearnResourceServerInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return { error: admin.error };
  }

  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) {
    return toValidationFailure(idParsed.error);
  }

  const { payload, thumbnailUrl } = await resolveYouTubeFields(input);
  const parsed = learnResourceSchema.safeParse(payload);
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  const db = requireDb();
  const [updated] = await db
    .update(learnResources)
    .set({
      kind: parsed.data.kind,
      category:
        parsed.data.kind === "video" ? (parsed.data.category ?? null) : null,
      title: parsed.data.title,
      url: parsed.data.url,
      description: parsed.data.description?.trim() || null,
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(learnResources.id, idParsed.data))
    .returning({ id: learnResources.id });

  if (!updated) {
    return { error: "Link not found." };
  }

  revalidatePath("/learn");
  return { success: true };
}

export async function deleteLearnResource(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return { error: admin.error };
  }

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  const db = requireDb();
  const [deleted] = await db
    .delete(learnResources)
    .where(eq(learnResources.id, parsed.data))
    .returning({ id: learnResources.id });

  if (!deleted) {
    return { error: "Link not found." };
  }

  revalidatePath("/learn");
  return { success: true };
}

export async function moveLearnResource(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return { error: admin.error };
  }

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  const db = requireDb();
  const [currentRow] = await db
    .select({
      id: learnResources.id,
      kind: learnResources.kind,
      category: learnResources.category,
      sortOrder: learnResources.sortOrder,
    })
    .from(learnResources)
    .where(eq(learnResources.id, parsed.data))
    .limit(1);

  if (!currentRow) {
    return { error: "Link not found." };
  }

  // Reorder within the same kind (and category for videos).
  const siblings = await db
    .select({
      id: learnResources.id,
      sortOrder: learnResources.sortOrder,
    })
    .from(learnResources)
    .where(
      currentRow.kind === "video"
        ? and(
            eq(learnResources.kind, "video"),
            currentRow.category
              ? eq(learnResources.category, currentRow.category)
              : isNull(learnResources.category),
          )
        : eq(learnResources.kind, "channel"),
    )
    .orderBy(asc(learnResources.sortOrder));

  const index = siblings.findIndex((item) => item.id === parsed.data);
  if (index < 0) {
    return { error: "Link not found." };
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) {
    return { success: true };
  }

  const current = siblings[index]!;
  const other = siblings[swapIndex]!;

  await db
    .update(learnResources)
    .set({ sortOrder: other.sortOrder, updatedAt: new Date() })
    .where(eq(learnResources.id, current.id));
  await db
    .update(learnResources)
    .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
    .where(eq(learnResources.id, other.id));

  revalidatePath("/learn");
  return { success: true };
}
