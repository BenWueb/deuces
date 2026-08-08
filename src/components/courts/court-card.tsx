import Image from "next/image";
import Link from "next/link";
import { TennisBallRating } from "@/components/ui/tennis-ball-rating";
import { needsInfo } from "@/lib/court-completeness";
import type { CourtListItem } from "@/lib/queries/courts";
import { cn, formatDistance, surfaceLabel } from "@/lib/utils";

type AmenityPill = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

function amenityPills(court: CourtListItem): AmenityPill[] {
  const pills: AmenityPill[] = [];

  if (court.surface) {
    pills.push({
      key: "surface",
      label: surfaceLabel(court.surface),
      icon: <SurfaceIcon />,
    });
  }
  if (court.courtCount != null) {
    pills.push({
      key: "courts",
      label: `${court.courtCount} court${court.courtCount !== 1 ? "s" : ""}`,
      icon: <CourtsIcon />,
    });
  }

  if (court.hasLights === true) {
    pills.push({ key: "lights", label: "Lights", icon: <LightsIcon /> });
  }
  if (court.isIndoor === true) {
    pills.push({ key: "indoor", label: "Indoor", icon: <IndoorIcon /> });
  }
  if (court.isFree === true) {
    pills.push({ key: "free", label: "Free", icon: <FreeIcon /> });
  }
  if (court.hasHittingWall === true) {
    pills.push({
      key: "wall",
      label: "Hitting wall",
      icon: <HittingWallIcon />,
    });
  }
  if (court.hasRestrooms === true) {
    pills.push({
      key: "restrooms",
      label: "Restrooms",
      icon: <RestroomsIcon />,
    });
  }

  return pills;
}

export function CourtCard({
  court,
  className,
}: {
  court: CourtListItem;
  className?: string;
}) {
  const pills = amenityPills(court);
  const infoNeeded = needsInfo({
    surface: court.surface,
    courtCount: court.courtCount,
    hasLights: court.hasLights,
    isIndoor: court.isIndoor,
    isFree: court.isFree,
    hasHittingWall: court.hasHittingWall,
    hasRestrooms: court.hasRestrooms,
    photoCount: court.photoUrl ? 1 : 0,
    importStatus: court.importStatus,
  });

  return (
    <Link href={`/courts/${court.slug}`} className={cn("block h-full", className)}>
      <article className="court-card h-full transition-transform active:scale-[0.98] md:hover:-translate-y-0.5">
        <div className="relative aspect-[16/10] bg-court/5">
          {court.photoUrl ? (
            <Image
              src={court.photoUrl}
              alt={court.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="font-display text-4xl font-bold text-court/20">
                DEUCES
              </span>
            </div>
          )}

          {infoNeeded && (
            <span className="absolute left-2 top-2 z-[1] rounded-full bg-clay px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              Info needed
            </span>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/55 via-night/20 to-transparent px-3 pb-3 pt-10">
            <ul className="flex flex-wrap gap-1.5">
              {pills.map((pill) => (
                <li
                  key={pill.key}
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-white to-white/90 px-2 py-1 text-[11px] font-semibold text-foreground shadow-[0_2px_8px_rgba(21,32,51,0.18)] backdrop-blur-sm"
                >
                  <span className="text-court" aria-hidden>
                    {pill.icon}
                  </span>
                  {pill.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-display text-lg font-semibold leading-tight">
            {court.name}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {court.city}
            {court.region ? `, ${court.region}` : ""}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TennisBallRating value={court.ratingAvg} size="sm" />
              <span className="text-xs text-muted">
                {court.ratingCount > 0
                  ? `${court.ratingAvg.toFixed(1)} (${court.ratingCount})`
                  : "No ratings yet"}
              </span>
            </div>
            {court.distanceMeters !== undefined && (
              <span className="text-xs font-medium text-court">
                {formatDistance(court.distanceMeters)}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

export function CourtCardSkeleton() {
  return (
    <div className="court-card overflow-hidden">
      <div className="aspect-[16/10] skeleton" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-3/4 skeleton rounded" />
        <div className="h-4 w-1/2 skeleton rounded" />
        <div className="h-4 w-1/3 skeleton rounded" />
      </div>
    </div>
  );
}

function iconProps(className = "h-3 w-3") {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function SurfaceIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h18M12 3v18" />
    </svg>
  );
}

function CourtsIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12c3-3 6-3 9 0s6 3 9 0" />
      <path d="M12 3v18" />
    </svg>
  );
}

function LightsIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.8V15h7v-1.2A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

function IndoorIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function FreeIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9.5c0-1.2 1.1-2 2.5-2S14 8.3 14 9.3c0 2-4 1.8-4 4.2M12 15.5v1.5" />
    </svg>
  );
}

function HittingWallIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 5h10v14H4Z" />
      <path d="M14 9h6v3l-3 2v5" />
    </svg>
  );
}

function RestroomsIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="8" cy="6" r="2.5" />
      <path d="M5 21v-5l-1.5-6h9L11 16v5" />
      <circle cx="17" cy="6" r="2.5" />
      <path d="M14.5 21v-7h5v7M14.5 12l1-4h3l1 4" />
    </svg>
  );
}
