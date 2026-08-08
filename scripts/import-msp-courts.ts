/**
 * Bulk-import Google Places tennis courts within 50 miles of Minneapolis / St Paul.
 * Only imports places that have at least one photo.
 *
 * Usage: npx tsx scripts/import-msp-courts.ts
 */
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import { courts, courtPhotos, users } from "../src/lib/db/schema";
import { slugify } from "../src/lib/utils";

config({ path: ".env.local" });
config();

const PLACES_BASE = "https://places.googleapis.com/v1";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.addressComponents",
  "places.location",
  "places.photos",
  "places.googleMapsUri",
  "places.types",
].join(",");

/** Midpoint between Minneapolis and St Paul. */
const ORIGIN = { lat: 44.9631, lng: -93.1777 };
const MAX_MILES = 50;
const MAX_METERS = MAX_MILES * 1609.344;
/** Places Nearby Search hard cap. */
const SEARCH_RADIUS_M = 50000;
const GRID_STEP_MILES = 22;

type PlaceResult = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  addressComponents?: {
    longText?: string;
    shortText?: string;
    types?: string[];
  }[];
  location?: { latitude?: number; longitude?: number };
  photos?: { name?: string }[];
  googleMapsUri?: string;
  types?: string[];
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`${name} is required in .env.local`);
    process.exit(1);
  }
  return value;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

function gridCenters(): { lat: number; lng: number; label: string }[] {
  const latPerMile = 1 / 69.0;
  const lngPerMile = 1 / (Math.cos((ORIGIN.lat * Math.PI) / 180) * 69.172);
  const points: { lat: number; lng: number; label: string }[] = [];

  for (
    let dLatMi = -MAX_MILES;
    dLatMi <= MAX_MILES;
    dLatMi += GRID_STEP_MILES
  ) {
    for (
      let dLngMi = -MAX_MILES;
      dLngMi <= MAX_MILES;
      dLngMi += GRID_STEP_MILES
    ) {
      if (Math.hypot(dLatMi, dLngMi) > MAX_MILES + GRID_STEP_MILES / 2) {
        continue;
      }
      points.push({
        lat: ORIGIN.lat + dLatMi * latPerMile,
        lng: ORIGIN.lng + dLngMi * lngPerMile,
        label: `${dLatMi >= 0 ? "+" : ""}${dLatMi}mi N, ${dLngMi >= 0 ? "+" : ""}${dLngMi}mi E`,
      });
    }
  }

  // Explicit Twin Cities anchors.
  points.unshift(
    { lat: 44.9778, lng: -93.265, label: "Minneapolis" },
    { lat: 44.9537, lng: -93.09, label: "St Paul" },
    { lat: ORIGIN.lat, lng: ORIGIN.lng, label: "MSP midpoint" },
  );

  return points;
}

function component(
  components: PlaceResult["addressComponents"],
  type: string,
  short = false,
): string | null {
  const match = components?.find((c) => c.types?.includes(type));
  if (!match) return null;
  const value = short ? match.shortText : match.longText;
  return value?.trim() || null;
}

function parseAddress(place: PlaceResult) {
  const components = place.addressComponents;
  const streetNumber = component(components, "street_number");
  const route = component(components, "route");
  const street = [streetNumber, route].filter(Boolean).join(" ");
  const city =
    component(components, "locality") ??
    component(components, "postal_town") ??
    component(components, "sublocality") ??
    component(components, "administrative_area_level_2") ??
    "Unknown";
  const region =
    component(components, "administrative_area_level_1", true) ??
    component(components, "administrative_area_level_1");
  const country =
    component(components, "country", true) ??
    component(components, "country") ??
    "US";

  return {
    address:
      street ||
      place.shortFormattedAddress ||
      place.formattedAddress ||
      place.displayName?.text ||
      "Unknown address",
    city,
    region,
    country: country.length === 2 ? country.toUpperCase() : country,
  };
}

