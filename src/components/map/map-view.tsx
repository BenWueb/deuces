"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { CourtListItem } from "@/lib/queries/courts";
import { TennisBallRating } from "@/components/ui/tennis-ball-rating";
import { DEFAULT_CENTER, useUserLocation } from "@/lib/hooks/use-user-location";
import { surfaceLabel } from "@/lib/utils";

const CourtMapInner = dynamic(
  () => import("./court-map").then((m) => m.CourtMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-court/5">
        <p className="text-sm text-muted">Loading map...</p>
      </div>
    ),
  },
);

export function MapView() {
  const [courts, setCourts] = useState<CourtListItem[]>([]);
  const [selected, setSelected] = useState<CourtListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { location, status, request } = useUserLocation();
  const lastBounds = useRef<string | null>(null);

  const fetchBounds = useCallback(
    async (bounds: {
      west: number;
      south: number;
      east: number;
      north: number;
    }) => {
      const key = [bounds.west, bounds.south, bounds.east, bounds.north]
        .map((n) => n.toFixed(3))
        .join(",");
      if (lastBounds.current === key) return;
      lastBounds.current = key;

      try {
        const res = await fetch(`/api/courts?bounds=${key}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load courts");
        setCourts(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load courts");
      }
    },
    [],
  );

  useEffect(() => {
    if (status === "loading") return;

    const [lat, lng] = location ?? DEFAULT_CENTER;
    const delta = 0.15;
    fetchBounds({
      west: lng - delta,
      south: lat - delta,
      east: lng + delta,
      north: lat + delta,
    });
  }, [location, status, fetchBounds]);

  return (
    <div className="relative h-full md:h-[calc(100dvh-16rem)]">
      <CourtMapInner
        courts={courts}
        center={location ?? DEFAULT_CENTER}
        focusTarget={
          selected ? [selected.lat, selected.lng] : null
        }
        userLocation={location}
        onBoundsChange={fetchBounds}
        onSelectCourt={setSelected}
      />

      {status === "denied" && (
        <button
          type="button"
          onClick={request}
          className="absolute left-4 top-4 z-[1000] min-h-11 rounded-xl bg-card px-4 text-sm font-semibold text-court shadow-lg md:left-8 md:top-6"
        >
          Use my location
        </button>
      )}

      {error && (
        <div className="absolute left-4 right-4 top-4 z-[1000] rounded-xl bg-clay/90 px-4 py-2 text-sm text-white md:left-8 md:right-auto md:top-6 md:max-w-md">
          {error}
        </div>
      )}

      {selected && (
        <div className="absolute inset-x-4 bottom-4 z-[1000] mx-auto max-w-md rounded-2xl border border-border bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_12px_40px_rgba(21,32,51,0.18)] md:inset-x-auto md:bottom-8 md:left-8 md:w-full md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-clay">
                {surfaceLabel(selected.surface)}
              </span>
              <h3 className="font-display text-lg font-semibold md:text-xl">
                {selected.name}
              </h3>
              <p className="text-sm text-muted">
                {selected.city}
                {selected.region ? `, ${selected.region}` : ""}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <TennisBallRating value={selected.ratingAvg} size="sm" />
                <span className="text-xs text-muted">
                  {selected.ratingCount > 0
                    ? selected.ratingAvg.toFixed(1)
                    : "Unrated"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="min-h-11 min-w-11 rounded-full text-muted hover:bg-foreground/5"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <Link
            href={`/courts/${selected.slug}`}
            className="btn-optic mt-4 flex min-h-11 w-full items-center justify-center rounded-xl font-semibold"
          >
            View court
          </Link>
        </div>
      )}
    </div>
  );
}
