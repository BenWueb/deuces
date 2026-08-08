"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CourtCard, CourtCardSkeleton } from "@/components/courts/court-card";
import { PageHeader } from "@/components/layout/page-header";
import type { CourtListItem } from "@/lib/queries/courts";
import { useUserLocation } from "@/lib/hooks/use-user-location";
import { cn } from "@/lib/utils";
import { SURFACES, type Surface } from "@/lib/validation/schemas";

type AmenityFilter = "hasLights" | "hasRestrooms" | "hasHittingWall";
type SettingFilter = "indoor" | "outdoor";
type PriceFilter = "free" | "paid";
type MinCourts = 0 | 2 | 4 | 6;
type MinRating = 0 | 3 | 4 | 4.5;
type MaxDistanceMiles = 0 | 5 | 10 | 25;

const AMENITY_FILTERS: { key: AmenityFilter; label: string }[] = [
  { key: "hasLights", label: "Lights" },
  { key: "hasRestrooms", label: "Restrooms" },
  { key: "hasHittingWall", label: "Hitting wall" },
];

const SURFACE_LABELS: Record<Surface, string> = {
  hard: "Hard",
  clay: "Clay",
  grass: "Grass",
  carpet: "Carpet",
};

type SortOption = "distance" | "rating" | "name" | "courts";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "distance", label: "Nearest" },
  { value: "rating", label: "Highest rated" },
  { value: "name", label: "Name A–Z" },
  { value: "courts", label: "Most courts" },
];

const MILES_TO_METERS = 1609.344;
const PAGE_SIZE = 24;

