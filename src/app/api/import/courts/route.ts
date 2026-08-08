import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { courts } from "@/lib/db/schema";
import {
  findCourtsNearby,
  searchCourtsByQuery,
  type ImportCandidate,
} from "@/lib/import/places";
import { getCurrentUser, isAdmin } from "@/lib/permissions";
import {
  addressQuerySchema,
  latitudeSchema,
  longitudeSchema,
  toValidationFailure,
} from "@/lib/validation/schemas";
import { z } from "zod";

async function markAlreadyImported(
  candidates: ImportCandidate[],
): Promise<ImportCandidate[]> {
  if (candidates.length === 0) return candidates;

  const db = requireDb();
  const sourceIds = candidates.map((c) => c.sourceId);
  const existing = await db
    .select({ sourceId: courts.sourceId })
    .from(courts)
    .where(inArray(courts.sourceId, sourceIds));

  const imported = new Set(
    existing.map((row) => row.sourceId).filter((id): id is string => !!id),
  );

  return candidates.map((c) => ({
    ...c,
    alreadyImported: imported.has(c.sourceId),
  }));
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_MAPS_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_MAPS_API_KEY is not configured. Add it to .env.local to import courts from Google Places.",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius");

  try {
    let candidates: ImportCandidate[] = [];

    if (q) {
      const parsed = addressQuerySchema.safeParse(q);
      if (!parsed.success) {
        return NextResponse.json(toValidationFailure(parsed.error), {
          status: 400,
        });
      }
      candidates = await searchCourtsByQuery(parsed.data);
    } else if (lat !== null || lng !== null) {
      const parsed = z
        .object({
          lat: z.coerce.number().pipe(latitudeSchema),
          lng: z.coerce.number().pipe(longitudeSchema),
          radius: z.coerce
            .number()
            .int()
            .min(500)
            .max(50000)
            .default(32187),
        })
        .safeParse({ lat, lng, radius: radius ?? undefined });

      if (!parsed.success) {
        return NextResponse.json(toValidationFailure(parsed.error), {
          status: 400,
        });
      }

      candidates = await findCourtsNearby(
        parsed.data.lat,
        parsed.data.lng,
        parsed.data.radius,
      );
    } else {
      return NextResponse.json(
        { error: "Provide q or lat/lng to find courts." },
        { status: 400 },
      );
    }

    const withFlags = await markAlreadyImported(candidates);
    return NextResponse.json(
      { courts: withFlags },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/import/courts failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not search Google Places right now.";
    const status = message.includes("GOOGLE_MAPS_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
