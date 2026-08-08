"use client";

import { useState, useTransition } from "react";
import { submitFeedback } from "@/lib/actions/feedback";
import { BugIcon, SuggestionIcon } from "@/components/feedback/feedback-icons";
import { cn } from "@/lib/utils";
import {
  feedbackInputSchema,
  toValidationFailure,
  type FieldErrors,
  type FeedbackTypeInput,
} from "@/lib/validation/schemas";

export function FeedbackForm({
  defaultPageUrl = "",
  defaultType = "bug",
  onSuccess,
  idPrefix = "feedback",
  compact = false,
}: {
  defaultPageUrl?: string;
  defaultType?: FeedbackTypeInput;
  onSuccess?: () => void;
  idPrefix?: string;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [type, setType] = useState<FeedbackTypeInput>(defaultType);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pageUrl, setPageUrl] = useState(defaultPageUrl);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      type,
      title,
      body,
      pageUrl: pageUrl.trim() || undefined,
    };

    const parsed = feedbackInputSchema.safeParse(payload);
    if (!parsed.success) {
      const failure = toValidationFailure(parsed.error);
      setError(failure.error);
      setFieldErrors(failure.fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await submitFeedback(parsed.data);
      if (result && "error" in result) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setTitle("");
      setBody("");
      setFieldErrors({});
      if (onSuccess) {
        onSuccess();
      } else {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-court/25 bg-court/5 p-6 text-center">
        <h2 className="font-display text-xl font-semibold">Thanks — got it</h2>
        <p className="mt-2 text-sm text-muted">
          Your submission was sent to the Deuces admin inbox.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="btn-court mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn(compact ? "space-y-4" : "space-y-5")}>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Type</legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("bug")}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
              type === "bug"
                ? "border-red-500/40 bg-red-50 text-red-600"
                : "border-border text-muted hover:border-red-200 hover:bg-red-50/60 hover:text-red-600",
            )}
          >
            <BugIcon className="h-4 w-4" />
            Bug
          </button>
          <button
            type="button"
            onClick={() => setType("suggestion")}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
              type === "suggestion"
                ? "border-court/30 bg-court/10 text-court"
                : "border-border text-muted hover:bg-court/5 hover:text-court",
            )}
          >
            <SuggestionIcon className="h-4 w-4" />
            Suggestion
          </button>
        </div>
        {fieldErrors.type && (
          <p className="mt-1.5 text-sm text-clay">{fieldErrors.type}</p>
        )}
      </fieldset>

      <div>
        <label
          className="mb-2 block text-sm font-semibold"
          htmlFor={`${idPrefix}-title`}
        >
          Title <span className="text-clay">*</span>
        </label>
        <input
          id={`${idPrefix}-title`}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(inputClass, fieldErrors.title && invalidClass)}
          placeholder={
            type === "bug"
              ? "Map pins don’t center when tapped"
              : "Add filters for indoor courts"
          }
        />
        {fieldErrors.title && (
          <p className="mt-1.5 text-sm text-clay">{fieldErrors.title}</p>
        )}
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-semibold"
          htmlFor={`${idPrefix}-body`}
        >
          Details <span className="text-clay">*</span>
        </label>
        <textarea
          id={`${idPrefix}-body`}
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={cn(
            inputClass,
            compact ? "min-h-28" : "min-h-36",
            fieldErrors.body && invalidClass,
          )}
          placeholder={
            type === "bug"
              ? "What happened, what you expected, and how to reproduce it…"
              : "What you’d like to see and why it would help…"
          }
        />
        <p className="mt-1 text-xs text-muted">{body.length}/4000</p>
        {fieldErrors.body && (
          <p className="mt-1.5 text-sm text-clay">{fieldErrors.body}</p>
        )}
      </div>

      {!compact && (
        <div>
          <label
            className="mb-2 block text-sm font-semibold"
            htmlFor={`${idPrefix}-page`}
          >
            Related page{" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={`${idPrefix}-page`}
            maxLength={500}
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            className={cn(inputClass, fieldErrors.pageUrl && invalidClass)}
            placeholder="/map or a court URL"
          />
          {fieldErrors.pageUrl && (
            <p className="mt-1.5 text-sm text-clay">{fieldErrors.pageUrl}</p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-clay/30 bg-clay/5 p-3 text-sm text-clay">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-optic flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl font-display text-lg font-bold disabled:opacity-50"
      >
        {type === "bug" ? (
          <BugIcon className="h-5 w-5" />
        ) : (
          <SuggestionIcon className="h-5 w-5" />
        )}
        {pending ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none ring-court/30 focus:ring-2";
const invalidClass = "border-clay ring-clay/30";
