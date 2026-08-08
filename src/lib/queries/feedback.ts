import { desc, eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { feedback, users, type FeedbackStatus, type FeedbackType } from "@/lib/db/schema";

export type FeedbackListItem = {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  title: string;
  body: string;
  pageUrl: string | null;
  /** ISO string — safe to pass into Client Components. */
  createdAt: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
};

export async function getAllFeedback(limit = 100): Promise<FeedbackListItem[]> {
  const db = requireDb();

  const rows = await db
    .select({
      id: feedback.id,
      type: feedback.type,
      status: feedback.status,
      title: feedback.title,
      body: feedback.body,
      pageUrl: feedback.pageUrl,
      createdAt: feedback.createdAt,
      userId: feedback.userId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(feedback)
    .leftJoin(users, eq(feedback.userId, users.id))
    .orderBy(desc(feedback.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}
