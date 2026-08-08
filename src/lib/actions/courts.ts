"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isCourtComplete } from "@/lib/court-completeness";
import { requireDb } from "@/lib/db";
import { courts, courtPhotos, comments } from "@/lib/db/schema";
import { persistPlacePhoto } from "@/lib/import/places";
import type { ImportCandidate } from "@/lib/import/types";
import {
  canDeleteComment,
  canEditCourt,
  getCurrentUser,
  isAdmin,
} from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import {
  idSchema,
  latitudeSchema,
  longitudeSchema,
  SURFACES,
  toValidationFailure,
  type ActionResult,
  type ContributeCourtInfoInput,
} from "@/lib/validation/schemas";
import {
  addCommentSchema,
  contributeCourtInfoServerSchema,
  createCourtSchema,
  rateCourtSchema,
  updateCourtSchema,
  type CreateCourtInput,
  type UpdateCourtInput,
} from "@/lib/validation/server";

const importCandidateSchema = z.object({
  sourceId: z.string().min(3).max(200),
  sourceUrl: z.string().url().max(500),
  name: z.string().trim().min(2).max(120),
  lat: latitudeSchema,
  lng: longitudeSchema,
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100).nullable(),
  country: z.string().trim().min(2).max(100),
  surface: z.enum(SURFACES).nullable(),
  courtCount: z.number().int().min(1).max(50).nullable(),
  hasLights: z.boolean().nullable(),
  isIndoor: z.boolean().nullable(),
  isFree: z.boolean().nullable(),
  feeNotes: z.string().trim().max(500).nullable(),
  hasHittingWall: z.boolean().nullable(),
  hasRestrooms: z.boolean().nullable(),
  photoUrl: z.string().max(2000).nullable(),
  photoName: z.string().max(500).nullable().optional(),
});

// Drizzle's geometry column serialises to `point(x y)`, which Postgres stores
// with SRID 0 and PostGIS then refuses to compare against our 4326 queries.
function locationValue(lng: number, lat: number) {
  return sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
}

export async function createCourt(
  input: CreateCourtInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to add a court." };
  }

  const parsed = createCourtSchema.safeParse(input);
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  const data = parsed.data;
  const db = requireDb();

  let slug = slugify(data.name);
  const existing = await db
    .select({ slug: courts.slug })
    .from(courts)
    .where(eq(courts.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const [court] = await db
    .insert(courts)
    .values({
      slug,
      name: data.name,
      description: data.description,
      address: data.address,
      city: data.city,
      region: data.region,
      country: data.country,
      location: locationValue(data.lng, data.lat),
      surface: data.surface,
      courtCount: data.courtCount,
      hasLights: data.hasLights,
      isIndoor: data.isIndoor,
      isFree: data.isFree,
      feeNotes: data.feeNotes,
      hasHittingWall: data.hasHittingWall,
      hasRestrooms: data.hasRestrooms,
      importStatus: "complete",
      source: "manual",
      createdBy: session.user.id,
    })
    .returning({ id: courts.id, slug: courts.slug });

  if (data.photoUrls.length > 0) {
    await db.insert(courtPhotos).values(
      data.photoUrls.map((url, index) => ({
        courtId: court.id,
        url,
        sortOrder: index,
        uploadedBy: session.user.id,
      })),
    );
  }

  revalidatePath("/");
  revalidatePath("/map");
  redirect(`/courts/${court.slug}`);
}

export async function updateCourt(
  courtId: string,
  input: UpdateCourtInput,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to edit a court." };
  }

  const parsedId = idSchema.safeParse(courtId);
  if (!parsedId.success) {
    return { error: "Court not found." };
  }

  if (!(await canEditCourt(parsedId.data, user))) {
    return { error: "You do not have permission to edit this court." };
  }

  const parsed = updateCourtSchema.safeParse(input);
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  const data = parsed.data;
  const db = requireDb();

  const complete = isCourtComplete({
    description: data.description,
    surface: data.surface,
    courtCount: data.courtCount,
    hasLights: data.hasLights,
    isIndoor: data.isIndoor,
    isFree: data.isFree,
    hasHittingWall: data.hasHittingWall,
    hasRestrooms: data.hasRestrooms,
    photoCount: data.photoUrls.length,
  });

  // The slug is intentionally left alone so existing links keep working.
  const [court] = await db
    .update(courts)
    .set({
      name: data.name,
      description: data.description ?? null,
      address: data.address,
      city: data.city,
      region: data.region ?? null,
      country: data.country,
      location: locationValue(data.lng, data.lat),
      surface: data.surface,
      courtCount: data.courtCount,
      hasLights: data.hasLights,
      isIndoor: data.isIndoor,
      isFree: data.isFree,
      feeNotes: data.feeNotes ?? null,
      hasHittingWall: data.hasHittingWall,
      hasRestrooms: data.hasRestrooms,
      ...(complete ? { importStatus: "complete" as const } : {}),
      updatedAt: new Date(),
    })
    .where(eq(courts.id, parsedId.data))
    .returning({ slug: courts.slug });

  if (!court) {
    return { error: "Court not found." };
  }

  await db.delete(courtPhotos).where(eq(courtPhotos.courtId, parsedId.data));
  if (data.photoUrls.length > 0) {
    await db.insert(courtPhotos).values(
      data.photoUrls.map((url, index) => ({
        courtId: parsedId.data,
        url,
        sortOrder: index,
        uploadedBy: user.id,
      })),
    );
  }

  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath(`/courts/${court.slug}`);
  redirect(`/courts/${court.slug}`);
}

