"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { getCurrentUser, isAdmin } from "@/lib/permissions";
import {
  idSchema,
  toValidationFailure,
  type ActionResult,
} from "@/lib/validation/schemas";
import {
  submitFeedbackSchema,
  type SubmitFeedbackInput,
} from "@/lib/validation/server";

export async function submitFeedback(
  input: SubmitFeedbackInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to submit feedback." };
  }

  const parsed = submitFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  const data = parsed.data;
  const db = requireDb();

  await db.insert(feedback).values({
    type: data.type,
    title: data.title,
    body: data.body,
    pageUrl: data.pageUrl?.trim() ? data.pageUrl.trim() : null,
    userId: session.user.id,
    status: "open",
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function setFeedbackStatus(
  feedbackId: string,
  status: "open" | "resolved",
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return { error: "Only admins can update feedback." };
  }

  const parsed = z
    .object({
      id: idSchema,
      status: z.enum(["open", "resolved"]),
    })
    .safeParse({ id: feedbackId, status });

  if (!parsed.success) {
    return toValidationFailure(parsed.error);
  }

  const db = requireDb();
  const [updated] = await db
    .update(feedback)
    .set({
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(eq(feedback.id, parsed.data.id))
    .returning({ id: feedback.id });

  if (!updated) {
    return { error: "Feedback not found." };
  }

  revalidatePath("/profile");
  return { success: true };
}
