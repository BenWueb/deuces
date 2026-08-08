import { eq, sql, desc, and } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import {
  courts,
  courtFavorites,
  courtPhotos,
  ratings,
  comments,
  users,
  type ImportStatus,
} from "@/lib/db/schema";

export type CourtListItem = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  region: string | null;
  surface: string | null;
  courtCount: number | null;
  hasLights: boolean | null;
  isIndoor: boolean | null;
  isFree: boolean | null;
  hasHittingWall: boolean | null;
  hasRestrooms: boolean | null;
  importStatus: ImportStatus;
  ratingAvg: number;
  ratingCount: number;
  lat: number;
  lng: number;
  distanceMeters?: number;
  photoUrl: string | null;
};

function mapListRow(row: {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  region: string | null;
  surface: string | null;
  court_count: number | null;
  has_lights: boolean | null;
  is_indoor: boolean | null;
  is_free: boolean | null;
  has_hitting_wall: boolean | null;
  has_restrooms: boolean | null;
  import_status: ImportStatus;
  rating_avg: number;
  rating_count: number;
  lat: number;
  lng: number;
  distance_meters?: number;
  photo_url: string | null;
}): CourtListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    city: row.city,
    region: row.region,
    surface: row.surface,
    courtCount: row.court_count,
    hasLights: row.has_lights,
    isIndoor: row.is_indoor,
    isFree: row.is_free,
    hasHittingWall: row.has_hitting_wall,
    hasRestrooms: row.has_restrooms,
    importStatus: row.import_status,
    ratingAvg: row.rating_avg,
    ratingCount: row.rating_count,
    lat: row.lat,
    lng: row.lng,
    distanceMeters: row.distance_meters,
    photoUrl: row.photo_url,
  };
}

export async function getCourtsNearby(
  lat: number,
  lng: number,
  radiusMeters = 25000,
  limit = 500,
): Promise<CourtListItem[]> {
  const db = requireDb();

  const rows = await db.execute<{
    id: string;
    slug: string;
    name: string;
    address: string;
    city: string;
    region: string | null;
    surface: string | null;
    court_count: number | null;
    has_lights: boolean | null;
    is_indoor: boolean | null;
    is_free: boolean | null;
    has_hitting_wall: boolean | null;
    has_restrooms: boolean | null;
    import_status: ImportStatus;
    rating_avg: number;
    rating_count: number;
    lat: number;
    lng: number;
    distance_meters: number;
    photo_url: string | null;
  }>(sql`
    SELECT
      c.id,
      c.slug,
      c.name,
      c.address,
      c.city,
      c.region,
      c.surface,
      c.court_count,
      c.has_lights,
      c.is_indoor,
      c.is_free,
      c.has_hitting_wall,
      c.has_restrooms,
      c.import_status,
      c.rating_avg,
      c.rating_count,
      ST_Y(c.location::geometry) AS lat,
      ST_X(c.location::geometry) AS lng,
      ST_Distance(
        c.location::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) AS distance_meters,
      (
        SELECT cp.url FROM court_photos cp
        WHERE cp.court_id = c.id
        ORDER BY cp.sort_order ASC
        LIMIT 1
      ) AS photo_url
    FROM courts c
    WHERE ST_DWithin(
      c.location::geography,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${radiusMeters}
    )
    ORDER BY distance_meters ASC
    LIMIT ${limit}
  `);

  return rows.rows.map(mapListRow);
}

export async function getCourtsInBounds(
  west: number,
  south: number,
  east: number,
  north: number,
  limit = 100,
): Promise<CourtListItem[]> {
  const db = requireDb();

  const rows = await db.execute<{
    id: string;
    slug: string;
    name: string;
    address: string;
    city: string;
    region: string | null;
    surface: string | null;
    court_count: number | null;
    has_lights: boolean | null;
    is_indoor: boolean | null;
    is_free: boolean | null;
    has_hitting_wall: boolean | null;
    has_restrooms: boolean | null;
    import_status: ImportStatus;
    rating_avg: number;
    rating_count: number;
    lat: number;
    lng: number;
    photo_url: string | null;
  }>(sql`
    SELECT
      c.id,
      c.slug,
      c.name,
      c.address,
      c.city,
      c.region,
      c.surface,
      c.court_count,
      c.has_lights,
      c.is_indoor,
      c.is_free,
      c.has_hitting_wall,
      c.has_restrooms,
      c.import_status,
      c.rating_avg,
      c.rating_count,
      ST_Y(c.location::geometry) AS lat,
      ST_X(c.location::geometry) AS lng,
      (
        SELECT cp.url FROM court_photos cp
        WHERE cp.court_id = c.id
        ORDER BY cp.sort_order ASC
        LIMIT 1
      ) AS photo_url
    FROM courts c
    WHERE ST_Within(
      c.location,
      ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)
    )
    LIMIT ${limit}
  `);

  return rows.rows.map(mapListRow);
}

