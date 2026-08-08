"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComment, deleteComment, rateCourt } from "@/lib/actions/courts";
import { TennisBallRating } from "@/components/ui/tennis-ball-rating";
import { commentBodySchema } from "@/lib/validation/schemas";

const MAX_COMMENT_LENGTH = 2000;

export function RatingControl({
  courtId,
  initialRating,
  ratingAvg,
  ratingCount,
  isSignedIn,
}: {
  courtId: string;
  initialRating: number | null;
  ratingAvg: number;
  ratingCount: number;
  isSignedIn: boolean;
}) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRate(stars: number) {
    if (!isSignedIn) return;
    setRating(stars);
    startTransition(async () => {
      const result = await rateCourt(courtId, stars);
      setError("error" in result ? result.error : null);
    });
  }

  return (
    <div className="court-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted">Community rating</p>
          <div className="mt-1 flex items-center gap-2">
            <TennisBallRating value={ratingAvg} size="md" />
            <span className="font-display text-xl font-bold">
              {ratingCount > 0 ? ratingAvg.toFixed(1) : "—"}
            </span>
            <span className="text-sm text-muted">
              ({ratingCount} rating{ratingCount !== 1 ? "s" : ""})
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm font-medium">
          {isSignedIn ? "Your rating" : "Sign in to rate"}
        </p>
        <TennisBallRating
          value={rating}
          size="lg"
          interactive={isSignedIn && !pending}
          onChange={handleRate}
          className="mt-2"
        />
        {error && <p className="mt-2 text-sm text-clay">{error}</p>}
      </div>
    </div>
  );
}

export function CommentsSection({
  courtId,
  comments,
  isSignedIn,
  currentUserId,
  isAdmin,
}: {
  courtId: string;
  comments: {
    id: string;
    body: string;
    parentId: string | null;
    createdAt: Date;
    userId: string;
    userName: string | null;
    userImage: string | null;
  }[];
  isSignedIn: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = commentBodySchema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "That comment is not valid.");
      return;
    }

    startTransition(async () => {
      const result = await addComment(courtId, parsed.data);
      if ("error" in result) {
        setError(result.error);
      } else {
        setBody("");
        setError(null);
        router.refresh();
      }
    });
  }

  function handleDelete(commentId: string) {
    if (deletingId !== commentId) {
      setDeletingId(commentId);
      return;
    }

    startTransition(async () => {
      const result = await deleteComment(commentId);
      if ("error" in result) setError(result.error);
      setDeletingId(null);
      router.refresh();
    });
  }

  const topLevel = comments.filter((c) => !c.parentId);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold">Comments</h2>

      {isSignedIn ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={body}
            maxLength={MAX_COMMENT_LENGTH}
            onChange={(e) => {
              setBody(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Share your experience at this court..."
            rows={3}
            className={`w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 ${
              error
                ? "border-clay ring-clay/30"
                : "border-border ring-court/30"
            }`}
          />
          <div className="flex items-start justify-between gap-3">
            {error ? (
              <p role="alert" className="text-sm text-clay">
                {error}
              </p>
            ) : (
              <span />
            )}
            <span className="shrink-0 text-xs text-muted">
              {body.length}/{MAX_COMMENT_LENGTH}
            </span>
          </div>
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="btn-court min-h-11 rounded-xl px-6 text-sm font-semibold disabled:opacity-50"
          >
            {pending ? "Posting..." : "Post comment"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">Sign in to leave a comment.</p>
      )}

      <div className="space-y-4">
        {topLevel.length === 0 ? (
          <p className="text-sm text-muted">No comments yet. Be the first!</p>
        ) : (
          topLevel.map((comment) => {
            const canDelete =
              isAdmin || (!!currentUserId && comment.userId === currentUserId);
            const confirming = deletingId === comment.id;

            return (
              <article
                key={comment.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-court/10 text-xs font-bold text-court">
                      {(comment.userName ?? "U")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {comment.userName ?? "Anonymous"}
                      </p>
                      <time className="text-xs text-muted">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </time>
                    </div>
                  </div>

                  {canDelete && (
                    <div className="flex items-center gap-1">
                      {confirming && (
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="min-h-11 rounded-lg px-2 text-xs font-medium text-muted"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        disabled={pending}
                        className="min-h-11 rounded-lg px-2 text-xs font-semibold text-clay disabled:opacity-50"
                      >
                        {confirming ? "Confirm delete" : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed">{comment.body}</p>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
