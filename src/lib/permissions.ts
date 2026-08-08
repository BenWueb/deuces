import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comments, courts, users, type UserRole } from "@/lib/db/schema";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
};

/**
 * Reads the role from the database rather than the session token so that a
 * promotion or demotion takes effect immediately instead of on next sign-in.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id || !db) return null;

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return row ?? null;
}

export function isAdmin(user: CurrentUser | null): boolean {
  return user?.role === "admin";
}

export async function canEditCourt(
  courtId: string,
  user: CurrentUser | null,
): Promise<boolean> {
  if (!user || !db) return false;
  if (user.role === "admin") return true;

  const [court] = await db
    .select({ createdBy: courts.createdBy })
    .from(courts)
    .where(eq(courts.id, courtId))
    .limit(1);

  return !!court && court.createdBy === user.id;
}

export async function canDeleteComment(
  commentId: string,
  user: CurrentUser | null,
): Promise<boolean> {
  if (!user || !db) return false;
  if (user.role === "admin") return true;

  const [comment] = await db
    .select({ userId: comments.userId })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  return !!comment && comment.userId === user.id;
}