export async function getCourtsCreatedByUser(
  userId: string,
  limit = 100,
): Promise<CourtListItem[]> {
  const db = requireDb();

  const rows = await db.execute<{
    id: string;
    slug: string;
    name: string;
    address: string;
    city: string;
    region: string | null;
    surface: string | null;
    court_count: number | null;
    has_lights: boolean | null;
    is_indoor: boolean | null;
    is_free: boolean | null;
    has_hitting_wall: boolean | null;
    has_restrooms: boolean | null;
    import_status: ImportStatus;
    rating_avg: number;
    rating_count: number;
    lat: number;
    lng: number;
    photo_url: string | null;
  }>(sql`
    SELECT
      c.id,
      c.slug,
      c.name,
      c.address,
      c.city,
      c.region,
      c.surface,
      c.court_count,
      c.has_lights,
      c.is_indoor,
      c.is_free,
      c.has_hitting_wall,
      c.has_restrooms,
      c.import_status,
      c.rating_avg,
      c.rating_count,
      ST_Y(c.location::geometry) AS lat,
      ST_X(c.location::geometry) AS lng,
      (
        SELECT cp.url FROM court_photos cp
        WHERE cp.court_id = c.id
        ORDER BY cp.sort_order ASC
        LIMIT 1
      ) AS photo_url
    FROM courts c
    WHERE c.created_by = ${userId}
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `);

  return rows.rows.map(mapListRow);
}

export async function getAllCourts(limit = 500): Promise<CourtListItem[]> {
  const db = requireDb();

  const rows = await db
    .select({
      id: courts.id,
      slug: courts.slug,
      name: courts.name,
      address: courts.address,
      city: courts.city,
      region: courts.region,
      surface: courts.surface,
      courtCount: courts.courtCount,
      hasLights: courts.hasLights,
      isIndoor: courts.isIndoor,
      isFree: courts.isFree,
      hasHittingWall: courts.hasHittingWall,
      hasRestrooms: courts.hasRestrooms,
      importStatus: courts.importStatus,
      ratingAvg: courts.ratingAvg,
      ratingCount: courts.ratingCount,
    })
    .from(courts)
    .orderBy(desc(courts.createdAt))
    .limit(limit);

  const withCoords = await Promise.all(
    rows.map(async (row) => {
      const coords = await db.execute<{ lat: number; lng: number }>(sql`
        SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
        FROM courts WHERE id = ${row.id}
      `);
      const photos = await db
        .select({ url: courtPhotos.url })
        .from(courtPhotos)
        .where(eq(courtPhotos.courtId, row.id))
        .orderBy(courtPhotos.sortOrder)
        .limit(1);

      return {
        ...row,
        lat: coords.rows[0]?.lat ?? 0,
        lng: coords.rows[0]?.lng ?? 0,
        photoUrl: photos[0]?.url ?? null,
      };
    }),
  );

  return withCoords;
}

export async function getCourtBySlug(slug: string) {
  const db = requireDb();

  const [court] = await db
    .select()
    .from(courts)
    .where(eq(courts.slug, slug))
    .limit(1);

  if (!court) return null;

  const coords = await db.execute<{ lat: number; lng: number }>(sql`
    SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
    FROM courts WHERE id = ${court.id}
  `);

  const photos = await db
    .select()
    .from(courtPhotos)
    .where(eq(courtPhotos.courtId, court.id))
    .orderBy(courtPhotos.sortOrder);

  const courtComments = await db
    .select({
      id: comments.id,
      body: comments.body,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      userId: comments.userId,
      userName: users.name,
      userImage: users.image,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.courtId, court.id))
    .orderBy(desc(comments.createdAt));

  return {
    ...court,
    lat: coords.rows[0]?.lat ?? 0,
    lng: coords.rows[0]?.lng ?? 0,
    photos,
    comments: courtComments,
  };
}

export async function getUserRating(courtId: string, userId: string) {
  const db = requireDb();
  const [rating] = await db
    .select()
    .from(ratings)
    .where(and(eq(ratings.courtId, courtId), eq(ratings.userId, userId)))
    .limit(1);
  return rating ?? null;
}

export async function isCourtFavorited(
  courtId: string,
  userId: string,
): Promise<boolean> {
  const db = requireDb();
  const [row] = await db
    .select({ id: courtFavorites.id })
    .from(courtFavorites)
    .where(
      and(
        eq(courtFavorites.courtId, courtId),
        eq(courtFavorites.userId, userId),
      ),
    )
    .limit(1);
  return !!row;
}

export async function getFavoriteCourtsByUser(
  userId: string,
  limit = 100,
): Promise<CourtListItem[]> {
  const db = requireDb();

  const rows = await db.execute<{
    id: string;
    slug: string;
    name: string;
    address: string;
    city: string;
    region: string | null;
    surface: string | null;
    court_count: number | null;
    has_lights: boolean | null;
    is_indoor: boolean | null;
    is_free: boolean | null;
    has_hitting_wall: boolean | null;
    has_restrooms: boolean | null;
    import_status: ImportStatus;
    rating_avg: number;
    rating_count: number;
    lat: number;
    lng: number;
    photo_url: string | null;
  }>(sql`
    SELECT
      c.id,
      c.slug,
      c.name,
      c.address,
      c.city,
      c.region,
      c.surface,
      c.court_count,
      c.has_lights,
      c.is_indoor,
      c.is_free,
      c.has_hitting_wall,
      c.has_restrooms,
      c.import_status,
      c.rating_avg,
      c.rating_count,
      ST_Y(c.location::geometry) AS lat,
      ST_X(c.location::geometry) AS lng,
      (
        SELECT cp.url FROM court_photos cp
        WHERE cp.court_id = c.id
        ORDER BY cp.sort_order ASC
        LIMIT 1
      ) AS photo_url
    FROM court_favorites f
    INNER JOIN courts c ON c.id = f.court_id
    WHERE f.user_id = ${userId}
    ORDER BY f.created_at DESC
    LIMIT ${limit}
  `);

  return rows.rows.map(mapListRow);
}