async function searchNearby(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<PlaceResult[]> {
  const res = await fetch(`${PLACES_BASE}/places:searchNearby`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: ["tennis_court"],
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: SEARCH_RADIUS_M,
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Nearby search failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { places?: PlaceResult[] };
  return data.places ?? [];
}

async function persistPhoto(
  photoName: string,
  userId: string,
  apiKey: string,
): Promise<string> {
  const params = new URLSearchParams({
    maxHeightPx: "1600",
    maxWidthPx: "1600",
    key: apiKey,
  });
  const res = await fetch(`${PLACES_BASE}/${photoName}/media?${params}`, {
    headers: { "User-Agent": "Deuces/1.0 (tennis court finder)" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Photo download failed (${res.status})`);
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const extensionByType: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  const extension =
    extensionByType[contentType.split(";")[0]?.trim() ?? ""] ?? ".jpg";
  const key = `courts/${userId}/${randomUUID()}${extension}`;
  const bytes = await res.arrayBuffer();

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, bytes, {
      access: "public",
      contentType,
    });
    return blob.url;
  }

  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const destination = path.join(uploadsRoot, key);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(bytes));
  return `/uploads/${key}`;
}

async function main() {
  const apiKey = requireEnv("GOOGLE_MAPS_API_KEY");
  const connectionString = requireEnv("DATABASE_URL");
  const db = drizzle({ client: neon(connectionString) });

  const [admin] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  if (!admin) {
    console.error("No admin user found. Sign in and run: npm run set-admin -- you@email.com");
    process.exit(1);
  }

  console.log(`Importing as admin ${admin.email ?? admin.id}`);
  console.log(
    `Searching tennis courts within ${MAX_MILES} miles of MSP (${ORIGIN.lat}, ${ORIGIN.lng})…`,
  );

  const byId = new Map<string, PlaceResult & { distanceMeters: number }>();
  const centers = gridCenters();

  for (const center of centers) {
    process.stdout.write(`  · ${center.label}… `);
    try {
      const places = await searchNearby(center.lat, center.lng, apiKey);
      let added = 0;
      for (const place of places) {
        const placeId = place.id?.replace(/^places\//, "");
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;
        if (!placeId || lat === undefined || lng === undefined) continue;
        if (!place.photos?.length) continue;

        const distanceMeters = haversineMeters(
          ORIGIN.lat,
          ORIGIN.lng,
          lat,
          lng,
        );
        if (distanceMeters > MAX_METERS) continue;

        if (!byId.has(placeId)) {
          byId.set(placeId, { ...place, id: placeId, distanceMeters });
          added += 1;
        }
      }
      console.log(`${places.length} hits, ${added} new with photos in range`);
    } catch (error) {
      console.log("failed");
      console.error(
        `    ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Gentle pacing for Places quota.
    await new Promise((r) => setTimeout(r, 200));
  }

  const candidates = [...byId.values()].sort(
    (a, b) => a.distanceMeters - b.distanceMeters,
  );
  console.log(`\nUnique courts with photos within ${MAX_MILES} mi: ${candidates.length}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const place of candidates) {
    const placeId = place.id!;
    const name = place.displayName?.text?.trim() || "Tennis courts";
    const miles = (place.distanceMeters / 1609.344).toFixed(1);

    const [existing] = await db
      .select({ id: courts.id })
      .from(courts)
      .where(eq(courts.sourceId, placeId))
      .limit(1);

    if (existing) {
      skipped += 1;
      console.log(`  skip (exists) ${name} · ${miles} mi`);
      continue;
    }

    const photoName = place.photos?.[0]?.name;
    if (!photoName) {
      skipped += 1;
      continue;
    }

    try {
      const photoUrl = await persistPhoto(photoName, admin.id, apiKey);
      const addr = parseAddress(place);
      let slug = slugify(name) || `court-${placeId.slice(0, 8)}`;
      const [slugTaken] = await db
        .select({ slug: courts.slug })
        .from(courts)
        .where(eq(courts.slug, slug))
        .limit(1);
      if (slugTaken) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const lat = place.location!.latitude!;
      const lng = place.location!.longitude!;

      const [court] = await db
        .insert(courts)
        .values({
          slug,
          name,
          description: null,
          address: addr.address,
          city: addr.city,
          region: addr.region,
          country: addr.country,
          location: sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`,
          surface: null,
          courtCount: null,
          hasLights: null,
          isIndoor: place.types?.includes("indoor") ? true : null,
          isFree: null,
          feeNotes: null,
          hasHittingWall: null,
          hasRestrooms: null,
          importStatus: "draft",
          source: "google",
          sourceId: placeId,
          sourceUrl:
            place.googleMapsUri ??
            `https://www.google.com/maps/place/?q=place_id:${placeId}`,
          createdBy: admin.id,
        })
        .returning({ id: courts.id });

      await db.insert(courtPhotos).values({
        courtId: court.id,
        url: photoUrl,
        sortOrder: 0,
        uploadedBy: admin.id,
      });

      imported += 1;
      console.log(`  imported ${name} · ${miles} mi · ${addr.city}`);
    } catch (error) {
      failed += 1;
      console.error(
        `  failed ${name}:`,
        error instanceof Error ? error.message : error,
      );
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  console.log("\nDone.");
  console.log(`  imported: ${imported}`);
  console.log(`  skipped:  ${skipped}`);
  console.log(`  failed:   ${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
