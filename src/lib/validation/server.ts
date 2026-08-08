import "server-only";

import { z } from "zod";
import { checkClean } from "./moderation";
import {
  commentInputSchema,
  contributeCourtInfoSchema,
  createCourtInputSchema,
  feedbackInputSchema,
  learnResourceInputSchema,
  ratingInputSchema,
  updateCourtInputSchema,
} from "./schemas";

/**
 * The authoritative schemas. These match the shared ones the form uses, plus
 * the profanity rules — the client can't be trusted to run those, and the word
 * list has no business in the browser bundle.
 */

function cleanCourtFields(
  court: {
    name: string;
    description?: string | null;
    address: string;
    city: string;
    region?: string | null;
    feeNotes?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  checkClean(ctx, "name", "Court name", court.name);
  checkClean(ctx, "description", "Description", court.description);
  checkClean(ctx, "address", "Address", court.address);
  checkClean(ctx, "city", "City", court.city);
  checkClean(ctx, "region", "Region", court.region);
  checkClean(ctx, "feeNotes", "Fee notes", court.feeNotes);
}

export const createCourtSchema = createCourtInputSchema.superRefine(
  (court, ctx) => {
    cleanCourtFields(court, ctx);
  },
);

export const updateCourtSchema = updateCourtInputSchema.superRefine(
  (court, ctx) => {
    cleanCourtFields(court, ctx);
  },
);

export const addCommentSchema = commentInputSchema.superRefine(
  (comment, ctx) => {
    checkClean(ctx, "body", "Comment", comment.body);
  },
);

export const rateCourtSchema = ratingInputSchema;

export const submitFeedbackSchema = feedbackInputSchema.superRefine(
  (feedback, ctx) => {
    checkClean(ctx, "title", "Title", feedback.title);
    checkClean(ctx, "body", "Details", feedback.body);
  },
);

export const learnResourceSchema = learnResourceInputSchema.superRefine(
  (resource, ctx) => {
    checkClean(ctx, "title", "Title", resource.title);
    checkClean(ctx, "description", "Description", resource.description);
  },
);

export const contributeCourtInfoServerSchema =
  contributeCourtInfoSchema.superRefine((data, ctx) => {
    checkClean(ctx, "feeNotes", "Fee notes", data.feeNotes);
  });

export type CreateCourtInput = z.input<typeof createCourtSchema>;
export type UpdateCourtInput = z.input<typeof updateCourtSchema>;
export type SubmitFeedbackInput = z.input<typeof submitFeedbackSchema>;
export type LearnResourceServerInput = z.input<typeof learnResourceSchema>;
export type ContributeCourtInfoServerInput = z.input<
  typeof contributeCourtInfoServerSchema
>;
