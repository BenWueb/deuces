CREATE TABLE IF NOT EXISTS "court_favorites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "court_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "court_favorites"
    ADD CONSTRAINT "court_favorites_court_id_courts_id_fk"
    FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "court_favorites"
    ADD CONSTRAINT "court_favorites_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "court_favorites_court_user_unique"
  ON "court_favorites" ("court_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "court_favorites_user_idx"
  ON "court_favorites" USING btree ("user_id", "created_at");
