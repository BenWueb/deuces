export type CompletenessField =
  | "description"
  | "surface"
  | "courtCount"
  | "hasLights"
  | "isIndoor"
  | "isFree"
  | "hasHittingWall"
  | "hasRestrooms"
  | "photos";

export type CompletenessInput = {
  description?: string | null;
  surface?: string | null;
  courtCount?: number | null;
  hasLights?: boolean | null;
  isIndoor?: boolean | null;
  isFree?: boolean | null;
  hasHittingWall?: boolean | null;
  hasRestrooms?: boolean | null;
  photoCount?: number;
  importStatus?: "draft" | "complete" | null;
};

const LABELS: Record<CompletenessField, string> = {
  description: "Description",
  surface: "Surface",
  courtCount: "Court count",
  hasLights: "Lights",
  isIndoor: "Indoor / outdoor",
  isFree: "Free to play",
  hasHittingWall: "Hitting wall",
  hasRestrooms: "Restrooms",
  photos: "Photos",
};

export function missingCourtFields(
  court: CompletenessInput,
): CompletenessField[] {
  const missing: CompletenessField[] = [];

  if (!court.description?.trim()) missing.push("description");
  if (!court.surface) missing.push("surface");
  if (court.courtCount == null) missing.push("courtCount");
  if (court.hasLights == null) missing.push("hasLights");
  if (court.isIndoor == null) missing.push("isIndoor");
  if (court.isFree == null) missing.push("isFree");
  if (court.hasHittingWall == null) missing.push("hasHittingWall");
  if (court.hasRestrooms == null) missing.push("hasRestrooms");
  if ((court.photoCount ?? 0) < 1) missing.push("photos");

  return missing;
}

export function isCourtComplete(court: CompletenessInput): boolean {
  return missingCourtFields(court).length === 0;
}

/** Draft imports or unknown structural fields (amenities/surface/count/photos). */
export function needsInfo(court: CompletenessInput): boolean {
  if (court.importStatus === "draft") return true;
  return missingCourtFields(court).some((field) => field !== "description");
}

/** Fields the community can fill without opening full court edit. */
export type ContributableField = Exclude<
  CompletenessField,
  "description" | "photos"
>;

export function missingContributableFields(
  court: CompletenessInput,
): ContributableField[] {
  return missingCourtFields(court).filter(
    (field): field is ContributableField =>
      field !== "description" && field !== "photos",
  );
}

export function fieldLabel(field: CompletenessField): string {
  return LABELS[field];
}
