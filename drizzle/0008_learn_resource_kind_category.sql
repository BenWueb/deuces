DO $$ BEGIN
  CREATE TYPE "learn_resource_kind" AS ENUM ('channel', 'video');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "learn_video_category" AS ENUM (
    'serve',
    'forehand',
    'backhand',
    'volley',
    'return',
    'footwork',
    'strategy',
    'mental',
    'fitness',
    'doubles',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "learn_resources"
  ADD COLUMN IF NOT EXISTS "kind" "learn_resource_kind" DEFAULT 'channel' NOT NULL;
--> statement-breakpoint
ALTER TABLE "learn_resources"
  ADD COLUMN IF NOT EXISTS "category" "learn_video_category";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learn_resources_kind_category_idx"
  ON "learn_resources" USING btree ("kind", "category", "sort_order");
