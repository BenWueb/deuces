DO $$ BEGIN
  CREATE TYPE "public"."feedback_type" AS ENUM('bug', 'suggestion');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."feedback_status" AS ENUM('open', 'resolved');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" "feedback_type" NOT NULL,
  "status" "feedback_status" DEFAULT 'open' NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "page_url" text,
  "user_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "feedback"
    ADD CONSTRAINT "feedback_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_created_at_idx" ON "feedback" USING btree ("created_at");
