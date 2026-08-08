"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PhotoCarousel({
  photos,
  addPhotoHref,
  className,
}: {
  photos: { url: string; id: string }[];
  addPhotoHref?: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className={cn("relative aspect-[4/3] bg-court/10", className)}>
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="font-display text-5xl font-bold text-court/20">
            DEUCES
          </span>
          {addPhotoHref && (
            <Link
              href={addPhotoHref}
              className="rounded-xl border border-court/30 bg-white/80 px-4 py-2 text-sm font-semibold text-court"
            >
              Add a photo
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative aspect-[4/3] bg-black", className)}>
      <Image
        src={photos[index].url}
        alt={`Court photo ${index + 1}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 640px"
        priority
      />
      {photos.length > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-optic" : "w-1.5 bg-white/50",
                )}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIndex((i) => (i > 0 ? i - 1 : photos.length - 1))}
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i < photos.length - 1 ? i + 1 : 0))}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
