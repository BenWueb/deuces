/**
 * Move local /uploads/... court photos to Vercel Blob and update court_photos.url.
 *
 * Requires BLOB_READ_WRITE_TOKEN in .env.local
 * Usage: npx tsx scripts/migrate-uploads-to-blob.ts
 */
import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();

if (!connectionString) {
  console.error("DATABASE_URL is required in .env.local");
  process.exit(1);
}

if (!blobToken) {
  console.error(
    "BLOB_READ_WRITE_TOKEN is missing.\n" +
      "Add it to .env.local (from Vercel → Storage → Blob, or: vercel env pull)",
  );
  process.exit(1);
}

const sql = neon(connectionString);

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
  };
  return map[ext] ?? "application/octet-stream";
}

async function main() {
  const rows = await sql`
    SELECT id, court_id, url
    FROM court_photos
    WHERE url LIKE '/uploads/%'
    ORDER BY created_at ASC
  `;

  console.log(`Found ${rows.length} local photo(s) to migrate.`);
  if (rows.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let migrated = 0;
  let failed = 0;
  let missing = 0;

  for (const row of rows) {
    const relative = String(row.url).replace(/^\//, ""); // uploads/...
    const absolute = path.join(process.cwd(), "public", relative);

    try {
      const bytes = await readFile(absolute);
      // Keep a stable-looking blob key under courts/migrated/...
      const blobKey = relative.replace(/^uploads\//, "courts/migrated/");
      const blob = await put(blobKey, bytes, {
        access: "public",
        contentType: contentTypeFor(absolute),
        token: blobToken,
        // Allow re-runs without colliding if a prior put left an orphan.
        addRandomSuffix: true,
      });

      await sql`
        UPDATE court_photos
        SET url = ${blob.url}
        WHERE id = ${row.id}
      `;

      migrated += 1;
      console.log(`  ok  ${row.url} → ${blob.url}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/ENOENT|no such file/i.test(message)) {
        missing += 1;
        console.error(`  missing file ${row.url}`);
      } else {
        failed += 1;
        console.error(`  failed ${row.url}: ${message}`);
      }
    }
  }

  console.log("\nDone.");
  console.log(`  migrated: ${migrated}`);
  console.log(`  missing:  ${missing}`);
  console.log(`  failed:   ${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
