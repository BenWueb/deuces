import "server-only";

import type { ImportCandidate } from "@/lib/import/types";

export type { ImportCandidate };

const PLACES_BASE = "https://places.googleapis.com/v1";
const MAX_RESULTS = 20;
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

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type PlacePhoto = {
  name?: string;
};

type PlaceResult = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: { latitude?: number; longitude?: number };
  photos?: PlacePhoto[];
  googleMapsUri?: string;
  types?: string[];
};

function requireApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GOOGLE_MAPS_API_KEY is not configured. Add it to .env.local to import courts from Google Places.",
    );
  }
  return key;
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

function component(
  components: AddressComponent[] | undefined,
  type: string,
  short = false,
): string | null {
  const match = components?.find((c) => c.types?.includes(type));
  if (!match) return null;
  const value = short ? match.shortText : match.longText;
  return value?.trim() || null;
}

function parseAddress(place: PlaceResult): {
  address: string;
  city: string;
  region: string | null;
  country: string;
} {
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

  const address =
    street ||
    place.shortFormattedAddress ||
    place.formattedAddress ||
    place.displayName?.text ||
    "Unknown address";

  return {
    address,
    city,
    region,
    country: country.length === 2 ? country.toUpperCase() : country,
  };
}

async function resolvePhotoUri(
  photoName: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      maxHeightPx: "800",
      maxWidthPx: "800",
      skipHttpRedirect: "true",
      key: apiKey,
    });
    const res = await fetch(
      `${PLACES_BASE}/${photoName}/media?${params}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { photoUri?: string };
    return data.photoUri ?? null;
  } catch {
    return null;
  }
}

/**
 * Download a Places photo (by resource name or absolute URL) into Blob/local
 * uploads, matching the previous OSM persist helper.
 */
export async function persistPlacePhoto(
  photoRef: string,
  userId: string,
): Promise<string> {
  const apiKey = requireApiKey();
  let fetchUrl = photoRef;

  if (photoRef.startsWith("places/")) {
    const params = new URLSearchParams({
      maxHeightPx: "1600",
      maxWidthPx: "1600",
      key: apiKey,
    });
    fetchUrl = `${PLACES_BASE}/${photoRef}/media?${params}`;
  }

  const res = await fetch(fetchUrl, {
    headers: { "User-Agent": "Deuces/1.0 (tennis court finder)" },
    cache: "no-store",
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Could not download place photo (${res.status}).`);
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const extensionByType: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  const extension =
    extensionByType[contentType.split(";")[0]?.trim() ?? ""] ?? ".jpg";

  const { randomUUID } = await import("node:crypto");
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
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

async function placeToCandidate(
  place: PlaceResult,
  apiKey: string,
  origin?: { lat: number; lng: number },
): Promise<ImportCandidate | null> {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (lat === undefined || lng === undefined) return null;

  // Places returns id as the raw place id; name is places/{id}.
  const placeId = place.id?.replace(/^places\//, "") ?? null;
  if (!placeId) return null;

  const name = place.displayName?.text?.trim() || "Tennis courts";
  const addr = parseAddress(place);
  const photoName = place.photos?.[0]?.name ?? null;
  const photoUrl = photoName
    ? await resolvePhotoUri(photoName, apiKey)
    : null;

  return {
    sourceId: placeId,
    sourceUrl:
      place.googleMapsUri ??
      `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    name,
    lat,
    lng,
    address: addr.address,
    city: addr.city,
    region: addr.region,
    country: addr.country,
    surface: null,
    courtCount: null,
    hasLights: null,
    isIndoor: place.types?.includes("indoor") ? true : null,
    isFree: null,
    feeNotes: null,
    hasHittingWall: null,
    hasRestrooms: null,
    photoUrl,
    photoName,
    distanceMeters: origin
      ? haversineMeters(origin.lat, origin.lng, lat, lng)
      : undefined,
  };
}

function placesApiError(label: string, status: number, body: string): Error {
  const refererBlocked =
    status === 403 &&
    (/referer/i.test(body) || /PERMISSION_DENIED/i.test(body));

  if (refererBlocked) {
    return new Error(
      "Google Places blocked this server request (empty HTTP referer). " +
        "In Google Cloud Console → APIs & Services → Credentials, edit " +
        "GOOGLE_MAPS_API_KEY: set Application restrictions to None " +
        "(or IP addresses for production), not HTTP referrers. " +
        "Under API restrictions, allow Places API (New).",
    );
  }

  return new Error(
    `Google Places ${label} failed (${status}): ${body.slice(0, 200)}`,
  );
}

async function searchNearbyRaw(
  lat: number,
  lng: number,
  radiusMeters: number,
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
      maxResultCount: MAX_RESULTS,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(Math.max(radiusMeters, 500), 50000),
        },
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw placesApiError("nearby search", res.status, await res.text());
  }

  const data = (await res.json()) as { places?: PlaceResult[] };
  return data.places ?? [];
}

async function searchTextRaw(
  query: string,
  apiKey: string,
): Promise<PlaceResult[]> {
  const textQuery = /tennis/i.test(query) ? query : `${query} tennis court`;

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      includedType: "tennis_court",
      maxResultCount: MAX_RESULTS,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw placesApiError("text search", res.status, await res.text());
  }

  const data = (await res.json()) as { places?: PlaceResult[] };
  return data.places ?? [];
}

export async function findCourtsNearby(
  lat: number,
  lng: number,
  radiusMeters = 32187,
): Promise<ImportCandidate[]> {
  const apiKey = requireApiKey();
  const places = await searchNearbyRaw(lat, lng, radiusMeters, apiKey);
  const candidates = (
    await Promise.all(
      places.map((place) => placeToCandidate(place, apiKey, { lat, lng })),
    )
  ).filter((c): c is ImportCandidate => c !== null);

  candidates.sort(
    (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0),
  );
  return candidates.slice(0, MAX_RESULTS);
}

export async function searchCourtsByQuery(
  query: string,
): Promise<ImportCandidate[]> {
  const apiKey = requireApiKey();
  const places = await searchTextRaw(query, apiKey);
  const candidates = (
    await Promise.all(
      places.map((place) => placeToCandidate(place, apiKey)),
    )
  ).filter((c): c is ImportCandidate => c !== null);

  return candidates.slice(0, MAX_RESULTS);
}
