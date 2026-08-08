"use client";

import { useState, useTransition } from "react";
import { setFeedbackStatus } from "@/lib/actions/feedback";
import {
  BugIcon,
  CheckIcon,
  InboxIcon,
  SuggestionIcon,
} from "@/components/feedback/feedback-icons";
import type { FeedbackListItem } from "@/lib/queries/feedback";
import { cn } from "@/lib/utils";

export function AdminFeedbackList({ items }: { items: FeedbackListItem[] }) {
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered =
    filter === "all" ? items : items.filter((item) => item.status === filter);

  function toggleStatus(item: FeedbackListItem) {
    const next = item.status === "open" ? "resolved" : "open";
    setPendingId(item.id);
    setError(null);
    startTransition(async () => {
      const result = await setFeedbackStatus(item.id, next);
      if (result && "error" in result) {
        setError(result.error);
      }
      setPendingId(null);
    });
  }

  return (
    <section className="mt-8 md:mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-bold md:text-2xl">
            <InboxIcon className="text-court" />
            Bugs & suggestions
          </h2>
          <p className="mt-1 text-sm text-muted">
            {items.filter((i) => i.status === "open").length} open ·{" "}
            {items.length} total
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {(
            [
              ["open", "Open"],
              ["resolved", "Resolved"],
              ["all", "All"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === value
                  ? "bg-court/10 text-court"
                  : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-clay/30 bg-clay/5 p-3 text-sm text-clay">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          No {filter === "all" ? "" : filter} submissions yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const busy = pending && pendingId === item.id;
            const isBug = item.type === "bug";
            return (
              <li
                key={item.id}
                className={cn(
                  "rounded-2xl border bg-card p-4 md:p-5",
                  isBug ? "border-red-200" : "border-border",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        isBug
                          ? "bg-red-50 text-red-600"
                          : "bg-court/10 text-court",
                      )}
                    >
                      {isBug ? (
                        <BugIcon className="h-3 w-3" />
                      ) : (
                        <SuggestionIcon className="h-3 w-3" />
                      )}
                      {item.type}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        item.status === "open"
                          ? "bg-optic/80 text-night"
                          : "bg-foreground/5 text-muted",
                      )}
                    >
                      {item.status === "resolved" && (
                        <CheckIcon className="h-3 w-3" />
                      )}
                      {item.status}
                    </span>
                  </div>
                  <time className="text-xs text-muted" dateTime={item.createdAt}>
                    {formatWhen(item.createdAt)}
                  </time>
                </div>

                <h3 className="mt-2 font-display text-base font-semibold md:text-lg">
                  {item.title}
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {item.body}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted">
                  <div className="min-w-0">
                    <p className="truncate">
                      {item.userName ?? "Unknown user"}
                      {item.userEmail ? ` · ${item.userEmail}` : ""}
                    </p>
                    {item.pageUrl && (
                      <p className="mt-0.5 truncate">Page: {item.pageUrl}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleStatus(item)}
                    className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 font-semibold text-court disabled:opacity-50"
                  >
                    {item.status === "open" && !busy && (
                      <CheckIcon className="h-3.5 w-3.5" />
                    )}
                    {busy
                      ? "Saving…"
                      : item.status === "open"
                        ? "Mark resolved"
                        : "Reopen"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
