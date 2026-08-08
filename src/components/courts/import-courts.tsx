"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { importCourtsFromPlaces } from "@/lib/actions/courts";
import type { ImportCandidate } from "@/lib/import/types";
import { useUserLocation } from "@/lib/hooks/use-user-location";
import { cn, formatDistance } from "@/lib/utils";

export function ImportCourts() {
  const [query, setQuery] = useState("");
  const [courts, setCourts] = useState<ImportCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { location, status: locationStatus, request: requestLocation } =
    useUserLocation();

  const importable = useMemo(
    () => courts.filter((court) => !court.alreadyImported),
    [courts],
  );

  const selectedImportable = useMemo(
    () => importable.filter((court) => selected.has(court.sourceId)),
    [importable, selected],
  );

  const allSelected =
    importable.length > 0 && selectedImportable.length === importable.length;

  useEffect(() => {
    if (locationStatus === "loading") return;
    if (location) {
      void loadNearby(location[0], location[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once location settles
  }, [locationStatus, location?.[0], location?.[1]]);

  function replaceCourts(next: ImportCandidate[]) {
    setCourts(next);
    setSelected(new Set());
    setSuccess(null);
  }

  async function loadNearby(lat: number, lng: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/import/courts?lat=${lat}&lng=${lng}&radius=32187`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      replaceCourts(data.courts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/import/courts?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      replaceCourts(data.courts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleOne(sourceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(importable.map((court) => court.sourceId)));
  }

  function handleBulkImport() {
    if (selectedImportable.length === 0) {
      setError("Select at least one court to import.");
      return;
    }

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await importCourtsFromPlaces(selectedImportable);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      const parts = [
        result.imported > 0
          ? `Imported ${result.imported} court${result.imported === 1 ? "" : "s"}`
          : null,
        result.skipped > 0 ? `${result.skipped} already in Deuces` : null,
        result.failed > 0 ? `${result.failed} failed` : null,
      ].filter(Boolean);

      setSuccess(parts.join(" · ") || "Done.");
      setCourts((prev) =>
        prev.map((court) =>
          result.importedIds.includes(court.sourceId)
            ? { ...court, alreadyImported: true }
            : court,
        ),
      );
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            if (location) {
              void loadNearby(location[0], location[1]);
              return;
            }
            requestLocation();
          }}
          disabled={locationStatus === "loading" || loading || pending}
          className="btn-court flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold disabled:opacity-60"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
          </svg>
          {locationStatus === "loading"
            ? "Getting location…"
            : "Find courts nearby"}
        </button>
        <Link
          href="/courts/new"
          className="flex min-h-12 items-center justify-center rounded-2xl border border-border px-4 text-sm font-semibold text-court"
        >
          Add manually instead
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or place…"
          className="h-12 min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 text-sm outline-none ring-court/30 focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading || pending}
          className="btn-court min-h-12 shrink-0 rounded-2xl px-5 text-sm font-semibold disabled:opacity-60"
        >
          Search
        </button>
      </form>

      <p className="text-xs text-muted">
        Results come from Google Places. Imports create drafts you can finish
        editing later.
      </p>

      {error && (
        <div className="rounded-2xl border border-clay/30 bg-clay/5 p-4 text-sm text-clay">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-court/25 bg-court/5 p-4 text-sm text-court">
          {success}
        </div>
      )}

      {loading ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="h-24 skeleton rounded-2xl" />
          ))}
        </ul>
      ) : courts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/60 px-6 py-12 text-center">
          <h2 className="font-display text-lg font-semibold">No courts found</h2>
          <p className="mt-2 text-sm text-muted">
            Try nearby search with location enabled, or a different place name.
          </p>
        </div>
      ) : (
        <>
          <div className="sticky top-16 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white/95 px-3 py-3 shadow-sm backdrop-blur md:top-20">
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={allSelected}
                disabled={importable.length === 0 || pending}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-border text-court focus:ring-court/30"
              />
              Select all
              <span className="font-medium text-muted">
                ({importable.length} available)
              </span>
            </label>

            <button
              type="button"
              onClick={handleBulkImport}
              disabled={selectedImportable.length === 0 || pending}
              className="btn-optic inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold disabled:opacity-50"
            >
              {pending
                ? "Importing…"
                : `Import selected (${selectedImportable.length})`}
            </button>
          </div>

          <ul className="space-y-3">
            {courts.map((court) => {
              const isSelected = selected.has(court.sourceId);
              const disabled = !!court.alreadyImported || pending;

              return (
                <li key={court.sourceId}>
                  <label
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border bg-card p-3 transition-colors",
                      court.alreadyImported
                        ? "border-border opacity-70"
                        : isSelected
                          ? "border-court/40 bg-court/5"
                          : "border-border hover:border-court/25",
                      court.alreadyImported && "cursor-default",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => toggleOne(court.sourceId)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border text-court focus:ring-court/30 disabled:opacity-40"
                    />

                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-court/5">
                      {court.photoUrl ? (
                        <Image
                          src={court.photoUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="96px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] font-semibold text-court/40">
                          No photo
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-display truncate text-base font-semibold">
                        {court.name}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {court.address}
                        {court.city ? ` · ${court.city}` : ""}
                      </p>
                      {court.distanceMeters !== undefined && (
                        <p className="mt-1 text-xs font-medium text-court">
                          {formatDistance(court.distanceMeters)}
                        </p>
                      )}
                      {court.alreadyImported && (
                        <span className="mt-2 inline-flex min-h-8 items-center rounded-xl bg-foreground/5 px-3 text-xs font-semibold text-muted">
                          Already in Deuces
                        </span>
                      )}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
