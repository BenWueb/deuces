"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  createLearnResource,
  lookupYouTubeChannelAction,
  updateLearnResource,
} from "@/lib/actions/learn";
import {
  learnResourceInputSchema,
  toValidationFailure,
  youtubeUrlSchema,
  type FieldErrors,
} from "@/lib/validation/schemas";

export function LearnResourceForm({
  mode = "create",
  resource,
  onDone,
}: {
  mode?: "create" | "edit";
  resource?: {
    id: string;
    title: string;
    url: string;
    description: string | null;
  };
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [title, setTitle] = useState(resource?.title ?? "");
  const [url, setUrl] = useState(resource?.url ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  // Skip auto-lookup for the initial edit URL so we don't overwrite saved fields.
  const lastLookupUrl = useRef<string | null>(resource?.url?.trim() || null);

  async function lookupFromUrl(nextUrl: string, force = false) {
    const parsed = youtubeUrlSchema.safeParse(nextUrl);
    if (!parsed.success) return;

    if (!force && lastLookupUrl.current === parsed.data) return;

    setLookingUp(true);
    setError(null);
    setFieldErrors((prev) => {
      const { url: _url, ...rest } = prev;
      return rest;
    });

    const result = await lookupYouTubeChannelAction(parsed.data);
    setLookingUp(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    lastLookupUrl.current = result.url || parsed.data;
    setUrl(result.url || parsed.data);
    setTitle(result.title);
    setDescription(result.description);
  }

  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || lookingUp || pending) return;

    const parsed = youtubeUrlSchema.safeParse(trimmed);
    if (!parsed.success) return;
    if (lastLookupUrl.current === parsed.data) return;

    const timer = window.setTimeout(() => {
      void lookupFromUrl(parsed.data);
    }, 450);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce URL only
  }, [url]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      let payload = {
        title: title.trim(),
        url: url.trim(),
        description: description.trim() || undefined,
      };

      const urlParsed = youtubeUrlSchema.safeParse(payload.url);
      if (!urlParsed.success) {
        const failure = toValidationFailure(urlParsed.error);
        setError(failure.error);
        setFieldErrors(failure.fieldErrors);
        return;
      }

      if (!payload.title) {
        const lookedUp = await lookupYouTubeChannelAction(urlParsed.data);
        if ("error" in lookedUp) {
          setError(lookedUp.error);
          return;
        }
        payload = {
          title: lookedUp.title,
          url: lookedUp.url || urlParsed.data,
          description: payload.description || lookedUp.description || undefined,
        };
        setTitle(lookedUp.title);
        setDescription(lookedUp.description);
        setUrl(lookedUp.url || urlParsed.data);
      }

      const parsed = learnResourceInputSchema.safeParse(payload);
      if (!parsed.success) {
        const failure = toValidationFailure(parsed.error);
        setError(failure.error);
        setFieldErrors(failure.fieldErrors);
        return;
      }

      const result =
        mode === "edit" && resource
          ? await updateLearnResource(resource.id, parsed.data)
          : await createLearnResource(parsed.data);

      if (result && "error" in result) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      if (mode === "create") {
        setTitle("");
        setUrl("");
        setDescription("");
        setFieldErrors({});
        lastLookupUrl.current = null;
      }
      onDone?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-clay/30 bg-clay/5 p-3 text-sm text-clay">
          {error}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor={`learn-url-${mode}`}>
          YouTube URL <span className="text-clay">*</span>
        </label>
        <input
          id={`learn-url-${mode}`}
          type="url"
          maxLength={500}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => {
            if (url.trim()) void lookupFromUrl(url, true);
          }}
          placeholder="https://www.youtube.com/@channel"
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-court focus:ring-2 focus:ring-court/20"
        />
        <p className="mt-1.5 text-xs text-muted">
          {lookingUp
            ? "Looking up channel name and description…"
            : "Paste a channel link — name and description fill in automatically."}
        </p>
        {fieldErrors.url && (
          <p className="mt-1.5 text-sm text-clay">{fieldErrors.url}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor={`learn-title-${mode}`}>
          Channel name <span className="text-clay">*</span>
        </label>
        <input
          id={`learn-title-${mode}`}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={lookingUp ? "Fetching…" : "Filled from YouTube"}
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-court focus:ring-2 focus:ring-court/20"
        />
        {fieldErrors.title && (
          <p className="mt-1.5 text-sm text-clay">{fieldErrors.title}</p>
        )}
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-semibold"
          htmlFor={`learn-description-${mode}`}
        >
          Description
        </label>
        <textarea
          id={`learn-description-${mode}`}
          maxLength={500}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={lookingUp ? "Fetching…" : "Filled from YouTube"}
          className="w-full resize-y rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-court focus:ring-2 focus:ring-court/20"
        />
        {fieldErrors.description && (
          <p className="mt-1.5 text-sm text-clay">{fieldErrors.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || lookingUp}
          className="btn-court inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold disabled:opacity-60"
        >
          {pending
            ? mode === "edit"
              ? "Saving…"
              : "Adding…"
            : mode === "edit"
              ? "Save changes"
              : "Add channel"}
        </button>
        {mode === "edit" && onDone && (
          <button
            type="button"
            onClick={onDone}
            disabled={pending || lookingUp}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-5 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-60"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
