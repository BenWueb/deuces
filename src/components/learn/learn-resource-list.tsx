"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  deleteLearnResource,
  moveLearnResource,
} from "@/lib/actions/learn";
import { LearnResourceForm } from "@/components/learn/learn-resource-form";
import type { LearnResourceListItem } from "@/lib/queries/learn";
import { cn } from "@/lib/utils";

export function LearnResourceList({
  items,
  isAdmin,
}: {
  items: LearnResourceListItem[];
  isAdmin: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runAction(
    id: string,
    action: () => Promise<{ error?: string; success?: true }>,
  ) {
    setPendingId(id);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
      setPendingId(null);
    });
  }

  if (items.length === 0) {
    return (
      <div className="court-card flex flex-col items-center px-6 py-12 text-center md:py-16">
        <p className="font-display text-lg font-semibold">No channels yet</p>
        <p className="mt-1 text-sm text-muted">
          {isAdmin
            ? "Add a YouTube channel above to get started."
            : "Check back soon — coaching links are on the way."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-clay/30 bg-clay/5 p-3 text-sm text-clay">
          {error}
        </div>
      )}

      <ul className="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
        {items.map((item, index) => {
          const busy = pending && pendingId === item.id;
          const editing = editingId === item.id;

          return (
            <li key={item.id} className="min-w-0">
              {editing ? (
                <div className="court-card p-4 md:p-5">
                  <LearnResourceForm
                    mode="edit"
                    resource={item}
                    onDone={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="flex h-full flex-col gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full"
                  >
                    <article className="court-card h-full transition-transform active:scale-[0.98] md:hover:-translate-y-0.5">
                      <div className="relative aspect-[16/10] bg-court/5">
                        {item.thumbnailUrl ? (
                          <Image
                            src={item.thumbnailUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#ff0000]/10 via-court/5 to-white">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff0000] text-white shadow-[0_6px_18px_rgba(204,0,0,0.35)]">
                              <YouTubeIcon className="h-7 w-7" />
                            </span>
                            <span className="font-display text-sm font-bold tracking-wide text-court/40">
                              YouTube
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/55 via-night/20 to-transparent px-3 pb-3 pt-10">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-white to-white/90 px-2 py-1 text-[11px] font-semibold text-foreground shadow-[0_2px_8px_rgba(21,32,51,0.18)] backdrop-blur-sm">
                            <span className="text-[#cc0000]" aria-hidden>
                              <YouTubeIcon className="h-3 w-3" />
                            </span>
                            Channel
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="font-display text-lg font-semibold leading-tight">
                          {item.title}
                          <span className="ml-1.5 text-sm font-medium text-muted">
                            ↗
                          </span>
                        </h3>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted">
                            {item.description}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-muted">
                            Open on YouTube
                          </p>
                        )}
                      </div>
                    </article>
                  </a>

                  {isAdmin && (
                    <div className="flex flex-wrap gap-2 px-0.5">
                      <button
                        type="button"
                        disabled={busy || index === 0}
                        onClick={() =>
                          runAction(item.id, () =>
                            moveLearnResource(item.id, "up"),
                          )
                        }
                        className={cn(
                          "rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted hover:text-foreground disabled:opacity-40",
                        )}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        disabled={busy || index === items.length - 1}
                        onClick={() =>
                          runAction(item.id, () =>
                            moveLearnResource(item.id, "down"),
                          )
                        }
                        className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted hover:text-foreground disabled:opacity-40"
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditingId(item.id)}
                        className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted hover:text-foreground disabled:opacity-40"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            !confirm(
                              `Remove “${item.title}” from Learn Tennis?`,
                            )
                          ) {
                            return;
                          }
                          runAction(item.id, () =>
                            deleteLearnResource(item.id),
                          );
                        }}
                        className="rounded-full border border-clay/30 px-3 py-1 text-xs font-semibold text-clay hover:bg-clay/5 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.75 15.5v-7l6.5 3.5-6.5 3.5Z" />
    </svg>
  );
}
