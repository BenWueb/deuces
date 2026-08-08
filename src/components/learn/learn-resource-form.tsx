"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLearnResource,
  lookupYouTubeChannelAction,
  lookupYouTubeVideoAction,
  updateLearnResource,
} from "@/lib/actions/learn";
import {
  LEARN_VIDEO_CATEGORIES,
  LEARN_VIDEO_CATEGORY_LABELS,
  learnResourceInputSchema,
  toValidationFailure,
  youtubeUrlSchema,
  type FieldErrors,
  type LearnResourceKindInput,
  type LearnVideoCategoryInput,
} from "@/lib/validation/schemas";
import { cn } from "@/lib/utils";

export function LearnResourceForm({
  mode = "create",
  kind: initialKind = "channel",
  resource,
  onDone,
}: {
  mode?: "create" | "edit";
  kind?: LearnResourceKindInput;
  resource?: {
    id: string;
    kind: LearnResourceKindInput;
    category: LearnVideoCategoryInput | null;
    title: string;
    url: string;
    description: string | null;
  };
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [kind, setKind] = useState<LearnResourceKindInput>(
    resource?.kind ?? initialKind,
  );
  const [category, setCategory] = useState<LearnVideoCategoryInput | "">(
    resource?.category ?? "",
  );
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

    const result =
      kind === "video"
        ? await lookupYouTubeVideoAction(parsed.data)
        : await lookupYouTubeChannelAction(parsed.data);
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
  }, [url, kind]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      let payload = {
        kind,
        category: kind === "video" ? category || null : null,
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
        const lookedUp =
          kind === "video"
            ? await lookupYouTubeVideoAction(urlParsed.data)
            : await lookupYouTubeChannelAction(urlParsed.data);
        if ("error" in lookedUp) {
          setError(lookedUp.error);
          return;
        }
        payload = {
          ...payload,
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
        setCategory("");
        setFieldErrors({});
        lastLookupUrl.current = null;
      }
      router.refresh();
      onDone?.();
    });
  }

  const isVideo = kind === "video";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-clay/30 bg-clay/5 p-3 text-sm text-clay">
          {error}
        </div>
      )}

      {mode === "create" && (
        <div className="flex gap-2 rounded-2xl bg-white/70 p-1">
          {(
            [
              ["channel", "Channel"],
              ["video", "Video"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setKind(value);
                lastLookupUrl.current = null;
                setError(null);
              }}
              className={cn(
                "min-h-10 flex-1 rounded-xl text-sm font-semibold transition-colors",
                kind === value
                  ? "bg-court text-white shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {isVideo && (
        <div>
          <label
            className="mb-2 block text-sm font-semibold"
            htmlFor={`learn-category-${mode}`}
          >
            Category <span className="text-clay">*</span>
          </label>
          <select
            id={`learn-category-${mode}`}
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as LearnVideoCategoryInput | "")
            }
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-court focus:ring-2 focus:ring-court/20"
          >
            <option value="">Choose a category</option>
            {LEARN_VIDEO_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {LEARN_VIDEO_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
          {fieldErrors.category && (
            <p className="mt-1.5 text-sm text-clay">{fieldErrors.category}</p>
          )}
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
          placeholder={
            isVideo
              ? "https://www.youtube.com/watch?v=…"
              : "https://www.youtube.com/@channel"
          }
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-court focus:ring-2 focus:ring-court/20"
        />
        <p className="mt-1.5 text-xs text-muted">
          {lookingUp
            ? isVideo
              ? "Looking up video title and description…"
              : "Looking up channel name and description…"
            : isVideo
              ? "Paste a video link — title and description fill in automatically."
              : "Paste a channel link — name and description fill in automatically."}
        </p>
        {fieldErrors.url && (
          <p className="mt-1.5 text-sm text-clay">{fieldErrors.url}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor={`learn-title-${mode}`}>
          {isVideo ? "Video title" : "Channel name"}{" "}
          <span className="text-clay">*</span>
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
              : isVideo
                ? "Add video"
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
