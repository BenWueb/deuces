"use client";

import { useState, useTransition } from "react";
import { deleteCourt } from "@/lib/actions/courts";
import { cn } from "@/lib/utils";

export function DeleteCourtButton({
  courtId,
  courtName,
  variant = "panel",
}: {
  courtId: string;
  courtName: string;
  variant?: "panel" | "inline";
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCourt(courtId);
      if ("error" in result) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-stretch gap-1">
        {error && <p className="text-center text-xs text-clay">{error}</p>}
        {confirming ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="flex min-h-11 items-center justify-center rounded-xl bg-clay px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-clay/40 px-4 text-sm font-semibold text-clay transition-colors hover:bg-clay/5"
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-clay/30 bg-clay/5 p-4">
      <h2 className="font-display text-sm font-bold text-clay">Danger zone</h2>
      <p className="mt-1 text-xs text-muted">
        Deleting {courtName} also removes its photos, ratings and comments. This
        cannot be undone.
      </p>

      {error && <p className="mt-3 text-sm text-clay">{error}</p>}

      {confirming ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="min-h-11 flex-1 rounded-xl bg-clay text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Deleting..." : "Yes, delete permanently"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-muted"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 min-h-11 w-full rounded-xl border border-clay/40 text-sm font-semibold text-clay"
        >
          Delete this court
        </button>
      )}
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
