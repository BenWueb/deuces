import { cn } from "@/lib/utils";

const amenities = [
  { key: "hasLights", label: "Lights", icon: "💡" },
  { key: "isIndoor", label: "Indoor", icon: "🏠" },
  { key: "isFree", label: "Free", icon: "🆓" },
  { key: "hasHittingWall", label: "Hitting wall", icon: "🧱" },
  { key: "hasRestrooms", label: "Restrooms", icon: "🚻" },
] as const;

type CourtAmenities = {
  hasLights?: boolean | null;
  isIndoor?: boolean | null;
  isFree?: boolean | null;
  hasHittingWall?: boolean | null;
  hasRestrooms?: boolean | null;
  feeNotes?: string | null;
  courtCount?: number | null;
  surface?: string | null;
};

export function AmenitiesGrid({
  court,
  contributeAction,
}: {
  court: CourtAmenities;
  contributeAction?: React.ReactNode;
}) {
  const hasUnknownAmenities =
    amenities.some(({ key }) => court[key] == null) || court.courtCount == null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {amenities.map(({ key, label, icon }) => {
          const value = court[key];
          const unknown = value == null;
          const active = value === true;
          return (
            <div
              key={key}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-3 text-sm",
                unknown
                  ? "border-dashed border-border bg-card/40 text-muted"
                  : active
                    ? "border-court/20 bg-court/5 text-foreground"
                    : "border-border bg-card/50 text-muted line-through opacity-50",
              )}
            >
              <span>{icon}</span>
              <span className="font-medium">
                {label}
                {unknown ? (
                  <span className="ml-1 font-normal text-muted">· Unknown</span>
                ) : null}
              </span>
            </div>
          );
        })}
        {court.courtCount != null ? (
          <div className="flex items-center gap-2 rounded-xl border border-court/20 bg-court/5 px-3 py-3 text-sm">
            <span>🎾</span>
            <span className="font-medium">
              {court.courtCount} court{court.courtCount !== 1 ? "s" : ""}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-3 py-3 text-sm text-muted">
            <span>🎾</span>
            <span className="font-medium">
              Courts <span className="font-normal">· Unknown</span>
            </span>
          </div>
        )}
        {court.isFree === false && court.feeNotes && (
          <div className="col-span-full rounded-xl border border-clay/20 bg-clay/5 px-3 py-3 text-sm">
            <span className="font-medium text-clay">Fee: </span>
            {court.feeNotes}
          </div>
        )}
      </div>
      {contributeAction && hasUnknownAmenities && (
        <div className="pt-1">{contributeAction}</div>
      )}
    </div>
  );
}
