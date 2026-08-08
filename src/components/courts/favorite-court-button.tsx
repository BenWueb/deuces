"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFavoriteCourt } from "@/lib/actions/courts";
import { cn } from "@/lib/utils";

export function FavoriteCourtButton({
  courtId,
  initialFavorited,
  signedIn,
  className,
}: {
  courtId: string;
  initialFavorited: boolean;
  signedIn: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(pathname || "/")}`}
        className={cn(
          "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:border-court/30 hover:bg-court/5",
          className,
        )}
      >
        <HeartIcon className="h-5 w-5" filled={false} />
        Favorite court
      </Link>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          const next = !favorited;
          setFavorited(next);
          startTransition(async () => {
            const result = await toggleFavoriteCourt(courtId);
            if ("error" in result && result.error) {
              setFavorited(!next);
              setError(result.error);
              return;
            }
            if (typeof result.favorited === "boolean") {
              setFavorited(result.favorited);
            }
          });
        }}
        className={cn(
          "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition-colors disabled:opacity-60",
          favorited
            ? "border-clay/30 bg-clay/10 text-clay hover:bg-clay/15"
            : "border-border bg-white text-foreground hover:border-court/30 hover:bg-court/5",
        )}
      >
        <HeartIcon className="h-5 w-5" filled={favorited} />
        {favorited ? "Favorited" : "Favorite court"}
      </button>
      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
    </div>
  );
}

function HeartIcon({
  className,
  filled,
}: {
  className?: string;
  filled: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