export function ExploreCourts() {
  const [courts, setCourts] = useState<CourtListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [amenities, setAmenities] = useState<AmenityFilter[]>([]);
  const [settings, setSettings] = useState<SettingFilter[]>([]);
  const [prices, setPrices] = useState<PriceFilter[]>([]);
  const [minCourts, setMinCourts] = useState<MinCourts>(0);
  const [minRating, setMinRating] = useState<MinRating>(0);
  const [maxDistanceMiles, setMaxDistanceMiles] = useState<MaxDistanceMiles>(0);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasRatings, setHasRatings] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("distance");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { location, status: locationStatus, request: requestLocation } =
    useUserLocation();

  const fetchCourts = useCallback(async (lat?: number, lng?: number) => {
    setLoading(true);
    setError(null);
    try {
      // ~100 mile radius so metro imports aren’t cut off by a tight nearby search.
      const url =
        lat !== undefined && lng !== undefined
          ? `/api/courts?lat=${lat}&lng=${lng}&radius=160934`
          : "/api/courts";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load courts");
      setCourts(data);
      setVisibleCount(PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (locationStatus === "loading") return;
    if (location) fetchCourts(location[0], location[1]);
    else fetchCourts();
  }, [location, locationStatus, fetchCourts]);

  const activeFilterCount =
    surfaces.length +
    amenities.length +
    settings.length +
    prices.length +
    (minCourts > 0 ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (maxDistanceMiles > 0 ? 1 : 0) +
    (hasPhoto ? 1 : 0) +
    (hasRatings ? 1 : 0);

  const hasDistance = courts.some((c) => c.distanceMeters !== undefined);

  useEffect(() => {
    if (sortBy === "distance" && !hasDistance && courts.length > 0) {
      setSortBy("rating");
    }
    if (maxDistanceMiles > 0 && !hasDistance) {
      setMaxDistanceMiles(0);
    }
  }, [sortBy, hasDistance, courts.length, maxDistanceMiles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const maxDistanceMeters =
      maxDistanceMiles > 0 ? maxDistanceMiles * MILES_TO_METERS : null;

    const matches = courts.filter((court) => {
      if (q) {
        const matchesSearch =
          court.name.toLowerCase().includes(q) ||
          court.city.toLowerCase().includes(q) ||
          court.address.toLowerCase().includes(q) ||
          (court.region?.toLowerCase().includes(q) ?? false);
        if (!matchesSearch) return false;
      }

      if (
        surfaces.length > 0 &&
        (!court.surface || !surfaces.includes(court.surface as Surface))
      ) {
        return false;
      }

      for (const key of amenities) {
        if (court[key] !== true) return false;
      }

      if (settings.length > 0) {
        const indoorOk =
          settings.includes("indoor") && court.isIndoor === true;
        const outdoorOk =
          settings.includes("outdoor") && court.isIndoor === false;
        if (!indoorOk && !outdoorOk) return false;
      }

      if (prices.length > 0) {
        const freeOk = prices.includes("free") && court.isFree === true;
        const paidOk = prices.includes("paid") && court.isFree === false;
        if (!freeOk && !paidOk) return false;
      }

      if (minCourts > 0 && (court.courtCount ?? 0) < minCourts) {
        return false;
      }

      if (minRating > 0 && court.ratingAvg < minRating) {
        return false;
      }

      if (
        maxDistanceMeters != null &&
        (court.distanceMeters == null ||
          court.distanceMeters > maxDistanceMeters)
      ) {
        return false;
      }

      if (hasPhoto && !court.photoUrl) return false;
      if (hasRatings && court.ratingCount < 1) return false;

      return true;
    });

    const sorted = [...matches];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "distance":
          return (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
        case "rating":
          if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
          return b.ratingCount - a.ratingCount;
        case "name":
          return a.name.localeCompare(b.name);
        case "courts":
          return (b.courtCount ?? 0) - (a.courtCount ?? 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [
    courts,
    search,
    surfaces,
    amenities,
    settings,
    prices,
    minCourts,
    minRating,
    maxDistanceMiles,
    hasPhoto,
    hasRatings,
    sortBy,
  ]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    search,
    surfaces,
    amenities,
    settings,
    prices,
    minCourts,
    minRating,
    maxDistanceMiles,
    hasPhoto,
    hasRatings,
    sortBy,
  ]);

  const visibleCourts = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  function toggleInList<T>(value: T, list: T[], setList: (next: T[]) => void) {
    setList(
      list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value],
    );
  }

  function clearFilters() {
    setSurfaces([]);
    setAmenities([]);
    setSettings([]);
    setPrices([]);
    setMinCourts(0);
    setMinRating(0);
    setMaxDistanceMiles(0);
    setHasPhoto(false);
    setHasRatings(false);
  }

  return (
    <div className="px-4 pt-4 md:px-0 md:pt-8">
      <PageHeader
        title="Explore courts"
        subtitle="Find your next match"
        actions={
          <Link
            href="/courts/new"
            className="btn-optic inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-bold text-night shadow-[0_4px_14px_rgba(212,245,66,0.35)]"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add court
          </Link>
        }
      />

      <div className="sticky top-14 z-10 -mx-4 bg-background/90 px-4 py-3 backdrop-blur-md md:top-[calc(4rem+0.75rem)] md:mx-auto md:max-w-4xl md:rounded-2xl md:border md:border-border md:bg-card/90 md:px-4 md:shadow-[0_8px_28px_rgba(21,32,51,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search courts, cities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm outline-none ring-court/30 focus:ring-2 md:border-transparent md:bg-background"
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold md:min-h-12",
                filtersOpen || activeFilterCount > 0
                  ? "border-court/30 bg-court/10 text-court"
                  : "border-border bg-card text-foreground md:bg-background",
              )}
              aria-expanded={filtersOpen}
            >
              <FilterIcon className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-court px-1.5 text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {locationStatus !== "granted" && (
              <button
                type="button"
                onClick={requestLocation}
                disabled={locationStatus === "loading"}
                className="btn-court flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold disabled:opacity-60 md:min-h-12 md:px-5"
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
                <span className="hidden sm:inline">
                  {locationStatus === "loading"
                    ? "Finding nearby..."
                    : "Use my location"}
                </span>
                <span className="sm:hidden">
                  {locationStatus === "loading" ? "…" : "Near me"}
                </span>
              </button>
            )}
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-3 max-h-[min(60vh,28rem)] space-y-3 overflow-y-auto border-t border-border/70 pt-3">
            <FilterSection title="Sort by">
              {SORT_OPTIONS.filter(
                (option) => option.value !== "distance" || hasDistance,
              ).map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={sortBy === option.value}
                  onClick={() => setSortBy(option.value)}
                />
              ))}
            </FilterSection>

            {hasDistance && (
              <FilterSection title="Distance">
                {(
                  [
                    [0, "Any"],
                    [5, "Within 5 mi"],
                    [10, "Within 10 mi"],
                    [25, "Within 25 mi"],
                  ] as const
                ).map(([value, label]) => (
                  <FilterChip
                    key={value}
                    label={label}
                    active={maxDistanceMiles === value}
                    onClick={() => setMaxDistanceMiles(value)}
                  />
                ))}
              </FilterSection>
            )}

            <FilterSection title="Surface">
              {SURFACES.map((surface) => (
                <FilterChip
                  key={surface}
                  label={SURFACE_LABELS[surface]}
                  active={surfaces.includes(surface)}
                  onClick={() => toggleInList(surface, surfaces, setSurfaces)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Setting">
              {(
                [
                  ["indoor", "Indoor"],
                  ["outdoor", "Outdoor"],
                ] as const
              ).map(([value, label]) => (
                <FilterChip
                  key={value}
                  label={label}
                  active={settings.includes(value)}
                  onClick={() => toggleInList(value, settings, setSettings)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Price">
              {(
                [
                  ["free", "Free"],
                  ["paid", "Paid"],
                ] as const
              ).map(([value, label]) => (
                <FilterChip
                  key={value}
                  label={label}
                  active={prices.includes(value)}
                  onClick={() => toggleInList(value, prices, setPrices)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Amenities">
              {AMENITY_FILTERS.map(({ key, label }) => (
                <FilterChip
                  key={key}
                  label={label}
                  active={amenities.includes(key)}
                  onClick={() => toggleInList(key, amenities, setAmenities)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Court count">
              {(
                [
                  [0, "Any"],
                  [2, "2+"],
                  [4, "4+"],
                  [6, "6+"],
                ] as const
              ).map(([value, label]) => (
                <FilterChip
                  key={value}
                  label={label}
                  active={minCourts === value}
                  onClick={() => setMinCourts(value)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Rating">
              {(
                [
                  [0, "Any"],
                  [3, "3+"],
                  [4, "4+"],
                  [4.5, "4.5+"],
                ] as const
              ).map(([value, label]) => (
                <FilterChip
                  key={value}
                  label={label}
                  active={minRating === value}
                  onClick={() => setMinRating(value)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Extras">
              <FilterChip
                label="Has photo"
                active={hasPhoto}
                onClick={() => setHasPhoto((v) => !v)}
              />
              <FilterChip
                label="Has ratings"
                active={hasRatings}
                onClick={() => setHasRatings((v) => !v)}
              />
            </FilterSection>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-court underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-clay/30 bg-clay/5 p-4 text-sm text-clay md:mx-auto md:max-w-3xl">
          {error.includes("DATABASE_URL") ? (
            <>
              Database not configured yet. Add{" "}
              <code className="text-xs">DATABASE_URL</code> to{" "}
              <code className="text-xs">.env.local</code> and run migrations to
              see courts.
            </>
          ) : (
            error
          )}
        </div>
      )}

      {!loading && (
        <p className="mt-4 text-sm text-muted md:mx-auto md:max-w-4xl">
          {filtered.length} court{filtered.length === 1 ? "" : "s"}
          {activeFilterCount > 0 || search ? " match" : ""}
          {" · "}
          sorted by{" "}
          {SORT_OPTIONS.find((o) => o.value === sortBy)?.label.toLowerCase()}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <CourtCardSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3">
            <EmptyState
              hasQuery={search.length > 0 || activeFilterCount > 0}
              onClearFilters={
                activeFilterCount > 0 || search
                  ? () => {
                      setSearch("");
                      clearFilters();
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          visibleCourts.map((court) => (
            <CourtCard key={court.id} court={court} />
          ))
        )}
      </div>

      {!loading && hasMore && (
        <div className="flex flex-col items-center gap-2 pb-8 pt-6">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="btn-court inline-flex min-h-12 items-center justify-center rounded-2xl px-8 text-sm font-bold"
          >
            Load more
          </button>
          <p className="text-xs text-muted">
            Showing {visibleCourts.length} of {filtered.length}
          </p>
        </div>
      )}

      {!loading && !hasMore && filtered.length > PAGE_SIZE && (
        <p className="pb-8 pt-6 text-center text-xs text-muted">
          Showing all {filtered.length} courts
        </p>
      )}
    </div>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full border px-3 text-sm font-semibold transition-colors",
        active
          ? "border-court/30 bg-court/10 text-court"
          : "border-border bg-card text-muted hover:border-court/20 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function FilterIcon({ className }: { className?: string }) {
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
      <path d="M4 5h16M7 12h10M10 19h4" />
    </svg>
  );
}

function EmptyState({
  hasQuery,
  onClearFilters,
}: {
  hasQuery: boolean;
  onClearFilters?: () => void;
}) {
  return (
    <div className="court-card flex flex-col items-center px-6 py-12 text-center md:py-16">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-court/10">
        <svg
          className="h-8 w-8 text-court"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      </div>
      <h3 className="font-display text-lg font-semibold">
        {hasQuery ? "No courts match your filters" : "No courts yet"}
      </h3>
      <p className="mt-2 text-sm text-muted">
        {hasQuery
          ? "Try adjusting search or filters."
          : "Be the first to add a court in your area."}
      </p>
      {hasQuery && onClearFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="btn-court mt-5 flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
        >
          Clear search & filters
        </button>
      ) : !hasQuery ? (
        <Link
          href="/courts/new"
          className="btn-court mt-5 flex min-h-11 w-full max-w-sm items-center justify-center rounded-2xl px-4 text-sm font-semibold"
        >
          Add a court
        </Link>
      ) : null}
    </div>
  );
}
