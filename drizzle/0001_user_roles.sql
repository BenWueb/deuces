DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" "user_role" DEFAULT 'user' NOT NULL;
