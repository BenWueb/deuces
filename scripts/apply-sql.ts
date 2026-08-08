import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run db:apply -- drizzle/0001_user_roles.sql");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required in .env.local");
  process.exit(1);
}

const sql = neon(connectionString);

async function apply() {
  const statements = readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Applying ${file} (${statements.length} statements)...`);

  for (const statement of statements) {
    await sql.query(statement);
    console.log(`  ok: ${statement.split("\n")[0].slice(0, 70)}`);
  }

  console.log("Done.");
}

apply().catch((err) => {
  console.error(err);
  process.exit(1);
});
