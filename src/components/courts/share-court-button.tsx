"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ShareCourtButton({
  name,
  slug,
  className,
}: {
  name: string;
  slug: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/courts/${slug}`
        : `/courts/${slug}`;
    const title = `${name} · Deuces`;
    const text = `Check out ${name} on Deuces`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // User cancelled the system share sheet — ignore.
      if (error instanceof DOMException && error.name === "AbortError") return;

      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        // Last resort: nothing available.
      }
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className={cn(
        "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:border-court/30 hover:bg-court/5",
        className,
      )}
    >
      <ShareIcon className="h-5 w-5" />
      {copied ? "Link copied" : "Share court"}
    </button>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}
