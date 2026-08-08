/**
 * Removes the original seed dummy courts and seed users.
 * Keeps real Google-imported courts and real auth users.
 *
 * Usage: npx tsx scripts/clear-seed-data.ts
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required in .env.local");
  process.exit(1);
}

const sql = neon(connectionString);

const SEED_USER_IDS = [
  "seed-user-alex",
  "seed-user-jordan",
  "seed-user-sam",
];

const SEED_SLUGS = [
  "central-park-tennis",
  "piedmont-park-tennis",
  "roland-garros-public",
  "venice-beach-tennis",
  "wimbledon-park",
  "millennium-park-tennis",
  "crandon-park-tennis",
  "seattle-center-tennis",
  "ojibway-park-woodbury",
  "bielenberg-sports-center",
  "carver-lake-park",
  "colby-lake-park",
  "lake-elmo-park-reserve",
  "walton-park-oakdale",
  "hamlet-park-cottage-grove",
  "phalen-park-st-paul",
  "woodbury-indoor-tennis",
];

async function main() {
  const before = await sql`
    SELECT slug, name, city, source, created_by
    FROM courts
    WHERE slug = ANY(${SEED_SLUGS})
       OR created_by = ANY(${SEED_USER_IDS})
    ORDER BY slug
  `;

  console.log(`Found ${before.length} seed court(s) to remove:`);
  for (const row of before) {
    console.log(`  - ${row.slug} (${row.city}, ${row.source})`);
  }

  if (before.length > 0) {
    const deleted = await sql`
      DELETE FROM courts
      WHERE slug = ANY(${SEED_SLUGS})
         OR created_by = ANY(${SEED_USER_IDS})
      RETURNING slug
    `;
    console.log(`Deleted ${deleted.length} court(s) (photos/ratings/comments cascade).`);
  }

  const users = await sql`
    DELETE FROM "user"
    WHERE id = ANY(${SEED_USER_IDS})
       OR email LIKE '%@seed.deuces.app'
    RETURNING id, email
  `;
  console.log(`Deleted ${users.length} seed user(s).`);
  for (const user of users) {
    console.log(`  - ${user.id} (${user.email})`);
  }

  const remaining = await sql`
    SELECT count(*)::int AS count FROM courts
  `;
  console.log(`Courts remaining: ${remaining[0]?.count ?? 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
