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
const email = process.argv[2];
const demote = process.argv.includes("--demote");

async function run() {
  if (!email) {
    const rows = await sql`SELECT email, name, role FROM "user" ORDER BY role DESC, email`;
    if (rows.length === 0) {
      console.log("No users yet. Sign in once, then re-run this script.");
      return;
    }
    console.log("Users:");
    for (const row of rows) {
      console.log(`  [${row.role}] ${row.email ?? "(no email)"} — ${row.name ?? "unnamed"}`);
    }
    console.log("\nPromote with: npm run set-admin -- you@example.com");
    return;
  }

  const role = demote ? "user" : "admin";
  const rows = await sql`
    UPDATE "user" SET role = ${role}::user_role
    WHERE email = ${email}
    RETURNING email, name, role
  `;

  if (rows.length === 0) {
    console.error(`No user found with email ${email}. Sign in first, then retry.`);
    process.exit(1);
  }

  console.log(`${rows[0].email} is now ${rows[0].role}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
