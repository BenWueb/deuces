CREATE TABLE IF NOT EXISTS "learn_resources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "url" text NOT NULL,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "learn_resources"
    ADD CONSTRAINT "learn_resources_created_by_user_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."user"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learn_resources_sort_idx"
  ON "learn_resources" USING btree ("sort_order", "created_at");