/**
 * Lets any signed-in user fill fields that are still unknown.
 * Never changes name, address, location, description, or photos.
 */
export async function contributeCourtInfo(
  courtId: string,
  input: ContributeCourtInfoInput,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to add court info." };
  }

  const parsedId = idSchema.safeParse(courtId);
  if (!parsedId.success) {
    return { error: "Court not found." };
  }

  const parsed = contributeCourtInfoServerSchema.safeParse(input);
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  const db = requireDb();
  const [existing] = await db
    .select({
      id: courts.id,
      slug: courts.slug,
      description: courts.description,
      surface: courts.surface,
      courtCount: courts.courtCount,
      hasLights: courts.hasLights,
      isIndoor: courts.isIndoor,
      isFree: courts.isFree,
      feeNotes: courts.feeNotes,
      hasHittingWall: courts.hasHittingWall,
      hasRestrooms: courts.hasRestrooms,
      importStatus: courts.importStatus,
    })
    .from(courts)
    .where(eq(courts.id, parsedId.data))
    .limit(1);

  if (!existing) {
    return { error: "Court not found." };
  }

  const data = parsed.data;
  const patch: {
    surface?: (typeof SURFACES)[number];
    courtCount?: number;
    hasLights?: boolean;
    isIndoor?: boolean;
    isFree?: boolean;
    feeNotes?: string | null;
    hasHittingWall?: boolean;
    hasRestrooms?: boolean;
    importStatus?: "complete";
    updatedAt: Date;
  } = { updatedAt: new Date() };

  let applied = 0;

  if (data.surface !== undefined && existing.surface == null) {
    patch.surface = data.surface;
    applied += 1;
  }
  if (data.courtCount !== undefined && existing.courtCount == null) {
    patch.courtCount = data.courtCount;
    applied += 1;
  }
  if (data.hasLights !== undefined && existing.hasLights == null) {
    patch.hasLights = data.hasLights;
    applied += 1;
  }
  if (data.isIndoor !== undefined && existing.isIndoor == null) {
    patch.isIndoor = data.isIndoor;
    applied += 1;
  }
  if (data.isFree !== undefined && existing.isFree == null) {
    patch.isFree = data.isFree;
    applied += 1;
    if (data.isFree === false && data.feeNotes?.trim()) {
      patch.feeNotes = data.feeNotes.trim();
    }
  }
  if (data.hasHittingWall !== undefined && existing.hasHittingWall == null) {
    patch.hasHittingWall = data.hasHittingWall;
    applied += 1;
  }
  if (data.hasRestrooms !== undefined && existing.hasRestrooms == null) {
    patch.hasRestrooms = data.hasRestrooms;
    applied += 1;
  }

  if (applied === 0) {
    return {
      error:
        "Those details are already filled in, or nothing new was provided.",
    };
  }

  const [photoCountRow] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(courtPhotos)
    .where(eq(courtPhotos.courtId, parsedId.data));

  const next = {
    description: existing.description,
    surface: patch.surface ?? existing.surface,
    courtCount: patch.courtCount ?? existing.courtCount,
    hasLights: patch.hasLights ?? existing.hasLights,
    isIndoor: patch.isIndoor ?? existing.isIndoor,
    isFree: patch.isFree ?? existing.isFree,
    hasHittingWall: patch.hasHittingWall ?? existing.hasHittingWall,
    hasRestrooms: patch.hasRestrooms ?? existing.hasRestrooms,
    photoCount: photoCountRow?.count ?? 0,
  };

  if (isCourtComplete(next)) {
    patch.importStatus = "complete";
  }

  await db.update(courts).set(patch).where(eq(courts.id, parsedId.data));

  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath(`/courts/${existing.slug}`);
  return { success: true };
}

