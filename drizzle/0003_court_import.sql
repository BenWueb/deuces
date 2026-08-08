DO $$ BEGIN
  CREATE TYPE "public"."import_status" AS ENUM('draft', 'complete');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."court_source" AS ENUM('manual', 'osm');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "surface" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "surface" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "court_count" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "court_count" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "has_lights" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "has_lights" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "is_indoor" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "is_indoor" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "is_free" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "is_free" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "has_hitting_wall" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "has_hitting_wall" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "has_restrooms" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "courts" ALTER COLUMN "has_restrooms" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "courts" ADD COLUMN IF NOT EXISTS "import_status" "import_status" DEFAULT 'complete' NOT NULL;
--> statement-breakpoint
ALTER TABLE "courts" ADD COLUMN IF NOT EXISTS "source" "court_source" DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
ALTER TABLE "courts" ADD COLUMN IF NOT EXISTS "source_id" text;
--> statement-breakpoint
ALTER TABLE "courts" ADD COLUMN IF NOT EXISTS "source_url" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "courts_source_id_unique" ON "courts" ("source_id");