export type BulkImportResult =
  | {
      success: true;
      imported: number;
      skipped: number;
      failed: number;
      importedIds: string[];
    }
  | { error: string; fieldErrors?: Record<string, string> };

async function insertImportedCourt(
  data: z.infer<typeof importCandidateSchema>,
  userId: string,
): Promise<"imported" | "skipped"> {
  const db = requireDb();

  const [existing] = await db
    .select({ slug: courts.slug })
    .from(courts)
    .where(eq(courts.sourceId, data.sourceId))
    .limit(1);

  if (existing) {
    return "skipped";
  }

  let slug = slugify(data.name);
  const slugTaken = await db
    .select({ slug: courts.slug })
    .from(courts)
    .where(eq(courts.slug, slug))
    .limit(1);

  if (slugTaken.length > 0) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const [court] = await db
    .insert(courts)
    .values({
      slug,
      name: data.name,
      description: null,
      address: data.address,
      city: data.city,
      region: data.region,
      country: data.country,
      location: locationValue(data.lng, data.lat),
      surface: data.surface,
      courtCount: data.courtCount,
      hasLights: data.hasLights,
      isIndoor: data.isIndoor,
      isFree: data.isFree,
      feeNotes: data.feeNotes,
      hasHittingWall: data.hasHittingWall,
      hasRestrooms: data.hasRestrooms,
      importStatus: "draft",
      source: "google",
      sourceId: data.sourceId,
      sourceUrl: data.sourceUrl,
      createdBy: userId,
    })
    .returning({ id: courts.id, slug: courts.slug });

  const photoRef = data.photoName || data.photoUrl;
  if (photoRef) {
    try {
      const url = await persistPlacePhoto(photoRef, userId);
      await db.insert(courtPhotos).values({
        courtId: court.id,
        url,
        sortOrder: 0,
        uploadedBy: userId,
      });
    } catch (error) {
      console.error("Failed to persist place photo", error);
    }
  }

  return "imported";
}

export async function importCourtsFromPlaces(
  candidates: ImportCandidate[],
): Promise<BulkImportResult> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return { error: "Only admins can import courts from Google Maps." };
  }

  if (!process.env.GOOGLE_MAPS_API_KEY?.trim()) {
    return {
      error:
        "GOOGLE_MAPS_API_KEY is not configured. Add it to .env.local to import courts.",
    };
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { error: "Select at least one court to import." };
  }

  if (candidates.length > 50) {
    return { error: "You can import at most 50 courts at a time." };
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const importedIds: string[] = [];

  for (const candidate of candidates) {
    const parsed = importCandidateSchema.safeParse(candidate);
    if (!parsed.success) {
      failed += 1;
      continue;
    }

    try {
      const result = await insertImportedCourt(parsed.data, user.id);
      if (result === "imported") {
        imported += 1;
        importedIds.push(parsed.data.sourceId);
      } else {
        skipped += 1;
      }
    } catch (error) {
      console.error("Failed to import court", parsed.data.sourceId, error);
      failed += 1;
    }
  }

  if (imported > 0) {
    revalidatePath("/");
    revalidatePath("/map");
    revalidatePath("/courts/import");
  }

  if (imported === 0 && skipped === 0 && failed > 0) {
    return { error: "Could not import the selected courts. Try again." };
  }

  return { success: true, imported, skipped, failed, importedIds };
}

export async function deleteCourt(courtId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to delete a court." };
  }

  const parsedId = idSchema.safeParse(courtId);
  if (!parsedId.success) {
    return { error: "Court not found." };
  }

  if (!(await canEditCourt(parsedId.data, user))) {
    return { error: "You do not have permission to delete this court." };
  }

  const db = requireDb();

  // Photos, ratings and comments are removed by the cascading foreign keys.
  const [deleted] = await db
    .delete(courts)
    .where(eq(courts.id, parsedId.data))
    .returning({ slug: courts.slug });

  if (!deleted) {
    return { error: "Court not found." };
  }

  revalidatePath("/");
  revalidatePath("/map");
  redirect("/");
}

export async function deleteComment(
  commentId: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to delete a comment." };
  }

  const parsedId = idSchema.safeParse(commentId);
  if (!parsedId.success) {
    return { error: "Comment not found." };
  }

  if (!(await canDeleteComment(parsedId.data, user))) {
    return { error: "You do not have permission to delete this comment." };
  }

  const db = requireDb();

  const [deleted] = await db
    .delete(comments)
    .where(eq(comments.id, parsedId.data))
    .returning({ courtId: comments.courtId });

  if (!deleted) {
    return { error: "Comment not found." };
  }

  const [court] = await db
    .select({ slug: courts.slug })
    .from(courts)
    .where(eq(courts.id, deleted.courtId))
    .limit(1);

  if (court) {
    revalidatePath(`/courts/${court.slug}`);
  }

  return { success: true };
}

export async function rateCourt(
  courtId: string,
  stars: number,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to rate a court." };
  }

  const parsed = rateCourtSchema.safeParse({ courtId, stars });
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  const { courtId: id, stars: rating } = parsed.data;
  const db = requireDb();

  await db.execute(sql`
    INSERT INTO ratings (court_id, user_id, stars)
    VALUES (${id}, ${session.user.id}, ${rating})
    ON CONFLICT (court_id, user_id)
    DO UPDATE SET stars = ${rating}, updated_at = now()
  `);

  await db.execute(sql`
    UPDATE courts SET
      rating_avg = (SELECT COALESCE(AVG(stars), 0) FROM ratings WHERE court_id = ${id}),
      rating_count = (SELECT COUNT(*) FROM ratings WHERE court_id = ${id}),
      updated_at = now()
    WHERE id = ${id}
  `);

  revalidatePath("/");
  return { success: true };
}

export async function addComment(
  courtId: string,
  body: string,
  parentId?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to comment." };
  }

  const parsed = addCommentSchema.safeParse({ courtId, body, parentId });
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  const comment = parsed.data;
  const db = requireDb();

  await db.insert(comments).values({
    courtId: comment.courtId,
    userId: session.user.id,
    body: comment.body,
    parentId: comment.parentId ?? null,
  });

  const [court] = await db
    .select({ slug: courts.slug })
    .from(courts)
    .where(eq(courts.id, comment.courtId))
    .limit(1);

  if (court) {
    revalidatePath(`/courts/${court.slug}`);
  }

  return { success: true };
}
